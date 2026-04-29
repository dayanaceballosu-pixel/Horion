import { type ReactNode } from 'react'
import { useOnline } from '@shared/hooks/useOnline'
import { Icon } from '@shared/icons/Icon'
import { Sidebar } from './Sidebar'

/**
 * Desktop layout: sidebar on the left, wide main canvas on the right.
 * Active for viewports ≥ 1024px (handled by App.tsx).
 */
export function DesktopShell({ children }: { children: ReactNode }) {
  const online = useOnline()

  return (
    <div className="horion-desktop-layout">
      <Sidebar />
      <div className="horion-desktop-main">
        {!online && (
          <div className="horion-offline-pill">
            <Icon name="wifi-off" size={12} color="var(--bg)" stroke={2} />
            Modo offline · todo se guarda local
          </div>
        )}
        <div className="horion-desktop-canvas">{children}</div>
      </div>
    </div>
  )
}
