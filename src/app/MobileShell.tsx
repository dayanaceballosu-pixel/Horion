import { type ReactNode } from 'react'
import { useOnline } from '@shared/hooks/useOnline'
import { Icon } from '@shared/icons/Icon'

/**
 * Adaptive frame used by every top-level screen (Login, Onboarding, AppShell).
 *
 * - Mobile (<768px): the column fills the viewport edge-to-edge — pure mobile UX.
 * - Desktop (≥768px): the column becomes a centered "phone canvas" with rounded
 *   corners, soft border, drop shadow, and a warm decorative background fills
 *   the surrounding space so it never looks orphaned.
 *
 * `tabBar` is rendered inside the column at the bottom — it stays visible while
 * the main content scrolls. On desktop it sits at the bottom of the centered
 * column rather than the viewport edge.
 */
export function MobileShell({
  children,
  tabBar,
  showOfflineBanner = true,
}: {
  children: ReactNode
  tabBar?: ReactNode
  showOfflineBanner?: boolean
}) {
  const online = useOnline()

  return (
    <div className="horion-desktop-bg">
      <div className="horion-mobile-column">
        {showOfflineBanner && !online && (
          <div className="horion-offline-banner">
            <Icon name="wifi-off" size={12} color="var(--bg)" stroke={2} />
            Modo offline · todo se guarda local
          </div>
        )}
        <main className="horion-main safe-top">{children}</main>
        {tabBar && <div className="horion-tabbar-slot">{tabBar}</div>}
      </div>
    </div>
  )
}
