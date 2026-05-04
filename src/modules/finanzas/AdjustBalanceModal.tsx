import { useEffect, useState } from 'react'
import { Modal } from '@shared/components/Modal'
import { PrimaryButton } from '@shared/components/primitives'
import { TextField } from '@shared/components/TextField'
import { adjustAccountBalance } from '@/data/repositories/accounts'
import type { Account, DisplayCurrency } from '@/data/types'
import { todayIso, formatMoneyRound } from '@shared/utils/format'

interface Props {
  open: boolean
  account: Account | null
  onClose: () => void
}

function asDisplay(c: Account['currency']): DisplayCurrency {
  return c === 'USD' || c === 'EUR' ? c : 'COP'
}

/** Lets the user say "the real saldo today is X" and the app records the
 *  delta as a single transaction so the cached number snaps to reality.
 *  Useful when paper money got spent without a registry entry, or vice versa. */
export function AdjustBalanceModal({ open, account, onClose }: Props) {
  const [newBalance, setNewBalance] = useState('')
  const [date, setDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNewBalance(account ? String(Math.round(account.balance)) : '')
    setDate(todayIso())
    setNotes('')
    setError(null)
    setSaving(false)
  }, [open, account])

  if (!account) return null
  const display = asDisplay(account.currency)

  const parsed = Number((newBalance || '0').replace(',', '.'))
  const delta = Number.isFinite(parsed) ? parsed - account.balance : 0

  const handleSave = async () => {
    setError(null)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Saldo inválido')
      return
    }
    setSaving(true)
    try {
      await adjustAccountBalance({
        accountId: account.id,
        newBalance: parsed,
        date,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ajustar')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ajustar saldo"
      footer={
        <PrimaryButton onClick={handleSave} disabled={saving}>
          {saving ? 'Ajustando…' : 'Confirmar'}
        </PrimaryButton>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: 'var(--bg-inset)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-mute)', letterSpacing: 1, textTransform: 'uppercase' }}>
              Saldo actual
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)', marginTop: 2 }}>
              {account.name}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', letterSpacing: -0.4 }}>
            {formatMoneyRound(account.balance, display)}
          </div>
        </div>

        <TextField
          label="Saldo real hoy"
          value={newBalance}
          onChange={setNewBalance}
          inputMode="decimal"
          placeholder="0"
          prefix={account.currency === 'EUR' ? '€' : account.currency === 'USD' ? 'US$' : '$'}
        />

        {Math.abs(delta) > 0.005 && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: delta > 0 ? 'var(--accent-pale)' : 'var(--bg-inset)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: delta > 0 ? 'var(--accent)' : 'var(--ink-mute)',
              lineHeight: 1.4,
            }}
          >
            Se registrará un {delta > 0 ? 'ingreso' : 'egreso'} de{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {formatMoneyRound(Math.abs(delta), display)}
            </span>{' '}
            como ajuste de saldo.
          </div>
        )}

        <TextField label="Fecha del ajuste" value={date} onChange={setDate} type="date" />
        <TextField label="Por qué (opcional)" value={notes} onChange={setNotes} placeholder="Ej. Encontré plata en el bolsillo" />

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
