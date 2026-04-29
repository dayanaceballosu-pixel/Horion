import { Route, Switch, useLocation } from 'wouter'
import { useAuthStore } from '@/data/auth'
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

import { HomeScreen } from '@modules/home/HomeScreen'
import { FinanzasScreen } from '@modules/finanzas/FinanzasScreen'
import { BilleteraDetalleScreen } from '@modules/finanzas/BilleteraDetalleScreen'
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
  const [, navigate] = useLocation()
  const isDesktop = useIsDesktop()

  /* Bridge palette/modePref between the Settings doc and the local theme
     store so the user's choice follows them across devices. */
  useThemeSync()

  /* settings is undefined while the bootstrap doc is being created — show splash. */
  if (!settings) return <Splash label="Preparando tu Horión…" />
  if (!settings.onboardingCompleted) {
    return <OnboardingScreen onDone={() => navigate('/')} />
  }

  const Shell = isDesktop ? DesktopShell : MobileShell
  const shellProps = isDesktop ? {} : { tabBar: <TabBar /> }

  return (
    <Shell {...shellProps}>
      <InstallPrompt />
      <Switch>
        <Route path="/" component={HomeScreen} />
        <Route path="/finanzas" component={FinanzasScreen} />
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
