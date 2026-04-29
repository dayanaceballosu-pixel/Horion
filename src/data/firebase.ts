import { initializeApp, type FirebaseOptions } from 'firebase/app'
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  type Firestore,
} from 'firebase/firestore'
import { getAuth, browserLocalPersistence, setPersistence, type Auth } from 'firebase/auth'

/**
 * Use the current origin as the auth domain in production. Combined with the
 * Vercel rewrites that proxy `/__/auth/*` to the Firebase project, this keeps
 * the OAuth handshake same-origin and avoids iOS Safari's storage-partitioning
 * "missing initial state" error. In dev (localhost / 127.x), fall back to the
 * default Firebase auth domain since there are no rewrites locally.
 */
function resolveAuthDomain(): string {
  const fallback = import.meta.env.VITE_FB_AUTH_DOMAIN as string
  if (typeof window === 'undefined') return fallback
  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')
  return isLocal ? fallback : window.location.host
}

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
}

if (!firebaseConfig.apiKey) {
  throw new Error('Falta config de Firebase. Crea un .env.local con VITE_FB_* (ver .env.example).')
}

export const app = initializeApp(firebaseConfig)

/**
 * Firestore con caché local persistente (IndexedDB) habilitado y sincronización
 * entre múltiples pestañas. Esto hace que la app funcione 100% offline:
 * lecturas vienen del caché, escrituras se encolan y se sincronizan al volver.
 *
 * Wrapped in try/catch so Vite HMR (which re-runs this module) doesn't blow up
 * with "initializeFirestore has already been called" — we just reuse the
 * existing instance in that case.
 */
function makeDb(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch {
    return getFirestore(app)
  }
}
export const db: Firestore = makeDb()

export const auth: Auth = getAuth(app)
void setPersistence(auth, browserLocalPersistence) /* sesión persiste al cerrar el navegador */

/* ─────────── Path helpers ───────────
   Cada documento de dominio vive bajo users/{uid}/<collection>/<docId>.
   Estos helpers garantizan rutas consistentes. */

export function userDoc(uid: string) {
  return doc(db, 'users', uid)
}

export function userCol(uid: string, name: string) {
  return collection(db, 'users', uid, name)
}

export function userSubDoc(uid: string, name: string, id: string) {
  return doc(db, 'users', uid, name, id)
}

/**
 * Strip `undefined` values from an object before writing to Firestore.
 * Firestore rejects `undefined` (throws "Unsupported field value: undefined").
 * Optional fields in our domain types are encoded as "missing" (omitted),
 * not as null, so we drop the key entirely.
 *
 * Recurses into plain object values; arrays, Dates, and primitives pass through.
 */
export function clean<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Date) &&
      Object.getPrototypeOf(v) === Object.prototype
    ) {
      out[k] = clean(v as object)
    } else {
      out[k] = v
    }
  }
  return out as T
}
