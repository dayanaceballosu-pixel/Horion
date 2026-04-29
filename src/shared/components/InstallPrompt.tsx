import { useEffect, useState } from 'react'
import './InstallPrompt.css'

/** The browser type for the deferred install prompt event. Not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

/** iOS Safari adds `standalone` to navigator. Not part of the standard type. */
interface IosNavigator extends Navigator {
  standalone?: boolean
}

const DISMISS_KEY = 'horion:pwa-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showAndroid, setShowAndroid] = useState(false)
  const [showIos, setShowIos] = useState(false)

  useEffect(() => {
    /* Already installed (running as PWA)? Don't bother. */
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as IosNavigator).standalone === true
    if (isStandalone) return

    /* User dismissed it earlier in this session — respect their choice. */
    if (sessionStorage.getItem(DISMISS_KEY)) return

    const ua = navigator.userAgent
    const isIos = /ipad|iphone|ipod/i.test(ua)
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)

    /* iOS Safari has no programmatic install — show instructions after a beat. */
    if (isIos && isSafari) {
      const timer = setTimeout(() => setShowIos(true), 3000)
      return () => clearTimeout(timer)
    }

    /* Android Chrome / Edge / Samsung — capture the prompt event. */
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowAndroid(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    void deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowAndroid(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowAndroid(false)
    setShowIos(false)
    sessionStorage.setItem(DISMISS_KEY, '1')
  }

  if (showAndroid) {
    return (
      <div className="horion-install-overlay" role="dialog" aria-modal="true" aria-label="Instalar Horión">
        <div className="horion-install-card">
          <img src="/icons/horion-logo.png" alt="Horión" className="horion-install-logo" />
          <div className="horion-install-title">Instala Horión</div>
          <div className="horion-install-desc">
            Agrega Horión a tu pantalla de inicio para entrar en un toque, sin barra de navegador.
          </div>
          <button type="button" className="horion-install-btn-primary" onClick={handleInstall}>
            Instalar
          </button>
          <button type="button" className="horion-install-btn-secondary" onClick={handleDismiss}>
            Ahora no
          </button>
        </div>
      </div>
    )
  }

  if (showIos) {
    return (
      <div className="horion-install-overlay" role="dialog" aria-modal="true" aria-label="Instalar Horión en iOS">
        <div className="horion-install-card">
          <img src="/icons/horion-logo.png" alt="Horión" className="horion-install-logo" />
          <div className="horion-install-title">Instala Horión</div>
          <div className="horion-install-desc">Sigue estos pasos en Safari:</div>
          <ol className="horion-install-steps">
            <li className="horion-install-step">
              <span className="horion-step-num">1</span>
              <span className="horion-step-text">
                Toca el ícono <strong>Compartir</strong>{' '}
                <span className="horion-step-icon">⎙</span> en la barra inferior de Safari.
              </span>
            </li>
            <li className="horion-install-step">
              <span className="horion-step-num">2</span>
              <span className="horion-step-text">
                Desplázate y toca <strong>«Añadir a pantalla de inicio»</strong>{' '}
                <span className="horion-step-icon">＋</span>.
              </span>
            </li>
            <li className="horion-install-step">
              <span className="horion-step-num">3</span>
              <span className="horion-step-text">
                Toca <strong>«Añadir»</strong> para confirmar.
              </span>
            </li>
          </ol>
          <button type="button" className="horion-install-btn-secondary" onClick={handleDismiss}>
            Entendido
          </button>
        </div>
      </div>
    )
  }

  return null
}
