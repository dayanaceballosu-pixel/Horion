import { useEffect, type ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { useIsDesktop } from '../hooks/useMediaQuery'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const panelStyle: React.CSSProperties = isDesktop
    ? {
        width: '100%',
        maxWidth: 520,
        background: 'var(--bg-elev)',
        color: 'var(--ink)',
        borderRadius: 24,
        padding: '24px 28px',
        maxHeight: '88vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px -16px rgba(0,0,0,0.55), 0 0 0 1px var(--border-soft, rgba(255,255,255,0.06))',
        animation: 'horion-pop 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }
    : {
        width: '100%',
        maxWidth: 480,
        background: 'var(--bg-elev)',
        color: 'var(--ink)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'horion-slide-up 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: isDesktop ? 'center' : 'flex-end',
        justifyContent: 'center',
        padding: isDesktop ? 24 : 0,
        zIndex: 100,
        animation: 'horion-fade 200ms ease',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 24,
              color: 'var(--ink)',
              letterSpacing: -0.5,
            }}
          >
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 36,
              height: 36,
              borderRadius: 99,
              background: 'var(--bg-inset)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x" size={16} color="var(--ink)" />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div style={{ marginTop: 18 }}>{footer}</div>}
        <style>{`
          @keyframes horion-fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes horion-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
          @keyframes horion-pop { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
        `}</style>
      </div>
    </div>
  )
}
