import { useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { transactionsQuery, walletsQuery } from '@/data/repositories/wallets'
import type { DisplayCurrency, Transaction, Wallet } from '@/data/types'
import { useCollection } from '@shared/hooks/useFirestore'
import { useDisplayCurrency } from '@shared/hooks/useDisplayCurrency'
import { Card, ModuleHeading, SectionTitle } from '@shared/components/primitives'
import { CurrencyToggle } from '@shared/components/CurrencyToggle'
import { Icon } from '@shared/icons/Icon'
import { formatMoneyRound, formatMonthLong, isoMonth as todayIsoMonth, shiftMonth } from '@shared/utils/format'

type Tab = 'mes' | 'anio' | 'ranking'

export function EstadisticasScreen() {
  const [, navigate] = useLocation()
  const [tab, setTab] = useState<Tab>('mes')
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  /* All transactions, capped at 2000 — comfortable headroom for years of
     history. The screen aggregates everything client-side. */
  const txs = useCollection<Transaction>(() => transactionsQuery({ limit: 2000 }), [])
  const { currency } = useDisplayCurrency()

  return (
    <div>
      <ModuleHeading
        kicker="Módulo 02"
        title="Estadísticas"
        subtitle="Mes a mes. Año a año. Ranking histórico."
      />

      {/* Tabs + currency toggle */}
      <div
        style={{
          padding: '20px 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <TabsRow value={tab} onChange={setTab} />
        <CurrencyToggle size="sm" />
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {tab === 'mes' && <MonthView txs={txs} wallets={wallets} currency={currency} navigate={navigate} />}
        {tab === 'anio' && <YearView txs={txs} wallets={wallets} currency={currency} />}
        {tab === 'ranking' && <RankingView txs={txs} wallets={wallets} currency={currency} />}
      </div>
    </div>
  )
}

/* ─────────────────────────── Tabs ─────────────────────────── */

function TabsRow({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const items: Array<{ id: Tab; label: string }> = [
    { id: 'mes', label: 'Mes' },
    { id: 'anio', label: 'Año' },
    { id: 'ranking', label: 'Ranking' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {items.map((it) => {
        const active = value === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 99,
              border: active ? 'none' : '0.5px solid var(--hairline)',
              background: active ? 'var(--ink)' : 'var(--bg-card)',
              color: active ? 'var(--bg)' : 'var(--ink)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              cursor: active ? 'default' : 'pointer',
            }}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── Month view ─────────────────────────── */

function MonthView({
  txs,
  wallets,
  currency,
  navigate,
}: {
  txs: Transaction[]
  wallets: Wallet[]
  currency: DisplayCurrency
  navigate: (to: string) => void
}) {
  const [month, setMonth] = useState<string>(todayIsoMonth())
  const monthTxs = useMemo(() => txs.filter((t) => t.date.startsWith(month)), [txs, month])
  const totals = useMemo(() => totalsFor(monthTxs, currency), [monthTxs, currency])
  const perWallet = useMemo(() => perWalletTotals(monthTxs, currency), [monthTxs, currency])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <PeriodNav label={formatMonthLong(month)} onPrev={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} />
      </div>

      <ThreeNumbers totals={totals} currency={currency} />

      <div style={{ height: 18 }} />
      <SectionTitle kicker="Por categoría" title="Desglose del mes" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {wallets.map((w) => {
          const stats = perWallet[w.id] ?? { ingresos: 0, egresos: 0 }
          const neto = stats.ingresos - stats.egresos
          return (
            <Card key={w.id} padding={14} onClick={() => navigate(`/billetera/${w.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--ink)' }}>
                    {w.name}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <MiniStat label="In" value={`+${formatMoneyRound(stats.ingresos, currency)}`} accent />
                    <MiniStat label="Out" value={`−${formatMoneyRound(stats.egresos, currency)}`} />
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 18,
                    fontWeight: 600,
                    color: neto >= 0 ? 'var(--accent)' : 'var(--ink)',
                  }}
                >
                  {neto >= 0 ? '+' : '−'}
                  {formatMoneyRound(Math.abs(neto), currency)}
                </div>
              </div>
            </Card>
          )
        })}
        {wallets.length === 0 && <EmptyHint text="Sin categorías." />}
      </div>
    </div>
  )
}

/* ─────────────────────────── Year view ─────────────────────────── */

function YearView({
  txs,
  wallets,
  currency,
}: {
  txs: Transaction[]
  wallets: Wallet[]
  currency: DisplayCurrency
}) {
  const [year, setYear] = useState<number>(new Date().getUTCFullYear())
  const yearStr = String(year)
  const yearTxs = useMemo(() => txs.filter((t) => t.date.startsWith(yearStr)), [txs, yearStr])
  const totals = useMemo(() => totalsFor(yearTxs, currency), [yearTxs, currency])
  const monthly = useMemo(() => buildMonthlyBuckets(yearTxs, year, currency), [yearTxs, year, currency])
  const perWallet = useMemo(() => perWalletTotals(yearTxs, currency), [yearTxs, currency])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <PeriodNav label={String(year)} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} />
      </div>

      <ThreeNumbers totals={totals} currency={currency} />

      <div style={{ height: 18 }} />
      <SectionTitle kicker="12 meses" title="Tendencia anual" />
      <Card padding={16}>
        <YearBars data={monthly} currency={currency} />
      </Card>

      <div style={{ height: 18 }} />
      <SectionTitle kicker="Por categoría" title="Totales del año" />
      <Card padding={6}>
        {wallets.map((w, i) => {
          const stats = perWallet[w.id] ?? { ingresos: 0, egresos: 0 }
          const neto = stats.ingresos - stats.egresos
          return (
            <div
              key={w.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: 12,
                alignItems: 'center',
                padding: '12px 14px',
                borderBottom: i < wallets.length - 1 ? '0.5px solid var(--hairline)' : 'none',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16 }}>{w.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                +{formatMoneyRound(stats.ingresos, currency)}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-mute)' }}>
                −{formatMoneyRound(stats.egresos, currency)}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: neto >= 0 ? 'var(--accent)' : 'var(--ink)',
                  minWidth: 90,
                  textAlign: 'right',
                }}
              >
                {neto >= 0 ? '+' : '−'}
                {formatMoneyRound(Math.abs(neto), currency)}
              </div>
            </div>
          )
        })}
        {wallets.length === 0 && <EmptyHint text="Sin categorías." />}
      </Card>
    </div>
  )
}

interface MonthBucket {
  month: string /* YYYY-MM */
  ingresos: number
  egresos: number
}

function buildMonthlyBuckets(txs: Transaction[], year: number, currency: DisplayCurrency): MonthBucket[] {
  const months: MonthBucket[] = []
  for (let m = 1; m <= 12; m++) {
    months.push({ month: `${year}-${String(m).padStart(2, '0')}`, ingresos: 0, egresos: 0 })
  }
  for (const t of txs) {
    const m = t.date.slice(0, 7)
    const bucket = months.find((b) => b.month === m)
    if (!bucket) continue
    const v = t.snapshot?.[currency] ?? 0
    if (t.type === 'in') bucket.ingresos += v
    else bucket.egresos += v
  }
  return months
}

function YearBars({ data, currency }: { data: MonthBucket[]; currency: DisplayCurrency }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.ingresos, d.egresos)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130 }}>
      {data.map((d) => {
        const inH = (d.ingresos / max) * 90
        const outH = (d.egresos / max) * 90
        const label = d.month.slice(5)
        const neto = d.ingresos - d.egresos
        return (
          <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 90 }}>
              <div
                title={`Ingresos: ${formatMoneyRound(d.ingresos, currency)}`}
                style={{ width: 6, height: Math.max(2, inH), background: 'var(--accent)', borderRadius: 2 }}
              />
              <div
                title={`Egresos: ${formatMoneyRound(d.egresos, currency)}`}
                style={{ width: 6, height: Math.max(2, outH), background: 'var(--ink)', opacity: 0.55, borderRadius: 2 }}
              />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--ink-mute)' }}>{label}</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                color: neto >= 0 ? 'var(--accent)' : 'var(--ink-mute)',
              }}
            >
              {neto === 0 ? '·' : neto >= 0 ? '+' : '−'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── Ranking view ─────────────────────────── */

function RankingView({
  txs,
  wallets,
  currency,
}: {
  txs: Transaction[]
  wallets: Wallet[]
  currency: DisplayCurrency
}) {
  const months = useMemo(() => groupByMonth(txs, currency), [txs, currency])
  const monthEntries = useMemo(
    () =>
      Object.entries(months).map(([m, v]) => ({
        month: m,
        ingresos: v.ingresos,
        egresos: v.egresos,
        neto: v.ingresos - v.egresos,
      })),
    [months],
  )
  const topByIngresos = [...monthEntries].sort((a, b) => b.ingresos - a.ingresos).slice(0, 3)
  const topByNeto = [...monthEntries].sort((a, b) => b.neto - a.neto).slice(0, 3)
  const topByEgresos = [...monthEntries].sort((a, b) => b.egresos - a.egresos).slice(0, 3)

  const perWallet = useMemo(() => perWalletTotals(txs, currency), [txs, currency])
  const walletEntries = wallets.map((w) => ({
    wallet: w,
    ingresos: perWallet[w.id]?.ingresos ?? 0,
    egresos: perWallet[w.id]?.egresos ?? 0,
  }))
  const topCatIngresos = [...walletEntries].sort((a, b) => b.ingresos - a.ingresos).slice(0, 4)
  const topCatEgresos = [...walletEntries].sort((a, b) => b.egresos - a.egresos).slice(0, 4)

  if (monthEntries.length === 0) {
    return <EmptyHint text="Aún no hay suficiente historial para hacer ranking." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <RankList kicker="Top meses" title="Donde más ganaste" rows={topByIngresos} kind="ingresos" currency={currency} />
      <RankList kicker="Top meses" title="Mejor neto" rows={topByNeto} kind="neto" currency={currency} />
      <RankList kicker="Top meses" title="Donde más gastaste" rows={topByEgresos} kind="egresos" currency={currency} />
      <CategoryRank kicker="Top categorías" title="Más ingresos histórico" rows={topCatIngresos} kind="ingresos" currency={currency} />
      <CategoryRank kicker="Top categorías" title="Más egresos histórico" rows={topCatEgresos} kind="egresos" currency={currency} />
    </div>
  )
}

function groupByMonth(txs: Transaction[], currency: DisplayCurrency): Record<string, { ingresos: number; egresos: number }> {
  const out: Record<string, { ingresos: number; egresos: number }> = {}
  for (const t of txs) {
    const m = t.date.slice(0, 7)
    if (!out[m]) out[m] = { ingresos: 0, egresos: 0 }
    const v = t.snapshot?.[currency] ?? 0
    if (t.type === 'in') out[m].ingresos += v
    else out[m].egresos += v
  }
  return out
}

function RankList({
  kicker,
  title,
  rows,
  kind,
  currency,
}: {
  kicker: string
  title: string
  rows: Array<{ month: string; ingresos: number; egresos: number; neto: number }>
  kind: 'ingresos' | 'egresos' | 'neto'
  currency: DisplayCurrency
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--accent)',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--ink)',
          marginBottom: 10,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </div>
      <Card padding={6}>
        {rows.map((r, i) => {
          const value =
            kind === 'ingresos' ? r.ingresos : kind === 'egresos' ? r.egresos : r.neto
          const sign = kind === 'neto' ? (value >= 0 ? '+' : '−') : kind === 'ingresos' ? '+' : '−'
          const color =
            kind === 'ingresos' ? 'var(--accent)' : kind === 'egresos' ? 'var(--ink)' : value >= 0 ? 'var(--accent)' : 'var(--ink)'
          return (
            <div
              key={r.month}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderBottom: i < rows.length - 1 ? '0.5px solid var(--hairline)' : 'none',
              }}
            >
              <Badge n={i + 1} />
              <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>
                {formatMonthLong(r.month)}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color }}>
                {sign}
                {formatMoneyRound(Math.abs(value), currency)}
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

function CategoryRank({
  kicker,
  title,
  rows,
  kind,
  currency,
}: {
  kicker: string
  title: string
  rows: Array<{ wallet: Wallet; ingresos: number; egresos: number }>
  kind: 'ingresos' | 'egresos'
  currency: DisplayCurrency
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--accent)',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--ink)',
          marginBottom: 10,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </div>
      <Card padding={6}>
        {rows.map((r, i) => {
          const value = kind === 'ingresos' ? r.ingresos : r.egresos
          const sign = kind === 'ingresos' ? '+' : '−'
          const color = kind === 'ingresos' ? 'var(--accent)' : 'var(--ink)'
          return (
            <div
              key={r.wallet.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderBottom: i < rows.length - 1 ? '0.5px solid var(--hairline)' : 'none',
              }}
            >
              <Badge n={i + 1} />
              <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18 }}>
                {r.wallet.name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color }}>
                {sign}
                {formatMoneyRound(value, currency)}
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

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

function perWalletTotals(txs: Transaction[], currency: DisplayCurrency) {
  const acc: Record<string, { ingresos: number; egresos: number }> = {}
  for (const t of txs) {
    const v = t.snapshot?.[currency] ?? 0
    const slot = acc[t.walletId] ?? { ingresos: 0, egresos: 0 }
    if (t.type === 'in') slot.ingresos += v
    else slot.egresos += v
    acc[t.walletId] = slot
  }
  return acc
}

function ThreeNumbers({
  totals,
  currency,
}: {
  totals: { ingresos: number; egresos: number; neto: number }
  currency: DisplayCurrency
}) {
  const sign = totals.neto > 0 ? '+' : totals.neto < 0 ? '−' : ''
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <SmallStat kicker="Ingresos" value={`+${formatMoneyRound(totals.ingresos, currency)}`} accent />
      <SmallStat kicker="Egresos" value={`−${formatMoneyRound(totals.egresos, currency)}`} />
      <SmallStat
        kicker="Neto"
        value={`${sign}${formatMoneyRound(Math.abs(totals.neto), currency)}`}
        big
      />
    </div>
  )
}

function SmallStat({ kicker, value, accent, big }: { kicker: string; value: string; accent?: boolean; big?: boolean }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--hairline)', borderRadius: 16, padding: '12px 14px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-mute)', letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {kicker}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: big ? 20 : 16,
          fontWeight: big ? 600 : 500,
          color: accent ? 'var(--accent)' : 'var(--ink)',
          letterSpacing: -0.4,
          lineHeight: 1.1,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-mute)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: accent ? 'var(--accent)' : 'var(--ink)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function PeriodNav({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  const navBtn: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 99,
    border: '0.5px solid var(--hairline)',
    background: 'var(--bg-card)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button type="button" onClick={onPrev} aria-label="Anterior" style={navBtn}>
        <Icon name="chevron-left" size={14} color="var(--ink)" />
      </button>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 22,
          color: 'var(--ink)',
          minWidth: 140,
          textAlign: 'center',
          letterSpacing: -0.3,
        }}
      >
        {label}
      </div>
      <button type="button" onClick={onNext} aria-label="Siguiente" style={navBtn}>
        <Icon name="chevron-right" size={14} color="var(--ink)" />
      </button>
    </div>
  )
}

function Badge({ n }: { n: number }) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 99,
        background: n === 1 ? 'var(--accent)' : 'var(--bg-inset)',
        color: n === 1 ? '#FFF' : 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {n}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Card padding={20}>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-mute)' }}>
        {text}
      </div>
    </Card>
  )
}
