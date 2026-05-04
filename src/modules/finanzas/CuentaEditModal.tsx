import { useEffect, useState } from 'react'
import { Modal } from '@shared/components/Modal'
import { PrimaryButton } from '@shared/components/primitives'
import { TextField } from '@shared/components/TextField'
import { archiveAccount, createAccount, updateAccount } from '@/data/repositories/accounts'
import type { Account, AccountKind, CurrencyCode } from '@/data/types'
import { ACCOUNT_KIND_META, ACCOUNT_KIND_ORDER } from './accountKinds'
import { Icon } from '@shared/icons/Icon'

const CURRENCIES: CurrencyCode[] = ['COP', 'USD', 'EUR']
const CURRENCY_LABEL: Record<CurrencyCode, string> = {
  COP: 'COP', USD: 'USD', EUR: 'EUR', PLN: 'PLN',
}

interface Props {
  open: boolean
  /** When provided, the modal is in edit mode and pre-fills with this account. */
  account?: Account | null
  onClose: () => void
}

export function CuentaEditModal({ open, account, onClose }: Props) {
  const editing = !!account
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'cash')
  const [name, setName] = useState(account?.name ?? '')
  const [currency, setCurrency] = useState<CurrencyCode>(account?.currency ?? 'COP')
  const [initial, setInitial] = useState(
    account ? String(account.initialBalance) : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  /* When the modal re-opens with a different account (or "new"), reset every
   *  local field so we don't carry stale state across sessions. */
  useEffect(() => {
    if (!open) return
    setKind(account?.kind ?? 'cash')
    setName(account?.name ?? '')
    setCurrency(account?.currency ?? 'COP')
    setInitial(account ? String(account.initialBalance) : '')
    setError(null)
    setSaving(false)
    setConfirmDelete(false)
  }, [open, account])

  /* When the user picks a kind, suggest the kind's natural defaults — name
   *  hint and currency. Only auto-fills empty fields so we don't stomp the
   *  user's manual edits. */
  const onPickKind = (k: AccountKind) => {
    setKind(k)
    const meta = ACCOUNT_KIND_META[k]
    if (!editing) {
      if (!name.trim()) setName(meta.label)
      setCurrency(meta.defaultCurrency)
    }
  }

  const handleSave = async () => {
    setError(null)
    const parsedInitial = Number((initial || '0').replace(',', '.'))
    if (!Number.isFinite(parsedInitial) || parsedInitial < 0) {
      setError('Saldo inicial inválido')
      return
    }
    if (!name.trim()) {
      setError('Ponle un nombre a la cuenta')
      return
    }
    setSaving(true)
    try {
      if (editing && account) {
        await updateAccount(account.id, {
          name: name.trim(),
          kind,
          currency,
          initialBalance: parsedInitial,
        })
      } else {
        await createAccount({
          name: name.trim(),
          kind,
          currency,
          initialBalance: parsedInitial,
        })
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!account) return
    setSaving(true)
    try {
      await archiveAccount(account.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
      footer={
        <div data-tutorial="account-save">
          <PrimaryButton onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cuenta'}
          </PrimaryButton>
        </div>
      }
    >
      <div data-tutorial="account-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Kind picker */}
        <div>
          <Label>Tipo de cuenta</Label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginTop: 6,
            }}
          >
            {ACCOUNT_KIND_ORDER.map((k) => {
              const meta = ACCOUNT_KIND_META[k]
              const active = kind === k
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onPickKind(k)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 14,
                    border: active ? '1px solid var(--ink)' : '0.5px solid var(--hairline)',
                    background: active ? meta.bg : 'var(--bg-card)',
                    color: active ? meta.fg : 'var(--ink)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'background 160ms ease, color 160ms ease',
                  }}
                >
                  <Icon name={meta.icon} size={18} color={active ? meta.fg : 'var(--ink-mute)'} />
                  {meta.short}
                </button>
              )
            })}
          </div>
        </div>

        <TextField label="Nombre de la cuenta" value={name} onChange={setName} placeholder="Ej. Nequi personal" />

        {/* Currency picker */}
        <div>
          <Label>Moneda</Label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {CURRENCIES.map((c) => {
              const active = c === currency
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 12,
                    border: active ? 'none' : '0.5px solid var(--hairline)',
                    background: active ? 'var(--ink)' : 'var(--bg-card)',
                    color: active ? 'var(--bg)' : 'var(--ink)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    letterSpacing: 0.5,
                    cursor: active ? 'default' : 'pointer',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {CURRENCY_LABEL[c]}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <TextField
            label={editing ? 'Saldo inicial (al crear)' : 'Saldo actual'}
            value={initial}
            onChange={setInitial}
            inputMode="decimal"
            placeholder="0"
            prefix={currency === 'EUR' ? '€' : currency === 'USD' ? 'US$' : '$'}
          />
          <Hint>
            {editing
              ? 'Cambiar este número recalcula el saldo desde cero. Útil si te equivocaste al crear la cuenta.'
              : 'Lo que tienes en esta cuenta hoy. Los movimientos que registres se sumarán y restarán de aquí.'}
          </Hint>
        </div>

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

        {editing && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  height: 44,
                  borderRadius: 99,
                  background: 'transparent',
                  color: 'var(--ink-mute)',
                  border: '0.5px solid var(--hairline)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Eliminar cuenta
              </button>
            ) : (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'var(--accent-pale)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>
                  Se archivará la cuenta. Sus movimientos se conservan en el historial.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    style={{
                      flex: 1, height: 40, borderRadius: 99,
                      background: 'var(--bg-card)', color: 'var(--ink)',
                      border: '0.5px solid var(--hairline)',
                      fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    style={{
                      flex: 1, height: 40, borderRadius: 99,
                      background: 'var(--accent)', color: '#FFFFFF',
                      border: 'none',
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                      cursor: saving ? 'wait' : 'pointer',
                    }}
                  >
                    {saving ? 'Archivando…' : 'Sí, archivar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
      }}
    >
      {children}
    </span>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 6,
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        color: 'var(--ink-faint)',
        lineHeight: 1.4,
      }}
    >
      {children}
    </div>
  )
}
