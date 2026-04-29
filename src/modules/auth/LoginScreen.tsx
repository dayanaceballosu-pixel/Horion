import { useState } from 'react'
import { useIsDesktop } from '@shared/hooks/useMediaQuery'
import { signInWithGoogle } from '@/data/auth'

export function LoginScreen() {
  const isDesktop = useIsDesktop()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogle = async () => {
    setError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(prettyError(e))
      setBusy(false)
    }
  }

  if (isDesktop) {
    return <DesktopLogin busy={busy} error={error} onGoogle={handleGoogle} />
  }
  return <MobileLogin busy={busy} error={error} onGoogle={handleGoogle} />
}

interface ViewProps {
  busy: boolean
  error: string | null
  onGoogle: () => void
}

function DesktopLogin({ busy, error, onGoogle }: ViewProps) {
  return (
    <div className="horion-login-desktop">
      {/* Left — editorial hero */}
      <div className="horion-login-hero">
        <div className="horion-login-hero-glow" />
        <div className="horion-login-hero-content">
          <img
            src="/icons/horion-logo.png"
            alt="Horión"
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              objectFit: 'contain',
              filter: 'drop-shadow(0 24px 48px rgba(0, 0, 0, 0.5))',
            }}
          />
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 34,
              letterSpacing: 4,
              marginTop: 28,
              color: '#FFFFFF',
            }}
          >
            HORIÓN
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: 3,
              color: 'rgba(255,255,255,0.65)',
              marginTop: 8,
              textTransform: 'uppercase',
            }}
          >
            Tu visión · Tu ruta · Tu legado
          </div>
          <div
            style={{
              marginTop: 64,
              maxWidth: 420,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 28,
              lineHeight: 1.25,
              color: '#FFFFFF',
              letterSpacing: -0.4,
            }}
          >
            Tu cuartel de mando — finanzas, tours, material, portafolio y bienestar en un solo lugar.
          </div>
        </div>
      </div>

      {/* Right — auth panel */}
      <div className="horion-login-panel">
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--accent)',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Bienvenida
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 38,
              color: 'var(--ink)',
              lineHeight: 1.05,
              letterSpacing: -1,
              marginTop: 12,
              marginBottom: 16,
            }}
          >
            Entrá a tu Horión.
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              color: 'var(--ink-mute)',
              lineHeight: 1.6,
              marginBottom: 36,
            }}
          >
            Tus datos viajan encriptados a tu cuenta privada. Se sincronizan en iPhone, iPad y este navegador automáticamente.
          </div>

          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 99,
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              boxShadow: '0 12px 32px rgba(10, 2, 4, 0.20)',
              opacity: busy ? 0.7 : 1,
              transition: 'transform 120ms',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = '')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
          >
            <GoogleG />
            {busy ? 'Conectando…' : 'Continuar con Google'}
          </button>

          {error && (
            <div
              style={{
                marginTop: 14,
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--accent)',
                padding: 12,
                borderRadius: 12,
                background: 'var(--accent-pale)',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              marginTop: 28,
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ink-faint)',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Encriptación de extremo a extremo · Funciona offline
          </div>
        </div>
      </div>
    </div>
  )
}

function MobileLogin({ busy, error, onGoogle }: ViewProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 28px calc(32px + env(safe-area-inset-bottom))',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 220,
            aspectRatio: '1 / 1',
            filter: 'drop-shadow(0 18px 40px rgba(232, 119, 154, 0.30))',
          }}
        >
          <img
            src="/icons/horion-logo.png"
            alt="Horión"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 32 }}
          />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--accent)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 28,
          }}
        >
          Bienvenida
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 30,
            color: 'var(--ink)',
            lineHeight: 1.05,
            letterSpacing: -0.8,
            marginTop: 10,
            maxWidth: 320,
          }}
        >
          Tu visión, tu ruta, tu legado.
        </div>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--ink-mute)',
            lineHeight: 1.55,
            marginTop: 14,
            maxWidth: 320,
          }}
        >
          Tus datos se sincronizan de forma privada en todos tus dispositivos. Solo vos accedés.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
        <button
          type="button"
          onClick={onGoogle}
          disabled={busy}
          style={{
            height: 56,
            borderRadius: 99,
            background: 'var(--ink)',
            color: 'var(--bg)',
            border: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: 15,
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            opacity: busy ? 0.7 : 1,
            boxShadow: '0 8px 24px rgba(10, 2, 4, 0.18)',
          }}
        >
          <GoogleG />
          {busy ? 'Conectando…' : 'Continuar con Google'}
        </button>

        {error && (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--accent)',
              padding: 12,
              borderRadius: 12,
              background: 'var(--accent-pale)',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--ink-faint)',
            textAlign: 'center',
            letterSpacing: 1.4,
            marginTop: 8,
            textTransform: 'uppercase',
          }}
        >
          Encriptación de extremo a extremo · Funciona offline
        </div>
      </div>
    </div>
  )
}

function GoogleG() {
  return (
    <svg width={20} height={20} viewBox="0 0 18 18" style={{ background: '#FFF', borderRadius: 99, padding: 2 }}>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.86 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.9-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 009 18z"
      />
      <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 013.68 9c0-.59.1-1.17.29-1.71V4.96H.95A9 9 0 000 9c0 1.45.35 2.83.95 4.04l3.02-2.33z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35L15 2.34A9 9 0 009 0 9 9 0 00.95 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

function prettyError(e: unknown): string {
  if (typeof e === 'object' && e && 'code' in e) {
    const code = (e as { code: string }).code
    const map: Record<string, string> = {
      'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de elegir cuenta',
      'auth/popup-blocked': 'Tu navegador bloqueó la ventana — permitilas e intentá otra vez',
      'auth/network-request-failed': 'Sin conexión — la app sigue funcionando offline',
      'auth/cancelled-popup-request': 'Otra ventana ya estaba abierta',
      'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase',
    }
    return map[code] ?? `Error: ${code}`
  }
  return e instanceof Error ? e.message : 'Algo salió mal — intentá de nuevo'
}
