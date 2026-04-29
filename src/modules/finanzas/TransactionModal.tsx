import { useEffect, useState } from 'react'
import { Modal } from '@shared/components/Modal'
import { PrimaryButton } from '@shared/components/primitives'
import { TextField, SelectField } from '@shared/components/TextField'
import { createTransaction } from '@/data/repositories/wallets'
import { getRate } from '@/data/repositories/fx'
import type { DisplayCurrency, TxType, Wallet } from '@/data/types'
import { todayIso, formatMoneyRound } from '@shared/utils/format'

const CURRENCIES: DisplayCurrency[] = ['COP', 'USD', 'EUR']
const SYMBOL: Record<DisplayCurrency, string> = { COP: '$', USD: 'US$', EUR: '€' }
const LAST_USED_KEY = 'horion:lastTxCurrency'

function readLastUsed(): DisplayCurrency {
  if (typeof window === 'undefined') return 'COP'
  const v = window.localStorage.getItem(LAST_USED_KEY)
  return v === 'USD' || v === 'EUR' ? v : 'COP'
}

function rememberLastUsed(c: DisplayCurrency): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(LAST_USED_KEY, c)
}

interface Props {
  open: boolean
  onClose: () => void
  wallets: Wallet[]
  type: TxType
  initialWalletId?: string
}

export function TransactionModal({ open, onClose, wallets, type, initialWalletId }: Props) {
  const defaultWallet = initialWalletId ?? wallets[0]?.id ?? ''
  const [walletId, setWalletId] = useState(defaultWallet)
  const [amount, setAmount] = useState('')
  const [currency, setCurrencyState] = useState<DisplayCurrency>(readLastUsed)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayIso())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hint, setHint] = useState<string>('')

  const setCurrency = (c: DisplayCurrency) => {
    setCurrencyState(c)
    rememberLastUsed(c)
  }

  if (open && walletId === '' && wallets.length > 0) setWalletId(wallets[0].id)

  /* Live conversion hint shown under the amount: e.g. when typing 100 USD it
     shows "≈ $415.000 COP". Refreshes when amount/currency change. */
  useEffect(() => {
    if (!open) return
    const parsed = Number(amount.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setHint('')
      return
    }
    let cancelled = false
    void (async () => {
      const targets: DisplayCurrency[] = (['COP', 'USD', 'EUR'] as DisplayCurrency[]).filter((c) => c !== currency)
      const parts: string[] = []
      for (const t of targets) {
        const rate = await getRate(currency, t)
        parts.push(formatMoneyRound(parsed * rate, t))
      }
      if (!cancelled) setHint(`≈ ${parts.join(' · ')}`)
    })()
    return () => {
      cancelled = true
    }
  }, [amount, currency, open])

  const reset = () => {
    setAmount('')
    setTitle('')
    setError(null)
    setSaving(false)
    setHint('')
    setDate(todayIso())
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    setError(null)
    const parsed = Number(amount.replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Ingresa un monto mayor a 0')
      return
    }
    if (!walletId) {
      setError('Selecciona una categoría')
      return
    }
    setSaving(true)
    try {
      await createTransaction({
        walletId,
        type,
        amount: parsed,
        currency,
        title: title || (type === 'in' ? 'Ingreso' : 'Egreso'),
        date,
      })
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={type === 'in' ? 'Nuevo ingreso' : 'Nuevo egreso'}
      footer={
        <PrimaryButton onClick={handleSave} disabled={saving || !walletId || !amount}>
          {saving ? 'Guardando…' : type === 'in' ? 'Registrar ingreso' : 'Registrar egreso'}
        </PrimaryButton>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SelectField
          label="Categoría"
          value={walletId}
          onChange={setWalletId}
          options={wallets.map((w) => ({ value: w.id, label: `${w.name} · ${w.sub}` }))}
        />

        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-mute)',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Moneda
          </div>
          <div
            style={{
              display: 'flex',
              gap: 6,
            }}
          >
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
                    transition: 'background 160ms ease, color 160ms ease',
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <TextField
            label="Monto"
            value={amount}
            onChange={setAmount}
            inputMode="decimal"
            placeholder="0"
            prefix={SYMBOL[currency]}
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

        <TextField label="Detalle" value={title} onChange={setTitle} placeholder="Ej: Cita Marta — pieza pierna" />
        <TextField label="Fecha" value={date} onChange={setDate} type="date" />
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
