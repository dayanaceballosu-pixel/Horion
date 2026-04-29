import { useLocation } from 'wouter'
import { Icon, type IconName } from '@shared/icons/Icon'

interface Tab {
  to: string
  label: string
  icon: IconName
  /** Active when current path starts with one of these */
  match: string[]
}

const TABS: Tab[] = [
  { to: '/', label: 'Inicio', icon: 'home', match: ['/'] },
  { to: '/finanzas', label: 'Finanzas', icon: 'wallet', match: ['/finanzas', '/billetera', '/deudas', '/convertir'] },
  { to: '/estadisticas', label: 'Stats', icon: 'bar-chart', match: ['/estadisticas'] },
  { to: '/viajes', label: 'Viajes', icon: 'plane', match: ['/viajes', '/viaje'] },
  { to: '/inventario', label: 'Material', icon: 'box', match: ['/inventario'] },
  { to: '/perfil', label: 'Yo', icon: 'user', match: ['/perfil', '/portafolio', '/bienestar'] },
]

export function TabBar() {
  const [location, setLocation] = useLocation()

  const isActive = (tab: Tab): boolean => {
    if (tab.to === '/') return location === '/'
    return tab.match.some((m) => location === m || location.startsWith(`${m}/`))
  }

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 8px calc(8px + env(safe-area-inset-bottom))',
          margin: '0 12px 12px',
          background: 'var(--bg-card)',
          borderRadius: 999,
          border: '0.5px solid var(--hairline)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          backdropFilter: 'blur(20px)',
          maxWidth: 460,
          width: '100%',
        }}
      >
        {TABS.map((tab) => {
          const active = isActive(tab)
          return (
            <button
              key={tab.to}
              type="button"
              onClick={() => setLocation(tab.to)}
              style={{
                flex: 1,
                height: 50,
                borderRadius: 999,
                border: 'none',
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--bg)' : 'var(--ink-mute)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                transition: 'background 200ms ease',
              }}
            >
              <Icon name={tab.icon} size={18} color={active ? 'var(--bg)' : 'var(--ink-mute)'} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
