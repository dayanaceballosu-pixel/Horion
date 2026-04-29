import { useState } from 'react'
import { useLocation } from 'wouter'
import { Card, ModuleHeading, Pill, PrimaryButton } from '@shared/components/primitives'
import { Modal } from '@shared/components/Modal'
import { TextField, SelectField } from '@shared/components/TextField'
import { Icon } from '@shared/icons/Icon'
import { HorionMark } from '@shared/icons/HorionMark'
import { useThemeStore } from '@shared/theme/useTheme'
import { PALETTES, type PaletteKey, type ThemeModePreference } from '@shared/theme/palettes'
import { useDoc } from '@shared/hooks/useFirestore'
import { settingsRef, updateSettings } from '@/data/repositories/settings'
import {
  hasPasswordProvider,
  linkPasswordToCurrentUser,
  signOutCurrent,
  updateCurrentPassword,
  useAuthStore,
} from '@/data/auth'
import { downloadBackup, exportBackup, importBackup, wipeAllData } from '@/data/backup'
import type { CurrencyCode, Settings } from '@/data/types'

const ALL_CURRENCIES: CurrencyCode[] = ['COP', 'EUR', 'USD', 'PLN']

export function PerfilScreen() {
  const [, navigate] = useLocation()
  const settings = useDoc<Settings>(() => settingsRef(), [])
  const palette = useThemeStore((s) => s.palette)
  const setPalette = useThemeStore((s) => s.setPalette)
  const modePref = useThemeStore((s) => s.modePref)
  const setMode = useThemeStore((s) => s.setMode)
  const user = useAuthStore((s) => s.user)

  if (!settings) return null

  return (
    <div>
      <ModuleHeading kicker="Perfil" title="Yo, Horión" subtitle="Tu cuenta, tu estilo, tu data." />

      {/* Profile card */}
      <div style={{ padding: '20px 20px 0' }}>
        <Card padding={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 99,
                background: 'var(--accent-pale)',
                border: '0.5px solid var(--hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HorionMark size={36} color="var(--accent)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 24, lineHeight: 1.1 }}>
                {settings.userName || 'Tu nombre'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--ink-mute)',
                  marginTop: 4,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {settings.userCity || 'Sin ciudad'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <BasicSection settings={settings} />
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <SectionLabel>Apariencia</SectionLabel>
        <Card padding={16}>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-mute)',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Modo
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--bg-inset)', borderRadius: 99 }}>
              {(['auto', 'dark', 'light'] as const).map((m: ThemeModePreference) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    height: 36,
                    borderRadius: 99,
                    border: 'none',
                    cursor: 'pointer',
                    background: modePref === m ? 'var(--bg-card)' : 'transparent',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {m === 'dark' ? 'Oscuro' : m === 'light' ? 'Claro' : 'Auto'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-mute)',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Paleta de rosa
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(Object.keys(PALETTES) as PaletteKey[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPalette(p)}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    background: 'var(--bg-inset)',
                    border: palette === p ? `2px solid ${PALETTES[p].pink}` : '0.5px solid var(--hairline)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 14px',
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 99, background: PALETTES[p].pink }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink)' }}>{PALETTES[p].name}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <SectionLabel>Cuenta</SectionLabel>
        <PasswordSection />
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <SectionLabel>Datos</SectionLabel>
        <Card padding={6}>
          <Row
            icon="download"
            title="Exportar backup"
            subtitle="Descarga un JSON con todo lo registrado"
            onClick={async () => {
              const b = await exportBackup()
              downloadBackup(b)
            }}
          />
          <Row
            icon="settings"
            title="Importar backup"
            subtitle="Reemplaza todos los datos por los del archivo"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'application/json'
              input.onchange = async () => {
                const f = input.files?.[0]
                if (!f) return
                if (!confirm('Esto reemplaza todos los datos actuales. ¿Continuar?')) return
                const text = await f.text()
                try {
                  await importBackup(JSON.parse(text))
                  alert('Backup importado correctamente')
                  window.location.reload()
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'Error al importar')
                }
              }
              input.click()
            }}
          />
          <Row
            icon="trash"
            title="Borrar todos los datos"
            subtitle="Reinicia la app desde cero"
            destructive
            onClick={async () => {
              if (!confirm('Esto borra TODO en la nube y en este dispositivo. ¿Estás segura?')) return
              if (!confirm('Última oportunidad. ¿Confirmar borrado total?')) return
              await wipeAllData()
              window.location.reload()
            }}
          />
        </Card>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <SectionLabel>Atajos</SectionLabel>
        <Card padding={6}>
          <Row icon="image" title="Portafolio" subtitle="Book del mes y export" onClick={() => navigate('/portafolio')} />
          <Row icon="heart" title="Bienestar" subtitle="Ciclo y daily checklist" onClick={() => navigate('/bienestar')} />
        </Card>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <SectionLabel>Sesión</SectionLabel>
        <Card padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-mute)',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Conectada como
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  color: 'var(--ink)',
                  marginTop: 4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email ?? 'Sin email'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Cerrar sesión? Tus datos quedan sincronizados en la nube.')) signOutCurrent()
              }}
              style={{
                height: 38,
                padding: '0 16px',
                borderRadius: 99,
                background: 'transparent',
                color: 'var(--accent)',
                border: '0.5px solid var(--accent)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </Card>
      </div>

      <div style={{ padding: '32px 20px 0', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-faint)',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Horión · v0.1
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--ink-faint)',
            letterSpacing: 1,
            marginTop: 4,
          }}
        >
          Tu visión · Tu ruta · Tu legado
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--accent)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        padding: '0 4px 8px',
      }}
    >
      {children}
    </div>
  )
}

