import { useLocation } from 'wouter'
import { Icon, type IconName } from '@shared/icons/Icon'
import { signOutCurrent, useAuthStore } from '@/data/auth'

interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Active when current path starts with one of these prefixes */
  match: string[]
}

const NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'home', match: ['/'] },
  { to: '/finanzas', label: 'Finanzas', icon: 'wallet', match: ['/finanzas', '/billetera'] },
  { to: '/estadisticas', label: 'Estadísticas', icon: 'bar-chart', match: ['/estadisticas'] },
  { to: '/convertir', label: 'Convertir', icon: 'globe', match: ['/convertir'] },
  { to: '/deudas', label: 'Deudas', icon: 'arrow-up', match: ['/deudas'] },
  { to: '/viajes', label: 'Viajes', icon: 'plane', match: ['/viajes', '/viaje'] },
  { to: '/inventario', label: 'Inventario', icon: 'box', match: ['/inventario'] },
  { to: '/portafolio', label: 'Portafolio', icon: 'image', match: ['/portafolio'] },
  { to: '/bienestar', label: 'Bienestar', icon: 'heart', match: ['/bienestar'] },
]

export function Sidebar() {
  const [location, navigate] = useLocation()
  const user = useAuthStore((s) => s.user)

  const isActive = (it: NavItem): boolean => {
    if (it.to === '/') return location === '/'
    return it.match.some((m) => location === m || location.startsWith(`${m}/`))
  }

  return (
    <aside className="horion-sidebar">
      {/* Brand */}
      <div className="horion-sidebar-brand">
        <img
          src="/icons/horion-logo.png"
          alt="Horión"
          style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'contain', flexShrink: 0 }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 18,
              color: 'var(--ink)',
              letterSpacing: 1,
              lineHeight: 1,
            }}
          >
            HORIÓN
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ink-mute)',
              letterSpacing: 1.2,
              marginTop: 5,
              textTransform: 'uppercase',
            }}
          >
            Tu visión · Tu legado
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="horion-sidebar-nav">
        {NAV.map((it) => {
          const active = isActive(it)
          return (
            <button
              key={it.to}
              type="button"
              onClick={() => navigate(it.to)}
              className={`horion-nav-item ${active ? 'is-active' : ''}`}
            >
              <Icon name={it.icon} size={18} color={active ? 'var(--on-accent)' : 'var(--ink)'} />
              <span>{it.label}</span>
            </button>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Profile + sign-out */}
      <div className="horion-sidebar-profile">
        <button
          type="button"
          onClick={() => navigate('/perfil')}
          className={`horion-nav-item ${location === '/perfil' ? 'is-active' : ''}`}
          style={{ width: '100%' }}
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'Yo'}
              style={{ width: 22, height: 22, borderRadius: 99 }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <Icon name="user" size={18} color={location === '/perfil' ? 'var(--on-accent)' : 'var(--ink)'} />
          )}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.displayName?.split(' ')[0] ?? 'Mi perfil'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('¿Cerrar sesión? Tus datos quedan sincronizados en la nube.')) signOutCurrent()
          }}
          className="horion-signout"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <Icon name="arrow-right" size={16} color="var(--ink-mute)" />
        </button>
      </div>
    </aside>
  )
}
