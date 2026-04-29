import { useEffect, useState } from 'react'
import { Card, ModuleHeading, Pill } from '@shared/components/primitives'
import { TextField } from '@shared/components/TextField'
import { Icon } from '@shared/icons/Icon'
import { db as localDb } from '@/data/db'
import { convert, getRate, refreshRate } from '@/data/repositories/fx'
import type { DisplayCurrency } from '@/data/types'
import { CURRENCY_SYMBOLS } from '@shared/utils/format'
import { format } from 'date-fns'

const CURRENCIES: DisplayCurrency[] = ['COP', 'USD', 'EUR']

/**
 * Standalone currency calculator. Lives at /convertir, accessible from the
 * sidebar/tabbar. Uses TODAY's live rate (auto-refreshes on open) — different
 * from the historical snapshot stored on each transaction.
 */
export function ConvertirScreen() {
  const [from, setFrom] = useState<DisplayCurrency>('COP')
  const [to, setTo] = useState<DisplayCurrency>('USD')
  const [amount, setAmount] = useState('100')
  const [result, setResult] = useState(0)
  const [rate, setRate] = useState(1)
  const [fetched, setFetched] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  /* On open, fetch the freshest rate. The user said the device will always be
     online — but we still keep the cached rate as a graceful fallback. */
  useEffect(() => {
    let mounted = true
    void (async () => {
      const fresh = await refreshRate(from, to)
      const effective = fresh ?? (await getRate(from, to))
      if (!mounted) return
      setRate(effective)
      const cached = await localDb.fxRates.get(`${from}-${to}`)
      setFetched(cached?.fetchedAt ?? Date.now())
    })()
    return () => {
      mounted = false
    }
  }, [from, to])

  useEffect(() => {
    let mounted = true
    void (async () => {
      const a = Number(amount.replace(',', '.'))
      if (!Number.isFinite(a)) return
      const r = await convert(a, from, to)
      if (mounted) setResult(r)
    })()
    return () => {
      mounted = false
    }
  }, [amount, from, to, rate])

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    const r = await refreshRate(from, to)
    if (r !== null) setRate(r)
    const cached = await localDb.fxRates.get(`${from}-${to}`)
    setFetched(cached?.fetchedAt ?? Date.now())
    setRefreshing(false)
  }

  return (
    <div>
      <ModuleHeading kicker="Herramienta" title="Convertir" subtitle="Tasa viva del día — no afecta tus registros." />

      <div style={{ padding: '24px 20px 0' }}>
        <Card padding={20}>
          {/* From */}
          <FieldRow
            label="Tienes"
            value={amount}
            onAmountChange={setAmount}
            currency={from}
            onCurrencyChange={setFrom}
            input
          />

          {/* Swap */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
            <button
              type="button"
              onClick={swap}
              aria-label="Intercambiar"
              style={{
                width: 40,
                height: 40,
                borderRadius: 99,
                background: 'var(--bg-inset)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="arrow-down" size={16} color="var(--ink)" />
            </button>
          </div>

          {/* To */}
          <FieldRow
            label="Equivale a"
            value={`${CURRENCY_SYMBOLS[to]} ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(result)}`}
            currency={to}
            onCurrencyChange={setTo}
            accent
          />

          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill>
              1 {from} = {rate.toFixed(rate < 1 ? 6 : 4)} {to}
            </Pill>
            <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
              {fetched ? `Actualizado ${format(new Date(fetched), 'd MMM HH:mm')}` : '—'}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 99,
                background: refreshing ? 'var(--ink-faint)' : 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                cursor: refreshing ? 'wait' : 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {refreshing ? '…' : 'Actualizar'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function FieldRow({
  label,
  value,
  onAmountChange,
  currency,
  onCurrencyChange,
  input,
  accent,
}: {
  label: string
  value: string
  onAmountChange?: (v: string) => void
  currency: DisplayCurrency
  onCurrencyChange: (c: DisplayCurrency) => void
  input?: boolean
  accent?: boolean
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--ink-mute)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          {input && onAmountChange ? (
            <TextField label="" value={value} onChange={onAmountChange} inputMode="decimal" />
          ) : (
            <div
              style={{
                padding: '12px 14px',
                background: accent ? 'var(--accent-pale)' : 'var(--bg-inset)',
                borderRadius: 14,
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                color: accent ? 'var(--accent)' : 'var(--ink)',
                fontWeight: 500,
              }}
            >
              {value}
            </div>
          )}
        </div>
        <CurrencySegment value={currency} onChange={onCurrencyChange} />
      </div>
    </div>
  )
}

function CurrencySegment({
  value,
  onChange,
}: {
  value: DisplayCurrency
  onChange: (c: DisplayCurrency) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: 2,
        borderRadius: 14,
        background: 'var(--bg-inset)',
        border: '0.5px solid var(--hairline)',
      }}
    >
      {CURRENCIES.map((c) => {
        const active = c === value
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{
              padding: '4px 10px',
              borderRadius: 11,
              border: 'none',
              cursor: active ? 'default' : 'pointer',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--ink-mute)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: 0.6,
              fontWeight: active ? 600 : 500,
              minWidth: 36,
            }}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}
