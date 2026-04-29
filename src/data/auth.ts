import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth'
import { getDoc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { create } from 'zustand'
import { auth, clean, db, userDoc, userSubDoc } from './firebase'
import type { Settings } from './types'
import { runMigrations } from './migrations'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
}))

/* Subscribe globally — fires once on init, then on every login/logout. */
onAuthStateChanged(auth, (u) => {
  useAuthStore.getState().setUser(u)
  if (u) {
    void ensureUserBootstrap(u).then(() => runMigrations(u.uid).catch(() => undefined))
  }
})

/* When mobile devices come back from a `signInWithRedirect`, we need to drain
   the result so Firebase finalises the session. The user surface lands in
   `onAuthStateChanged` either way; this just surfaces redirect-time errors
   (popup blocked equivalents, account selection cancelled, etc). */
void getRedirectResult(auth).catch(() => undefined)

/* Safety net: if Firebase Auth never reports a state (e.g. an iOS PWA where
   a redirect was hijacked by Safari and we're sitting on a stale "loading"
   flag), unstick the splash after 4 seconds so the user can at least see the
   login screen and try again. Re-checks `onAuthStateChanged` already settled
   the store, in which case this is a no-op. */
setTimeout(() => {
  if (useAuthStore.getState().loading) {
    useAuthStore.setState({ loading: false })
  }
}, 4000)

/**
 * On first sign-in we seed the user's Firestore namespace with sensible defaults
 * AND with the data the client confirmed in her questionnaire (4 wallets,
 * goal "Máquina", cycle from Apr 6, daily tasks + gym, trip skeleton Polonia,
 * starter inventory). All of this is editable
 * after the fact — onboarding lets her tune name/city/currency.
 */
async function ensureUserBootstrap(user: User): Promise<void> {
  const uRef = userDoc(user.uid)
  const snap = await getDoc(uRef)
  if (snap.exists()) return /* already bootstrapped */

  const now = Date.now()

  /* ── 1) User root ── */
  await setDoc(
    uRef,
    clean({
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    })
  )

  /* ── 2) Settings (per client: COP default, no GBP, push on, reminder 6 AM) ── */
  const initialSettings: Settings = {
    id: 'main',
    userName: user.displayName ?? '',
    userCity: '',
    defaultCurrency: 'COP',
    enabledCurrencies: ['COP', 'EUR', 'USD', 'PLN'],
    displayCurrency: 'COP',
    palette: 'horion',
    modePref: 'auto',
    pinScope: 'app',          /* "solo después de unos minutos sin uso" */
    notificationsEnabled: true,
    reminderHour: 6,
    installedAt: now,
    onboardingCompleted: false,
  }
  await setDoc(userSubDoc(user.uid, 'settings', 'main'), clean(initialSettings))

  /* ── 3) Seed batch (atomic) ── */
  const batch = writeBatch(db)

  /* 3a) Wallets — 4 per client */
  const walletDefs = [
    { id: 'w_nomina', name: 'Nómina', sub: 'Trabajo principal', tone: 'pinkSoft' },
    { id: 'w_tattoo', name: 'Tattoo', sub: 'Citas + ventas', tone: 'pink' },
    { id: 'w_freelance', name: 'Freelance', sub: 'Modelaje', tone: 'ink' },
    { id: 'w_estetica', name: 'Estética', sub: 'Servicios estéticos', tone: 'pinkDark' },
  ] as const
  walletDefs.forEach((w, i) => {
    batch.set(userSubDoc(user.uid, 'wallets', w.id), {
      id: w.id,
      name: w.name,
      sub: w.sub,
      tone: w.tone,
      createdAt: now + i,
    })
  })

  /* 3b) Initial goal — Máquina, 1.000.000 COP, due 28 may */
  batch.set(userSubDoc(user.uid, 'goals', 'g_maquina'), {
    id: 'g_maquina',
    name: 'Máquina',
    target: 1_000_000,
    saved: 0,
    currency: 'COP',
    due: '2026-05-28',
    createdAt: now,
  })

  /* 3c) Cycle — last period 6 abril, periodLength 4 */
  batch.set(userSubDoc(user.uid, 'cycle', 'c_apr2026'), {
    id: 'c_apr2026',
    startDate: '2026-04-06',
    periodLength: 4,
    createdAt: now,
  })

  /* 3d) Daily tasks — design defaults + ir al gym */
  const tasks = [
    { id: 't_polaco', text: 'Estudiar polaco — 30 min', cat: 'Idioma' },
    { id: 't_ingles', text: 'Estudiar inglés — Duolingo', cat: 'Idioma' },
    { id: 't_desinfectar', text: 'Desinfectar equipo de trabajo', cat: 'Tattoo' },
    { id: 't_reel', text: 'Subir reel a Instagram', cat: 'Redes' },
    { id: 't_dms', text: 'Responder DMs pendientes', cat: 'Redes' },
    { id: 't_pedidos', text: 'Pedido de tintas / agujas (revisar)', cat: 'Tattoo' },
    { id: 't_gym', text: 'Ir al gym', cat: 'Bienestar' },
  ]
  tasks.forEach((t, idx) => {
    batch.set(userSubDoc(user.uid, 'tasks', t.id), {
      id: t.id,
      text: t.text,
      category: t.cat,
      recurrence: 'daily',
      active: true,
      order: idx,
      createdAt: now + idx,
    })
  })

  /* 3e) Inventory starter (from design as starting point per client) */
  const inv = [
    { id: 'i_rl03', name: 'Agujas RL 03', stock: 12, min: 20, unit: 'cajas', cat: 'Agujas' },
    { id: 'i_rl05', name: 'Agujas RL 05', stock: 24, min: 15, unit: 'cajas', cat: 'Agujas' },
    { id: 'i_mag09', name: 'Agujas Magnum 09', stock: 4, min: 10, unit: 'cajas', cat: 'Agujas' },
    { id: 'i_etbk', name: 'Tinta Eternal Negro', stock: 3, min: 4, unit: 'frascos', cat: 'Tinta' },
    { id: 'i_grey', name: 'Tinta gris medio', stock: 6, min: 3, unit: 'frascos', cat: 'Tinta' },
    { id: 'i_glov', name: 'Guantes Nitrilo M', stock: 180, min: 100, unit: 'unid', cat: 'Higiene' },
    { id: 'i_hect', name: 'Papel hectográfico', stock: 14, min: 30, unit: 'hojas', cat: 'Papel' },
    { id: 'i_vasl', name: 'Vaselina', stock: 2, min: 2, unit: 'tubos', cat: 'Higiene' },
  ]
  inv.forEach((it, idx) => {
    batch.set(userSubDoc(user.uid, 'inventory', it.id), {
      id: it.id,
      name: it.name,
      stock: it.stock,
      min: it.min,
      unit: it.unit,
      category: it.cat,
      createdAt: now + idx,
    })
  })

  /* 3f) Trip skeleton — Polonia, planning */
  batch.set(userSubDoc(user.uid, 'trips', 'tr_polonia'), {
    id: 'tr_polonia',
    city: 'Polonia',
    country: 'Polonia',
    flag: '🇵🇱',
    when: '3 meses · pendiente',
    status: 'planning',
    cost: { flight: 0, stay: 0, food: 0, transport: 0, materials: 0, other: 0 },
    currency: 'COP',
    avgPrice: 100_000, /* placeholder — la clienta confirma cifra exacta */
    target: 0,
    sold: 0,
    createdAt: now,
  })

  await batch.commit()
}

