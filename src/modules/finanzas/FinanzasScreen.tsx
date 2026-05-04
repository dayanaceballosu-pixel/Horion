import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { transactionsForMonthQuery, walletsQuery } from '@/data/repositories/wallets'
import { accountsQuery } from '@/data/repositories/accounts'
import { getRate } from '@/data/repositories/fx'
import type { Account, DisplayCurrency, Transaction, Wallet } from '@/data/types'
import { useCollection } from '@shared/hooks/useFirestore'
import { useDisplayCurrency } from '@shared/hooks/useDisplayCurrency'
import { ActionChip, Card, ModuleHeading, SectionTitle } from '@shared/components/primitives'
import { CurrencyToggle } from '@shared/components/CurrencyToggle'
import { Icon } from '@shared/icons/Icon'
import { useThemeStore } from '@shared/theme/useTheme'
import { formatMoneyRound, formatMonthLong, isoMonth as todayIsoMonth, shiftMonth } from '@shared/utils/format'
import { TransactionModal } from './TransactionModal'
import { TransactionActionsModal } from './TransactionActionsModal'
import { TransferModal } from './TransferModal'
import { CuentaEditModal } from './CuentaEditModal'
import { AccountCard } from './AccountCard'
import { WalletCard } from './WalletCard'

function asDisplay(c: Account['currency']): DisplayCurrency {
  return c === 'USD' || c === 'EUR' ? c : 'COP'
}

export function FinanzasScreen() {
  const [, navigate] = useLocation()
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  const accounts = useCollection<Account>(() => accountsQuery(), [])
  const { currency } = useDisplayCurrency()
  const hidePrivate = useThemeStore((s) => s.hidePrivate)

  const [selectedMonth, setSelectedMonth] = useState<string>(todayIsoMonth())
  const txs = useCollection<Transaction>(() => transactionsForMonthQuery(selectedMonth), [selectedMonth])

  const [activeTab, setActiveTab] = useState<string>('all')
  const [txModal, setTxModal] = useState<'in' | 'out' | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  /* Total across accounts, normalized to the user's display currency. */
  const [convertedBalances, setConvertedBalances] = useState<Record<string, number>>({})
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: Record<string, number> = {}
      for (const a of accounts) {
        const native = asDisplay(a.currency)
        if (native === currency) {
          next[a.id] = a.balance
          continue
        }
        const rate = await getRate(native, currency)
        next[a.id] = a.balance * rate
      }
      if (!cancelled) setConvertedBalances(next)
    })()
    return () => {
      cancelled = true
    }
  }, [accounts, currency])
  const totalAccounts = useMemo(
    () => accounts.reduce((s, a) => s + (convertedBalances[a.id] ?? a.balance), 0),
    [accounts, convertedBalances],
  )

  const totals = useMemo(() => totalsFor(txs, currency), [txs, currency])
  const perWallet = useMemo(() => perWalletTotals(txs, currency), [txs, currency])
  const filtered = useMemo(() => {
    /* Drop transfer legs from the global movements list — they're book-keeping
       between accounts, not income/expense. They stay visible inside each
       account's detail screen where they actually mean something. */
    const sorted = [...txs]
      .filter((t) => t.source !== 'transfer')
      .sort((a, b) => b.createdAt - a.createdAt)
    return activeTab === 'all' ? sorted : sorted.filter((r) => r.walletId === activeTab)
  }, [txs, activeTab])

  return (
    <div>
      <ModuleHeading
        kicker="Módulo 01"
        title="Finanzas"
        subtitle="Tu plata, día a día."
      />

      {/* Accounts strip — saldo total + cards horizontales */}
      <div data-tutorial="accounts-strip" style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 10,
            paddingRight: 4,
          }}
        >
          <div data-tutorial="total-disponible">
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--accent)',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Total disponible
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                fontWeight: 600,
                color: 'var(--ink)',
                letterSpacing: -0.6,
                marginTop: 2,
              }}
            >
              {hidePrivate ? '••••' : formatMoneyRound(totalAccounts, currency)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/cuentas')}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--accent)',
              padding: 0,
            }}
          >
            Gestionar →
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 6,
            marginRight: -20,
            paddingRight: 20,
            scrollSnapType: 'x mandatory',
          }}
        >
          {accounts.map((a) => (
            <div key={a.id} style={{ scrollSnapAlign: 'start' }}>
              <AccountCard
                account={a}
                hidePrivate={hidePrivate}
                onClick={() => navigate(`/cuenta/${a.id}`)}
              />
            </div>
          ))}
          <button
            type="button"
            data-tutorial="new-account"
            onClick={() => setShowCreateAccount(true)}
            style={{
              flex: '0 0 auto',
              width: 120,
              height: 108,
              borderRadius: 18,
              border: '0.5px dashed var(--hairline)',
              background: 'var(--bg-card)',
              color: 'var(--ink-mute)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              scrollSnapAlign: 'start',
            }}
          >
            <Icon name="plus" size={18} color="var(--ink-mute)" />
            Nueva cuenta
          </button>
        </div>
      </div>

      {/* Month nav + currency toggle */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <MonthNav month={selectedMonth} onChange={setSelectedMonth} />
          <CurrencyToggle size="sm" />
        </div>

        {/* Three numbers: ingresos / egresos / neto */}
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 10,
          }}
        >
          <StatBlock kicker="Ingresos" value={`+${maskedMoney(totals.ingresos, currency, hidePrivate)}`} accent />
          <StatBlock kicker="Egresos" value={`−${maskedMoney(totals.egresos, currency, hidePrivate)}`} />
          <StatBlock
            kicker="Neto del mes"
            value={hidePrivate ? '••••' : signed(totals.neto, currency)}
            big
          />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 8 }}>
        <div data-tutorial="action-income" style={{ flex: 1, display: 'flex' }}>
          <ActionChip icon="arrow-down" label="Ingreso" primary onClick={() => setTxModal('in')} />
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          <ActionChip icon="arrow-up" label="Egreso" onClick={() => setTxModal('out')} />
        </div>
        <div data-tutorial="action-transfer" style={{ flex: 1, display: 'flex' }}>
          <ActionChip icon="arrow-right" label="Transferir" onClick={() => setShowTransfer(true)} />
        </div>
      </div>

      {/* Category cards */}
      <div data-tutorial="categories-section" style={{ padding: '20px 20px 0' }}>
        <SectionTitle kicker={`${wallets.length} categorías`} title="Cada peso en su lugar" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {wallets.map((w, i) => {
            const stats = perWallet[w.id] ?? { ingresos: 0, egresos: 0 }
            return (
              <WalletCard
                key={w.id}
                wallet={w}
                index={i}
                hidePrivate={hidePrivate}
                ingresos={stats.ingresos}
                egresos={stats.egresos}
                currency={currency}
                onClick={() => navigate(`/billetera/${w.id}`)}
              />
            )
          })}
          {wallets.length === 0 && (
            <Card padding={18}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-mute)' }}>
                Aún no tienes categorías. Las predeterminadas se crean al primer uso.
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Filter tabs + month list */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="Movimientos" title={`${formatMonthLong(selectedMonth)}`} />
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 12,
          }}
        >
          {[{ id: 'all', label: 'Todo' }, ...wallets.map((w) => ({ id: w.id, label: w.name }))].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 14px',
                borderRadius: 99,
                background: activeTab === t.id ? 'var(--ink)' : 'var(--bg-card)',
                color: activeTab === t.id ? 'var(--bg)' : 'var(--ink)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 500,
                border: activeTab === t.id ? 'none' : '0.5px solid var(--hairline)',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card padding={6}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--ink-mute)',
              }}
            >
              Sin movimientos en {formatMonthLong(selectedMonth).toLowerCase()}.
            </div>
          ) : (
            filtered.map((r, i) => (
              <TxRow
                key={r.id}
                tx={r}
                isLast={i === filtered.length - 1}
                currency={currency}
                wallets={wallets}
                onClick={() => setSelectedTx(r)}
              />
            ))
          )}
        </Card>
      </div>

      <TransactionModal
        open={txModal !== null}
        onClose={() => setTxModal(null)}
        wallets={wallets}
        accounts={accounts}
        type={txModal ?? 'in'}
      />

      <TransferModal
        open={showTransfer}
        accounts={accounts}
        onClose={() => setShowTransfer(false)}
      />

      <CuentaEditModal open={showCreateAccount} onClose={() => setShowCreateAccount(false)} />

      <TransactionActionsModal
        tx={selectedTx}
        wallets={wallets}
        accounts={accounts}
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

