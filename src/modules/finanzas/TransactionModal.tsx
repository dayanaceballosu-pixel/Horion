import { useEffect, useState } from 'react'
import { Modal } from '@shared/components/Modal'
import { PrimaryButton } from '@shared/components/primitives'
import { TextField, SelectField } from '@shared/components/TextField'
import { createTransaction } from '@/data/repositories/wallets'
import { getRate } from '@/data/repositories/fx'
import type { Account, DisplayCurrency, TxType, Wallet } from '@/data/types'
import { todayIso, formatMoneyRound } from '@shared/utils/format'
import { ACCOUNT_KIND_META } from './accountKinds'

const CURRENCIES: DisplayCurrency[] = ['COP', 'USD', 'EUR']
const SYMBOL: Record<DisplayCurrency, string> = { COP: '$', USD: 'US$', EUR: '€' }
const LAST_USED_KEY = 'horion:lastTxCurrency'
const LAST_ACCOUNT_KEY = 'horion:lastTxAccount'

function readLastUsed(): DisplayCurrency {
  if (typeof window === 'undefined') return 'COP'
  const v = window.localStorage.getItem(LAST_USED_KEY)
  return v === 'USD' || v === 'EUR' ? v : 'COP'
}

function rememberLastUsed(c: DisplayCurrency): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(LAST_USED_KEY, c)
}

function readLastAccount(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(LAST_ACCOUNT_KEY)
}

function rememberLastAccount(id: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(LAST_ACCOUNT_KEY, id)
}

interface Props {
  open: boolean
  onClose: () => void
  wallets: Wallet[]
  accounts: Account[]
  type: TxType
  initialWalletId?: string
  initialAccountId?: string
}

export function TransactionModal({
  open,
  onClose,
  wallets,
  accounts,
  type,
  initialWalletId,
  initialAccountId,
}: Props) {
  const defaultWallet = initialWalletId ?? wallets[0]?.id ?? ''
  /* Account preference: explicit prop > localStorage > first account. The
     localStorage path keeps repetitive entry friction-free — the user usually
     records 5 cash movements in a row, then 3 from Nequi, etc. */
  const defaultAccount =
    initialAccountId ??
    (accounts.find((a) => a.id === readLastAccount())?.id ?? accounts[0]?.id ?? '')

  const [walletId, setWalletId] = useState(defaultWallet)
  const [accountId, setAccountId] = useState(defaultAccount)
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

  /* Re-sync the selected wallet/account when the modal re-opens. Without this,
     creating an "in" then an "out" right after — or revisiting after pulling
     in a new account — the picker can show a stale id that's no longer valid. */
  useEffect(() => {
    if (!open) return
    if (!wallets.find((w) => w.id === walletId)) {
      setWalletId(initialWalletId ?? wallets[0]?.id ?? '')
    }
    if (!accounts.find((a) => a.id === accountId)) {
      setAccountId(
        initialAccountId ??
          (accounts.find((a) => a.id === readLastAccount())?.id ?? accounts[0]?.id ?? ''),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wallets, accounts, initialWalletId, initialAccountId])

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
    if (!accountId) {
      setError('Selecciona la cuenta')
      return
    }
    setSaving(true)
    try {
      await createTransaction({
        walletId,
        accountId,
        type,
        amount: parsed,
        currency,
        title: title || (type === 'in' ? 'Ingreso' : 'Egreso'),
        date,
      })
      rememberLastAccount(accountId)
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
        <div data-tutorial="tx-save">
          <PrimaryButton onClick={handleSave} disabled={saving || !walletId || !accountId || !amount}>
            {saving ? 'Guardando…' : type === 'in' ? 'Registrar ingreso' : 'Registrar egreso'}
          </PrimaryButton>
        </div>
      }
    >
      <div data-tutorial="tx-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SelectField
          label={type === 'in' ? 'Cuenta donde entra' : 'Cuenta de donde sale'}
          value={accountId}
          onChange={setAccountId}
          options={
            accounts.length > 0
              ? accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} · ${ACCOUNT_KIND_META[a.kind].short}`,
                }))
              : [{ value: '', label: 'Crea una cuenta primero' }]
          }
        />

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
          <div style={{ display: 'flex', gap: 6 }}>
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