/* ─────────── Auth actions ─────────── */

/** Mobile browsers — especially iOS Safari with storage partitioning — choke
 *  on popup-based OAuth, so we hand them off to the redirect flow instead. */
function shouldUseRedirect(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
  const isPwa =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return isMobile || isPwa
}

export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider()
  if (shouldUseRedirect()) {
    /* Page navigates to Google here. Auth state is restored on return via
       onAuthStateChanged + getRedirectResult at module load. */
    await signInWithRedirect(auth, provider)
    return null
  }
  const result = await signInWithPopup(auth, provider)
  return result.user
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function signOutCurrent(): Promise<void> {
  await signOut(auth)
}

/** True if the signed-in user already has an email/password credential
 *  attached. Used to decide whether to show the "set a password" prompt
 *  after a fresh Google sign-in. */
export function hasPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === 'password')
}

/** Adds an email/password credential to the currently signed-in account so
 *  the user can also log in with email + password (e.g. inside an iOS PWA
 *  where Google's redirect flow is blocked). The email comes from the
 *  existing identity (Google) — the user only chooses a password. */
export async function linkPasswordToCurrentUser(password: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('No hay sesión activa')
  if (!user.email) throw new Error('Tu cuenta no tiene email asociado')
  const credential = EmailAuthProvider.credential(user.email, password)
  await linkWithCredential(user, credential)
}

/** Replaces the password on the currently signed-in user. Firebase requires
 *  a recent sign-in for this; we surface the error so the UI can ask the
 *  user to re-authenticate. */
export async function updateCurrentPassword(newPassword: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('No hay sesión activa')
  await updatePassword(user, newPassword)
}

export function requireUid(): string {
  const u = useAuthStore.getState().user
  if (!u) throw new Error('No hay sesión activa')
  return u.uid
}