function Row({
  icon,
  title,
  subtitle,
  onClick,
  destructive,
}: {
  icon: 'download' | 'settings' | 'trash' | 'image' | 'heart' | 'lock'
  title: string
  subtitle: string
  onClick?: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        borderBottom: '0.5px solid var(--hairline)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: destructive ? 'var(--accent-pale)' : 'var(--bg-inset)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={16} color={destructive ? 'var(--accent)' : 'var(--ink)'} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: destructive ? 'var(--accent)' : 'var(--ink)' }}>
          {title}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
      <Icon name="chevron-right" size={16} color="var(--ink-faint)" />
    </button>
  )
}

function BasicSection({ settings }: { settings: { userName: string; userCity: string; defaultCurrency: CurrencyCode; enabledCurrencies: CurrencyCode[] } }) {
  const [name, setName] = useState(settings.userName)
  const [city, setCity] = useState(settings.userCity)
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(settings.defaultCurrency)
  const [enabledCurrencies, setEnabledCurrencies] = useState<CurrencyCode[]>(settings.enabledCurrencies)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await updateSettings({ userName: name, userCity: city, defaultCurrency, enabledCurrencies })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleCurrency = (c: CurrencyCode) => {
    setEnabledCurrencies((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  return (
    <Card padding={16}>
      <SectionLabel>Tus datos</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej: Dayana" />
        <TextField label="Ciudad" value={city} onChange={setCity} placeholder="Ej: Berlín" />
        <SelectField
          label="Moneda principal"
          value={defaultCurrency}
          onChange={(v) => setDefaultCurrency(v as CurrencyCode)}
          options={ALL_CURRENCIES.map((c) => ({ value: c, label: c }))}
        />
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-mute)',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Monedas habilitadas
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_CURRENCIES.map((c) => {
              const active = enabledCurrencies.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCurrency(c)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 99,
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? 'var(--bg)' : 'var(--ink-mute)',
                    border: active ? 'none' : '0.5px solid var(--hairline)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    letterSpacing: 0.6,
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <PrimaryButton onClick={handleSave}>{saved ? 'Guardado ✓' : 'Guardar cambios'}</PrimaryButton>
        </div>
        {saved && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            Cambios guardados
          </Pill>
        )}
      </div>
    </Card>
  )
}

/**
 * Password configuration row + modal. Shows "Configurar contraseña" when
 * the user only has Google attached, or "Cambiar contraseña" when they
 * already linked one earlier. Both flows write to the SAME account.
 */
function PasswordSection() {
  const user = useAuthStore((s) => s.user)
  const hasPwd = user ? hasPasswordProvider(user) : false
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card padding={6}>
        <Row
          icon="lock"
          title={hasPwd ? 'Cambiar contraseña' : 'Configurar contraseña'}
          subtitle={
            hasPwd
              ? 'Para iniciar sesión también con email + contraseña'
              : 'Útil para entrar a la app instalada en iPhone'
          }
          onClick={() => setOpen(true)}
        />
      </Card>
      <PasswordModal open={open} onClose={() => setOpen(false)} mode={hasPwd ? 'change' : 'set'} />
    </>
  )
}

function PasswordModal({
  open,
  onClose,
  mode,
}: {
  open: boolean
  onClose: () => void
  mode: 'set' | 'change'
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const reset = () => {
    setPassword('')
    setConfirm('')
    setError(null)
    setBusy(false)
    setDone(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    setError(null)
    if (password.length < 6) {
      setError('Mínimo 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'set') await linkPasswordToCurrentUser(password)
      else await updateCurrentPassword(password)
      setDone(true)
      setTimeout(handleClose, 1200)
    } catch (e) {
      setError(prettyPwdError(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={mode === 'set' ? 'Configurar contraseña' : 'Cambiar contraseña'}
      footer={
        <PrimaryButton onClick={handleSave} disabled={busy || done}>
          {done ? 'Guardada ✓' : busy ? 'Guardando…' : mode === 'set' ? 'Configurar' : 'Cambiar'}
        </PrimaryButton>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            color: 'var(--ink-mute)',
            lineHeight: 1.55,
          }}
        >
          {mode === 'set'
            ? 'Tu cuenta queda accesible con Google y con email + contraseña. Mismo email, misma data.'
            : 'Vas a reemplazar la contraseña actual. Si Firebase pide volver a iniciar sesión por seguridad, hazlo y reintenta.'}
        </div>
        <TextField
          label={mode === 'set' ? 'Nueva contraseña' : 'Nueva contraseña'}
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="mínimo 6 caracteres"
        />
        <TextField label="Repítela" value={confirm} onChange={setConfirm} type="password" placeholder="igual que arriba" />
        {error && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--accent)',
              padding: 10,
              borderRadius: 12,
              background: 'var(--accent-pale)',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

function prettyPwdError(e: unknown): string {
  if (typeof e === 'object' && e && 'code' in e) {
    const code = (e as { code: string }).code
    const map: Record<string, string> = {
      'auth/weak-password': 'La contraseña es muy débil. Usa al menos 6 caracteres.',
      'auth/email-already-in-use': 'Ya hay otra cuenta con este email.',
      'auth/credential-already-in-use': 'Esa contraseña ya está en uso por otra cuenta.',
      'auth/provider-already-linked': 'Tu cuenta ya tiene una contraseña configurada.',
      'auth/requires-recent-login': 'Por seguridad, cierra sesión y vuelve a entrar; luego reintenta.',
      'auth/network-request-failed': 'Sin conexión — vuelve a intentarlo.',
    }
    return map[code] ?? `Error: ${code}`
  }
  return e instanceof Error ? e.message : 'Algo salió mal — intenta de nuevo'
}
