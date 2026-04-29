import { useState } from 'react'
import { linkPasswordToCurrentUser, useAuthStore } from '@/data/auth'

interface Props {
  onDone: () => void
  onSkip: () => void
}

/**
 * Shown right after a fresh Google sign-in when the account has no
 * email/password credential yet. Links a new password to the SAME account
 * (no second user is created) so the user can also log in with email +
 * password — necessary inside iOS PWAs where Google's redirect is broken.
 */
export function PasswordSetupScreen({ onDone, onSkip }: Props) {
  const user = useAuthStore((s) => s.user)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    try {
      await linkPasswordToCurrentUser(password)
      onDone()
    } catch (e) {
      setError(prettyLinkError(e))
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 24px calc(28px + env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 420, width: '100%', margin: '0 auto' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--accent)',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Último paso
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 32,
            color: 'var(--ink)',
            lineHeight: 1.05,
            letterSpacing: -0.8,
            marginTop: 10,
            marginBottom: 14,
          }}
        >
          Configura una contraseña.
        </div>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--ink-mute)',
            lineHeight: 1.55,
            marginBottom: 22,
          }}
        >
          Tu cuenta es <strong style={{ color: 'var(--ink)' }}>{user?.email ?? 'la de Google'}</strong>. Pónle una contraseña para poder
          entrar también desde la app instalada en el iPhone, donde Google no funciona.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PwField
            label="Nueva contraseña"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="mínimo 6 caracteres"
          />
          <PwField
            label="Repítela"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="igual que arriba"
          />

          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            style={{
              height: 50,
              borderRadius: 99,
              background: 'var(--accent)',
              color: '#FFFFFF',
              border: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
              marginTop: 6,
            }}
          >
            {busy ? 'Guardando…' : 'Guardar contraseña'}
          </button>

          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ink-mute)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              cursor: busy ? 'wait' : 'pointer',
              padding: 8,
              textAlign: 'center',
            }}
          >
            Más tarde
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

          <div
            style={{
              marginTop: 4,
              padding: 12,
              borderRadius: 12,
              background: 'var(--bg-card)',
              border: '0.5px solid var(--hairline)',
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: 'var(--ink-mute)',
              lineHeight: 1.5,
            }}
          >
            Si lo dejas para luego, puedes configurarla cualquier momento desde Perfil → Contraseña.
          </div>
        </div>
      </div>
    </div>
  )
}

function PwField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder?: string
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
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
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

function prettyLinkError(e: unknown): string {
  if (typeof e === 'object' && e && 'code' in e) {
    const code = (e as { code: string }).code
    const map: Record<string, string> = {
      'auth/weak-password': 'La contraseña es muy débil. Usa al menos 6 caracteres.',
      'auth/email-already-in-use': 'Ya hay otra cuenta con este email.',
      'auth/credential-already-in-use': 'Esta contraseña ya pertenece a otra cuenta.',
      'auth/provider-already-linked': 'Tu cuenta ya tiene una contraseña configurada.',
      'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión con Google y reintenta.',
      'auth/network-request-failed': 'Sin conexión — vuelve a intentarlo.',
    }
    return map[code] ?? `Error: ${code}`
  }
  return e instanceof Error ? e.message : 'Algo salió mal — intenta de nuevo'
}
