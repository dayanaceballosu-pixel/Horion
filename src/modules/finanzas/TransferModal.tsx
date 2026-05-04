import { useEffect, useState } from 'react'
import { Modal } from '@shared/components/Modal'
import { PrimaryButton } from '@shared/components/primitives'
import { TextField, SelectField } from '@shared/components/TextField'
import { registerTransfer } from '@/data/repositories/accounts'
import { getRate } from '@/data/repositories/fx'
import type { Account, DisplayCurrency } from '@/data/types'
import { todayIso, formatMoneyRound } from '@shared/utils/format'
import { Icon } from '@shared/icons/Icon'

interface Props {
  open: boolean
  accounts: Account[]
  initialFromId?: string
  onClose: () => void
}

function asDisplay(c: Account['currency']): DisplayCurrency {
  return c === 'USD' || c === 'EUR' ? c : 'COP'
}

export function TransferModal({ open, accounts, initialFromId, onClose }: Props) {
  const first = accounts[0]?.id ?? ''
  const second = accounts[1]?.id ?? first
  const [fromId, setFromId] = useState(initialFromId ?? first)
  const [toId, setToId] = useState(initialFromId === second ? first : second)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hint, setHint] = useState('')

  /* Reset when (re)opening so a previous error or stale values don't surface. */
  useEffect(() => {
    if (!open) return
    const f = initialFromId ?? accounts[0]?.id ?? ''
    const t = accounts.find((a) => a.id !== f)?.id ?? ''
    setFromId(f)
    setToId(t)
    setAmount('')
    setDate(todayIso())
    setNotes('')
    setError(null)
    setSaving(false)
    setHint('')
  }, [open, initialFromId, accounts])

  const from = accounts.find((a) => a.id === fromId)
  const to = accounts.find((a) => a.id === toId)

  /* Live conversion preview when source and destination currencies differ. */
  useEffect(() => {
    const parsed = Number((amount || '0').replace(',', '.'))
    if (!from || !to || !Number.isFinite(parsed) || parsed <= 0) {
      setHint('')
      return
    }
    if (from.currency === to.currency) {
      setHint('')
      return
    }
    let cancelled = false
    void (async () => {
      const rate = await getRate(asDisplay(from.currency), asDisplay(to.currency))
      const converted = parsed * rate
      if (!cancelled) {
        setHint(`≈ recibirás ${formatMoneyRound(converted, asDisplay(to.currency))}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [amount, from, to])

  const handleSave = async () => {
    setError(null)
    if (!from || !to) {
      setError('Selecciona ambas cuentas')
      return
    }
    if (fromId === toId) {
      setError('Elige una cuenta de destino distinta')
      return
    }
    const parsed = Number((amount || '0').replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Ingresa un monto mayor a 0')
      return
    }
    setSaving(true)
    try {
      await registerTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: parsed,
        date,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al transferir')
      setSaving(false)
    }
  }

  const swap = () => {
    setFromId(toId)
    setToId(fromId)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferencia"
      footer={
        <PrimaryButton onClick={handleSave} disabled={saving || !amount || !fromId || !toId || fromId === toId}>
          {saving ? 'Transfiriendo…' : 'Registrar transferencia'}
        </PrimaryButton>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {accounts.length < 2 ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: 'var(--bg-inset)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              color: 'var(--ink-mute)',
              textAlign: 'center',
            }}
          >
            Necesitas al menos dos cuentas para transferir.
          </div>
        ) : (
          <>
            <SelectField
              label="Desde"
              value={fromId}
              onChange={setFromId}
              options={accounts.map((a) => ({
                value: a.id,
                label: `${a.name} · ${formatMoneyRound(a.balance, asDisplay(a.currency))}`,
              }))}
            />

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={swap}
                aria-label="Intercambiar cuentas"
                style={{
                  width: 36, height: 36, borderRadius: 99,
                  border: '0.5px solid var(--hairline)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="arrow-down" size={14} color="var(--ink)" />
              </button>
            </div>

            <SelectField
              label="Hacia"
              value={toId}
              onChange={setToId}
              options={accounts
                .filter((a) => a.id !== fromId)
                .map((a) => ({
                  value: a.id,
                  label: `${a.name} · ${formatMoneyRound(a.balance, asDisplay(a.currency))}`,
                }))}
            />

            <div>
              <TextField
                label={`Monto${from ? ` (${asDisplay(from.currency)})` : ''}`}
                value={amount}
                onChange={setAmount}
                inputMode="decimal"
                placeholder="0"
                prefix={from?.currency === 'EUR' ? '€' : from?.currency === 'USD' ? 'US$' : '$'}
              />
              {hint && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-mute)',
                    marginTop: 6,
                    letterSpacing: 0.4,
                  }}
                >
                  {hint}
                </div>
              )}
            </div>

            <TextField label="Fecha" value={date} onChange={setDate} type="date" />
            <TextField label="Notas (opcional)" value={notes} onChange={setNotes} placeholder="Ej. Saqué del cajero" />
          </>
        )}

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
