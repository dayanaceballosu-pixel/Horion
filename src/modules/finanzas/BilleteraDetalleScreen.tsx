import { useMemo, useState } from 'react'
import { useLocation, useParams } from 'wouter'
import { ActionChip, BackBar, Card, ModuleHeading, SectionTitle } from '@shared/components/primitives'
import { Icon } from '@shared/icons/Icon'
import { transactionsQuery } from '@/data/repositories/wallets'
import { useDoc, useCollection } from '@shared/hooks/useFirestore'
import { userSubDoc } from '@/data/firebase'
import { useAuthStore } from '@/data/auth'
import type { DisplayCurrency, Transaction, Wallet } from '@/data/types'
import { useThemeStore } from '@shared/theme/useTheme'
import { useDisplayCurrency } from '@shared/hooks/useDisplayCurrency'
import { CurrencyToggle } from '@shared/components/CurrencyToggle'
import {
  formatMoneyRound,
  formatMonthLong,
  isoMonth as todayIsoMonth,
  shiftMonth,
} from '@shared/utils/format'
import { TransactionModal } from './TransactionModal'
import { TransactionActionsModal } from './TransactionActionsModal'

export function BilleteraDetalleScreen() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const uid = useAuthStore((s) => s.user?.uid)
  const wallet = useDoc<Wallet>(
    () => (uid && params.id ? userSubDoc(uid, 'wallets', params.id) : null),
    [uid, params.id],
  )
  /* All transactions for the category (capped). We slice by month client-side
     so navigation feels instant — no extra Firestore round-trips on month
     switches. With ≤500 docs this stays well under any composite-index need. */
  const allTxs = useCollection<Transaction>(
    () => (params.id ? transactionsQuery({ walletId: params.id, limit: 500 }) : null),
    [params.id],
  )

  const { currency } = useDisplayCurrency()
  const hidePrivate = useThemeStore((s) => s.hidePrivate)
  const [selectedMonth, setSelectedMonth] = useState<string>(todayIsoMonth())
  const [txModal, setTxModal] = useState<'in' | 'out' | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const monthTxs = useMemo(
    () => allTxs.filter((t) => t.date.startsWith(selectedMonth)).sort((a, b) => b.createdAt - a.createdAt),
    [allTxs, selectedMonth],
  )
  const totals = useMemo(() => totalsFor(monthTxs, currency), [monthTxs, currency])
  const last6 = useMemo(() => last6MonthsStats(allTxs, currency, selectedMonth), [allTxs, currency, selectedMonth])

  if (!wallet) {
    return (
      <div>
        <BackBar label="Finanzas" onBack={() => navigate('/finanzas')} />
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>Categoría no encontrada</div>
      </div>
    )
  }

  const sign = totals.neto > 0 ? '+' : totals.neto < 0 ? '−' : ''

  return (
    <div>
      <BackBar label="Finanzas" onBack={() => navigate('/finanzas')} />
      <ModuleHeading kicker="Categoría" title={wallet.name} subtitle={wallet.sub} />

      {/* Month nav + currency toggle */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <MonthNav month={selectedMonth} onChange={setSelectedMonth} />
        <CurrencyToggle size="sm" />
      </div>

      {/* Hero card with the 3 monthly figures */}
      <div style={{ padding: '16px 20px 0' }}>
        <div
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderRadius: 26,
            padding: 22,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: 1.5,
              opacity: 0.6,
              textTransform: 'uppercase',
            }}
          >
            Neto · {formatMonthLong(selectedMonth)}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: -1,
              marginTop: 4,
            }}
          >
            {hidePrivate ? '••••' : `${sign}${formatMoneyRound(Math.abs(totals.neto), currency)}`}
          </div>

          <div style={{ marginTop: 18, display: 'flex', gap: 16 }}>
            <HeroStat
              kicker="Ingresos"
              value={hidePrivate ? '••••' : `+${formatMoneyRound(totals.ingresos, currency)}`}
              accent
            />
            <HeroStat
              kicker="Egresos"
              value={hidePrivate ? '••••' : `−${formatMoneyRound(totals.egresos, currency)}`}
            />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 8 }}>
        <ActionChip icon="arrow-down" label="Ingreso" primary onClick={() => setTxModal('in')} />
        <ActionChip icon="arrow-up" label="Egreso" onClick={() => setTxModal('out')} />
      </div>

      {/* Mini-chart of last 6 months */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="Tendencia" title="Últimos 6 meses" />
        <Card padding={16}>
          <SixMonthBars data={last6} currency={currency} hidePrivate={hidePrivate} />
        </Card>
      </div>

      {/* Lists: ingresos arriba, egresos abajo */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="Movimientos" title={formatMonthLong(selectedMonth)} />

        <SubSection
          title="Ingresos"
          empty="Sin ingresos este mes."
          txs={monthTxs.filter((t) => t.type === 'in')}
          currency={currency}
          accent
          onSelect={setSelectedTx}
        />
        <div style={{ height: 12 }} />
        <SubSection
          title="Egresos"
          empty="Sin egresos este mes."
          txs={monthTxs.filter((t) => t.type === 'out')}
          currency={currency}
          onSelect={setSelectedTx}
        />
      </div>

      <TransactionModal
        open={txModal !== null}
        onClose={() => setTxModal(null)}
        wallets={wallet ? [wallet] : []}
        type={txModal ?? 'in'}
        initialWalletId={wallet?.id}
      />

      <TransactionActionsModal
        tx={selectedTx}
        wallets={wallet ? [wallet] : []}
        currency={currency}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  )
}

