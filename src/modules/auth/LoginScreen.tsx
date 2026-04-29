import { useState } from 'react'
import { useIsDesktop, useIsIosPwa } from '@shared/hooks/useMediaQuery'
import { resetPassword, signInWithEmail, signInWithGoogle } from '@/data/auth'

export function LoginScreen() {
  const isDesktop = useIsDesktop()
  const isIosPwa = useIsIosPwa()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [info, setInfo] = useState<string | null>(null)

  const handleGoogle = async () => {
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(prettyError(e))
      setBusy(false)
    }
  }

  const handleEmail = async () => {
    setError(null)
    setInfo(null)
    if (!email.trim() || !password) {
      setError('Pon email y contraseña.')
      return
    }
    setBusy(true)
    try {
      await signInWithEmail(email.trim(), password)
    } catch (e) {
      setError(prettyError(e))
      setBusy(false)
    }
  }

  const handleReset = async () => {
    setError(null)
    setInfo(null)
    if (!email.trim()) {
      setError('Pon tu email arriba para enviarte el enlace.')
      return
    }
    setBusy(true)
    try {
      await resetPassword(email.trim())
      setInfo('Te enviamos un email para restablecer tu contraseña.')
    } catch (e) {
      setError(prettyError(e))
    } finally {
      setBusy(false)
    }
  }

  const sharedFormProps = {
    busy,
    error,
    info,
    email,
    password,
    setEmail,
    setPassword,
    onGoogle: handleGoogle,
    onEmail: handleEmail,
    onReset: handleReset,
    iosPwa: isIosPwa,
  }

  if (isDesktop) {
    return <DesktopLogin {...sharedFormProps} />
  }
  return <MobileLogin {...sharedFormProps} />
}

interface ViewProps {
  busy: boolean
  error: string | null
  info: string | null
  email: string
  password: string
  setEmail: (v: string) => void
  setPassword: (v: string) => void
  onGoogle: () => void
  onEmail: () => void
  onReset: () => void
  iosPwa: boolean
}

function DesktopLogin(props: ViewProps) {
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
              marginBottom: 28,
            }}
          >
            Tus datos viajan encriptados a tu cuenta privada. Se sincronizan en iPhone, iPad y este navegador automáticamente.
          </div>

          <AuthForm {...props} />

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

function MobileLogin(props: ViewProps) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 24px calc(28px + env(safe-area-inset-bottom))',
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
          paddingBottom: 16,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 160,
            aspectRatio: '1 / 1',
            filter: 'drop-shadow(0 18px 40px rgba(232, 119, 154, 0.30))',
          }}
        >
          <img
            src="/icons/horion-logo.png"
            alt="Horión"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 28 }}
          />
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--accent)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 22,
          }}
        >
          Bienvenida
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 26,
            color: 'var(--ink)',
            lineHeight: 1.05,
            letterSpacing: -0.6,
            marginTop: 8,
            maxWidth: 320,
          }}
        >
          Tu visión, tu ruta, tu legado.
        </div>
      </div>

      <AuthForm {...props} />

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--ink-faint)',
          textAlign: 'center',
          letterSpacing: 1.4,
          marginTop: 14,
          textTransform: 'uppercase',
        }}
      >
        Encriptación de extremo a extremo · Funciona offline
      </div>
    </div>
  )
}

/* ─────────── Reusable form (used in both desktop and mobile) ─────────── */

function AuthForm({
  busy,
  error,
  info,
  email,
  password,
  setEmail,
  setPassword,
  onGoogle,
  onEmail,
  onReset,
  iosPwa,
}: ViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {iosPwa && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 14,
            background: 'var(--bg-card)',
            border: '0.5px solid var(--hairline)',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--ink-mute)',
            lineHeight: 1.5,
          }}
        >
          💡 En la app instalada usa <strong style={{ color: 'var(--ink)' }}>email y contraseña</strong>. El botón de Google solo funciona desde Safari.
        </div>
      )}

      <button
        type="button"
        onClick={onGoogle}
        disabled={busy}
        style={{
          height: 52,
          borderRadius: 99,
          background: 'var(--ink)',
          color: 'var(--bg)',
          border: 'none',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: busy ? 0.7 : 1,
          boxShadow: '0 8px 24px rgba(10, 2, 4, 0.18)',
        }}
      >
        <GoogleG />
        {busy ? 'Conectando…' : 'Continuar con Google'}
      </button>

      <Divider label="o entra con tu contraseña" />

      <Field
        label="Email"
        value={email}
        onChange={setEmail}
        type="email"
        placeholder="tu@email.com"
        autoComplete="email"
      />
      <Field
        label="Contraseña"
        value={password}
        onChange={setPassword}
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
      />

      <button
        type="button"
        onClick={onEmail}
        disabled={busy}
        style={{
          height: 48,
          borderRadius: 99,
          background: 'var(--accent)',
          color: '#FFFFFF',
          border: 'none',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
          marginTop: 4,
        }}
      >
        Iniciar sesión
      </button>

      <button
        type="button"
        onClick={onReset}
        disabled={busy}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--ink-mute)',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          cursor: busy ? 'wait' : 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          textAlign: 'center',
          padding: 4,
        }}
      >
        ¿Olvidaste tu contraseña?
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
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}

      {info && (
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--ink)',
            padding: 12,
            borderRadius: 12,
            background: 'var(--bg-card)',
            border: '0.5px solid var(--hairline)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {info}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-mute)',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          height: 46,
          padding: '0 14px',
          borderRadius: 12,
          border: '0.5px solid var(--hairline)',
          background: 'var(--bg-card)',
          color: 'var(--ink)',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          outline: 'none',
        }}
      />
    </label>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '4px 0',
      }}
    >
      <span style={{ flex: 1, height: '0.5px', background: 'var(--hairline)' }} />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--ink-faint)',
          letterSpacing: 1,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1, height: '0.5px', background: 'var(--hairline)' }} />
    </div>
  )
}

function GoogleG() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" style={{ background: '#FFF', borderRadius: 99, padding: 2 }}>
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
      'auth/user-not-found':
        'No encontramos esta cuenta. Si la creaste con Google, primero inicia sesión con Google y configura una contraseña.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/invalid-credential':
        'Email o contraseña incorrectos. Si solo has entrado con Google, primero hazlo en Safari y configura una contraseña.',
      'auth/invalid-email': 'Ese email no parece válido.',
      'auth/too-many-requests': 'Demasiados intentos. Espera un momento e intenta de nuevo.',
      'auth/missing-password': 'Pon tu contraseña.',
    }
    return map[code] ?? `Error: ${code}`
  }
  return e instanceof Error ? e.message : 'Algo salió mal — intentá de nuevo'
}