function perWalletTotals(txs: Transaction[], currency: DisplayCurrency) {
  const acc: Record<string, { ingresos: number; egresos: number }> = {}
  for (const t of txs) {
    if (t.source === 'transfer' || !t.walletId) continue
    const v = t.snapshot?.[currency] ?? 0
    const slot = acc[t.walletId] ?? { ingresos: 0, egresos: 0 }
    if (t.type === 'in') slot.ingresos += v
    else slot.egresos += v
    acc[t.walletId] = slot
  }
  return acc
}

function maskedMoney(n: number, currency: DisplayCurrency, hide: boolean): string {
  return hide ? '••••' : formatMoneyRound(n, currency)
}

function signed(n: number, currency: DisplayCurrency): string {
  if (n === 0) return formatMoneyRound(0, currency)
  return `${n > 0 ? '+' : '−'}${formatMoneyRound(Math.abs(n), currency)}`
}

function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Mes anterior"
        style={navBtnStyle()}
      >
        <Icon name="chevron-left" size={14} color="var(--ink)" />
      </button>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 20,
          color: 'var(--ink)',
          minWidth: 130,
          textAlign: 'center',
          letterSpacing: -0.3,
        }}
      >
        {formatMonthLong(month)}
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Mes siguiente"
        style={navBtnStyle()}
      >
        <Icon name="chevron-right" size={14} color="var(--ink)" />
      </button>
    </div>
  )
}

function navBtnStyle(): React.CSSProperties {
  return {
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
}

function StatBlock({ kicker, value, accent, big }: { kicker: string; value: string; accent?: boolean; big?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 16,
        padding: '12px 14px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--ink-mute)',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
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

function TxRow({
  tx,
  isLast,
  currency,
  wallets,
  onClick,
}: {
  tx: Transaction
  isLast: boolean
  currency: DisplayCurrency
  wallets: Wallet[]
  onClick?: () => void
}) {
  const wallet = wallets.find((w) => w.id === tx.walletId)
  const value = tx.snapshot?.[currency] ?? 0
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderBottom: isLast ? 'none' : '0.5px solid var(--hairline)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: tx.type === 'in' ? 'var(--accent-pale)' : 'var(--bg-inset)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name={tx.type === 'in' ? 'arrow-down' : 'arrow-up'}
          size={16}
          color={tx.type === 'in' ? 'var(--accent)' : 'var(--ink)'}
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
          {tx.title}
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
          {tx.date}
          {wallet ? ` · ${wallet.name}` : ''}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          fontWeight: 500,
          color: tx.type === 'in' ? 'var(--accent)' : 'var(--ink)',
          textAlign: 'right',
        }}
      >
        {tx.type === 'in' ? '+' : '−'}
        {formatMoneyRound(value, currency)}
      </div>
    </div>
  )
}