/* ─────────────────────────── helpers ─────────────────────────── */

function totalsFor(txs: Transaction[], currency: DisplayCurrency) {
  let ingresos = 0
  let egresos = 0
  for (const t of txs) {
    const v = t.snapshot?.[currency] ?? 0
    if (t.type === 'in') ingresos += v
    else egresos += v
  }
  return { ingresos, egresos, neto: ingresos - egresos }
}

interface MonthBucket {
  month: string
  ingresos: number
  egresos: number
}

function last6MonthsStats(txs: Transaction[], currency: DisplayCurrency, anchor: string): MonthBucket[] {
  const months: string[] = []
  for (let i = 5; i >= 0; i--) months.push(shiftMonth(anchor, -i))
  const buckets: Record<string, MonthBucket> = {}
  for (const m of months) buckets[m] = { month: m, ingresos: 0, egresos: 0 }
  for (const t of txs) {
    const m = t.date.slice(0, 7)
    if (!buckets[m]) continue
    const v = t.snapshot?.[currency] ?? 0
    if (t.type === 'in') buckets[m].ingresos += v
    else buckets[m].egresos += v
  }
  return months.map((m) => buckets[m])
}

function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const navBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 99,
    border: '0.5px solid var(--hairline)',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mes anterior" style={navBtn}>
        <Icon name="chevron-left" size={14} color="var(--ink)" />
      </button>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 18,
          color: 'var(--ink)',
          minWidth: 110,
          textAlign: 'center',
          letterSpacing: -0.3,
        }}
      >
        {formatMonthLong(month)}
      </div>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Mes siguiente" style={navBtn}>
        <Icon name="chevron-right" size={14} color="var(--ink)" />
      </button>
    </div>
  )
}

function HeroStat({ kicker, value, accent }: { kicker: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          opacity: 0.6,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          marginTop: 2,
          color: accent ? 'var(--accent)' : 'inherit',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SixMonthBars({
  data,
  currency,
  hidePrivate,
}: {
  data: MonthBucket[]
  currency: DisplayCurrency
  hidePrivate: boolean
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.ingresos, d.egresos)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 110 }}>
      {data.map((d) => {
        const inH = (d.ingresos / max) * 80
        const outH = (d.egresos / max) * 80
        const label = d.month.slice(5) /* 04 / 03 / etc. */
        const neto = d.ingresos - d.egresos
        return (
          <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
              <div
                title={hidePrivate ? '' : `Ingresos: ${formatMoneyRound(d.ingresos, currency)}`}
                style={{
                  width: 8,
                  height: Math.max(2, inH),
                  background: 'var(--accent)',
                  borderRadius: 3,
                }}
              />
              <div
                title={hidePrivate ? '' : `Egresos: ${formatMoneyRound(d.egresos, currency)}`}
                style={{
                  width: 8,
                  height: Math.max(2, outH),
                  background: 'var(--ink)',
                  opacity: 0.7,
                  borderRadius: 3,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--ink-mute)',
                letterSpacing: 0.4,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: neto >= 0 ? 'var(--accent)' : 'var(--ink-mute)',
                fontWeight: 500,
              }}
            >
              {hidePrivate ? '•' : `${neto >= 0 ? '+' : '−'}${formatMoneyRound(Math.abs(neto), currency)}`}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SubSection({
  title,
  empty,
  txs,
  currency,
  accent,
  onSelect,
}: {
  title: string
  empty: string
  txs: Transaction[]
  currency: DisplayCurrency
  accent?: boolean
  onSelect?: (tx: Transaction) => void
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: accent ? 'var(--accent)' : 'var(--ink-mute)',
          margin: '4px 4px 8px',
        }}
      >
        {title}
      </div>
      <Card padding={6}>
        {txs.length === 0 ? (
          <div style={{ padding: 18, textAlign: 'center', fontFamily: 'var(--font-sans)', color: 'var(--ink-mute)', fontSize: 13 }}>
            {empty}
          </div>
        ) : (
          txs.map((r, i) => (
            <div
              key={r.id}
              onClick={() => onSelect?.(r)}
              role={onSelect ? 'button' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderBottom: i < txs.length - 1 ? '0.5px solid var(--hairline)' : 'none',
                cursor: onSelect ? 'pointer' : 'default',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: r.type === 'in' ? 'var(--accent-pale)' : 'var(--bg-inset)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={r.type === 'in' ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={r.type === 'in' ? 'var(--accent)' : 'var(--ink)'}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 14,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.title}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-mute)',
                    marginTop: 2,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {r.date}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 500,
                  color: r.type === 'in' ? 'var(--accent)' : 'var(--ink)',
                }}
              >
                {r.type === 'in' ? '+' : '−'}
                {formatMoneyRound(r.snapshot?.[currency] ?? 0, currency)}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
