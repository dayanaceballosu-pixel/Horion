import { useEffect, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { hasPasswordProvider, useAuthStore } from '@/data/auth'
import { useDoc } from '@shared/hooks/useFirestore'
import { useIsDesktop } from '@shared/hooks/useMediaQuery'
import { settingsRef } from '@/data/repositories/settings'
import type { Settings } from '@/data/types'
import { ThemeProvider } from '@shared/theme/ThemeProvider'
import { useThemeSync } from '@shared/theme/useTheme'
import { InstallPrompt } from '@shared/components/InstallPrompt'
import { MobileShell } from './MobileShell'
import { DesktopShell } from './DesktopShell'
import { TabBar } from './TabBar'
import { LoginScreen } from '@modules/auth/LoginScreen'
import { PasswordSetupScreen } from '@modules/auth/PasswordSetupScreen'
import { TutorialOverlay } from '@modules/tutorial/TutorialOverlay'
import { useTutorialStore } from '@modules/tutorial/useTutorial'

import { HomeScreen } from '@modules/home/HomeScreen'
import { FinanzasScreen } from '@modules/finanzas/FinanzasScreen'
import { BilleteraDetalleScreen } from '@modules/finanzas/BilleteraDetalleScreen'
import { CuentasScreen } from '@modules/finanzas/CuentasScreen'
import { CuentaDetalleScreen } from '@modules/finanzas/CuentaDetalleScreen'
import { ConvertirScreen } from '@modules/finanzas/ConvertirScreen'
import { EstadisticasScreen } from '@modules/finanzas/EstadisticasScreen'
import { DeudasScreen } from '@modules/deudas/DeudasScreen'
import { ViajesScreen } from '@modules/viajes/ViajesScreen'
import { ViajeDetalleScreen } from '@modules/viajes/ViajeDetalleScreen'
import { InventarioScreen } from '@modules/inventario/InventarioScreen'
import { PortafolioScreen } from '@modules/portafolio/PortafolioScreen'
import { BienestarScreen } from '@modules/bienestar/BienestarScreen'
import { PerfilScreen } from '@modules/perfil/PerfilScreen'
import { OnboardingScreen } from '@modules/onboarding/OnboardingScreen'

export function App() {
  return (
    <ThemeProvider>
      <Gate />
    </ThemeProvider>
  )
}

function Gate() {
  const user = useAuthStore((s) => s.user)
  const loadingAuth = useAuthStore((s) => s.loading)

  if (loadingAuth) return <Splash label="Cargando…" />
  if (!user) return <LoginScreen />
  return <AuthedApp />
}

function AuthedApp() {
  const settings = useDoc<Settings>(() => settingsRef(), [])
  const user = useAuthStore((s) => s.user)
  const [, navigate] = useLocation()
  const isDesktop = useIsDesktop()

  /* Local "the user pressed 'Más tarde'" flag, scoped per uid via
     localStorage so dismissal sticks across reloads on this device but
     doesn't leak across accounts. */
  const [pwdPromptDismissed, setPwdPromptDismissed] = useState(() =>
    user ? readPwdPromptDismissed(user.uid) : false,
  )

  /* Bridge palette/modePref between the Settings doc and the local theme
     store so the user's choice follows them across devices. */
  useThemeSync()

  /* Auto-start the first-run tutorial. The dock fires the next time the
     user lands on a routed screen with onboarding done and the tutorial flag
     unset. Settings can re-emit constantly (theme toggle, palette swap, etc.)
     so we explicitly skip when a tour is already in progress to avoid
     resetting it back to step 0. */
  const tutorialActive = useTutorialStore((s) => s.active)
  useEffect(() => {
    if (!settings) return
    if (!settings.onboardingCompleted) return
    if (settings.tutorialCompleted) return
    if (useTutorialStore.getState().active !== null) return
    /* Slight delay so the user lands on the home screen before the dock
       slides in — otherwise it competes with the splash transition. */
    const t = setTimeout(() => {
      if (useTutorialStore.getState().active === null) {
        useTutorialStore.getState().start()
      }
    }, 600)
    return () => clearTimeout(t)
  }, [settings])

  /* When the signed-in user changes, blow away any in-flight tour from the
     previous session so the new user starts clean. */
  const currentUid = user?.uid
  useEffect(() => {
    useTutorialStore.setState({ active: null })
  }, [currentUid])

  /* settings is undefined while the bootstrap doc is being created — show splash. */
  if (!settings) return <Splash label="Preparando tu Horión…" />
  if (!settings.onboardingCompleted) {
    return <OnboardingScreen onDone={() => navigate('/')} />
  }

  /* After onboarding: nudge the user to set a password if their account is
     Google-only. Required for the iOS PWA where Google's redirect dies.
     They can skip with "Más tarde" and configure it later from Perfil. */
  if (user && !hasPasswordProvider(user) && !pwdPromptDismissed) {
    return (
      <PasswordSetupScreen
        onDone={() => setPwdPromptDismissed(true)}
        onSkip={() => {
          writePwdPromptDismissed(user.uid)
          setPwdPromptDismissed(true)
        }}
      />
    )
  }

  const Shell = isDesktop ? DesktopShell : MobileShell
  const shellProps = isDesktop ? {} : { tabBar: <TabBar /> }

  return (
    <Shell {...shellProps}>
      <InstallPrompt />
      {tutorialActive !== null && <TutorialOverlay />}
      <Switch>
        <Route path="/" component={HomeScreen} />
        <Route path="/finanzas" component={FinanzasScreen} />
        <Route path="/cuentas" component={CuentasScreen} />
        <Route path="/cuenta/:id" component={CuentaDetalleScreen} />
        <Route path="/billetera/:id" component={BilleteraDetalleScreen} />
        <Route path="/convertir" component={ConvertirScreen} />
        <Route path="/estadisticas" component={EstadisticasScreen} />
        <Route path="/deudas" component={DeudasScreen} />
        <Route path="/viajes" component={ViajesScreen} />
        <Route path="/viaje/:id" component={ViajeDetalleScreen} />
        <Route path="/inventario" component={InventarioScreen} />
        <Route path="/portafolio" component={PortafolioScreen} />
        <Route path="/bienestar" component={BienestarScreen} />
        <Route path="/perfil" component={PerfilScreen} />
        <Route>
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--ink)' }}>
              Aquí no hay nada.
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                marginTop: 18,
                padding: '10px 18px',
                borderRadius: 99,
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Ir al inicio
            </button>
          </div>
        </Route>
      </Switch>
    </Shell>
  )
}

function pwdPromptKey(uid: string): string {
  return `horion:pwd-prompt-dismissed:${uid}`
}

function readPwdPromptDismissed(uid: string): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(pwdPromptKey(uid)) === '1'
}

function writePwdPromptDismissed(uid: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(pwdPromptKey(uid), '1')
}

function Splash({ label }: { label: string }) {
  return (
    <div className="horion-desktop-bg">
      <div
        className="horion-mobile-column"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 18,
          color: 'var(--ink-mute)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        <img
          src="/icons/horion-logo.png"
          alt="Horión"
          style={{ width: 96, height: 96, borderRadius: 24, objectFit: 'contain' }}
        />
        {label}
      </div>
    </div>
  )
}
