import { useMemo, useState } from 'react'
import { useLocation, useParams } from 'wouter'
import {
  ActionChip,
  BackBar,
  Card,
  ModuleHeading,
  SectionTitle,
} from '@shared/components/primitives'
import { Icon } from '@shared/icons/Icon'
import { transactionsQuery, walletsQuery } from '@/data/repositories/wallets'
import { accountsQuery, recomputeAccountBalance } from '@/data/repositories/accounts'
import { useDoc, useCollection } from '@shared/hooks/useFirestore'
import { userSubDoc } from '@/data/firebase'
import { useAuthStore } from '@/data/auth'
import type {
  Account,
  DisplayCurrency,
  Transaction,
  Wallet,
} from '@/data/types'
import { useThemeStore } from '@shared/theme/useTheme'
import { formatMoneyRound, formatMonthLong, isoMonth as todayIsoMonth, shiftMonth } from '@shared/utils/format'
import { TransactionModal } from './TransactionModal'
import { TransactionActionsModal } from './TransactionActionsModal'
import { TransferModal } from './TransferModal'
import { AdjustBalanceModal } from './AdjustBalanceModal'
import { CuentaEditModal } from './CuentaEditModal'
import { ACCOUNT_KIND_META } from './accountKinds'

function asDisplay(c: Account['currency']): DisplayCurrency {
  return c === 'USD' || c === 'EUR' ? c : 'COP'
}

export function CuentaDetalleScreen() {
  const params = useParams<{ id: string }>()
  const [, navigate] = useLocation()
  const uid = useAuthStore((s) => s.user?.uid)

  const account = useDoc<Account>(
    () => (uid && params.id ? userSubDoc(uid, 'accounts', params.id) : null),
    [uid, params.id],
  )
  const accounts = useCollection<Account>(() => accountsQuery(), [])
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  /* Cap to 500 — same convention as the category drilldown. We slice by month
     client-side because navigating between months should feel instant. */
  const allTxs = useCollection<Transaction>(
    () => (params.id ? transactionsQuery({ limit: 500 }) : null),
    [params.id],
  )

  const hidePrivate = useThemeStore((s) => s.hidePrivate)
  const [selectedMonth, setSelectedMonth] = useState<string>(todayIsoMonth())
  const [txModal, setTxModal] = useState<'in' | 'out' | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [recomputing, setRecomputing] = useState(false)

  const accountTxs = useMemo(
    () => allTxs.filter((t) => t.accountId === params.id),
    [allTxs, params.id],
  )

  const monthTxs = useMemo(
    () =>
      accountTxs
        .filter((t) => t.date.startsWith(selectedMonth))
        .sort((a, b) => b.createdAt - a.createdAt),
    [accountTxs, selectedMonth],
  )

  const display = account ? asDisplay(account.currency) : 'COP'
  const monthTotals = useMemo(() => totalsFor(monthTxs, display), [monthTxs, display])

  if (!account) {
    return (
      <div>
        <BackBar label="Finanzas" onBack={() => navigate('/finanzas')} />
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-mute)' }}>
          Cuenta no encontrada
        </div>
      </div>
    )
  }

  const meta = ACCOUNT_KIND_META[account.kind]
  const bg = account.color ?? meta.bg
  const fg = meta.fg

  const onRecompute = async () => {
    setRecomputing(true)
    try {
      await recomputeAccountBalance(account.id)
    } finally {
      setRecomputing(false)
    }
  }

  return (
    <div>
      <BackBar label="Finanzas" onBack={() => navigate('/finanzas')} />
      <ModuleHeading kicker="Cuenta" title={account.name} subtitle={meta.label} />

      {/* Hero balance card */}
      <div style={{ padding: '16px 20px 0' }}>
        <div
          style={{
            background: bg,
            color: fg,
            borderRadius: 26,
            padding: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name={meta.icon} size={16} color={fg} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  opacity: 0.7,
                }}
              >
                Saldo · {display}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowEdit(true)}
              aria-label="Editar cuenta"
              style={{
                width: 32, height: 32, borderRadius: 99,
                background: 'rgba(255,255,255,0.10)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="edit" size={14} color={fg} />
            </button>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 40,
              fontWeight: 600,
              letterSpacing: -1,
              marginTop: 10,
              wordBreak: 'break-all',
            }}
          >
            {hidePrivate ? '••••' : formatMoneyRound(account.balance, display)}
          </div>

          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                opacity: 0.7,
                letterSpacing: 0.4,
              }}
            >
              Inicial: {formatMoneyRound(account.initialBalance, display)}
            </div>
            <button
              type="button"
              onClick={onRecompute}
              disabled={recomputing}
              style={{
                padding: '6px 12px',
                borderRadius: 99,
                background: 'rgba(255,255,255,0.10)',
                color: fg,
                border: 'none',
                cursor: recomputing ? 'wait' : 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                opacity: recomputing ? 0.6 : 1,
              }}
            >
              {recomputing ? 'Recalculando…' : 'Recalcular'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 8 }}>
        <ActionChip icon="arrow-down" label="Ingreso" primary onClick={() => setTxModal('in')} />
        <ActionChip icon="arrow-up" label="Egreso" onClick={() => setTxModal('out')} />
      </div>
      <div style={{ padding: '8px 20px 0', display: 'flex', gap: 8 }}>
        <ActionChip icon="arrow-right" label="Transferir" onClick={() => setShowTransfer(true)} />
        <ActionChip icon="settings" label="Ajustar saldo" onClick={() => setShowAdjust(true)} />
      </div>

      {/* Month nav + month totals */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle kicker="Movimientos" title={formatMonthLong(selectedMonth)} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <MonthNav month={selectedMonth} onChange={setSelectedMonth} />
          <div
            style={{
              display: 'flex',
              gap: 14,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
            }}
          >
            <span style={{ color: 'var(--accent)' }}>
              +{formatMoneyRound(monthTotals.ingresos, display)}
            </span>
            <span style={{ color: 'var(--ink-mute)' }}>
              −{formatMoneyRound(monthTotals.egresos, display)}
            </span>
          </div>
        </div>

        <Card padding={6}>
          {monthTxs.length === 0 ? (
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
            monthTxs.map((tx, i) => (
              <TxRow
                key={tx.id}
                tx={tx}
                isLast={i === monthTxs.length - 1}
                wallets={wallets}
                display={display}
                onClick={() => setSelectedTx(tx)}
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
        initialAccountId={account.id}
      />

      <TransferModal
        open={showTransfer}
        accounts={accounts}
        initialFromId={account.id}
        onClose={() => setShowTransfer(false)}
      />

      <AdjustBalanceModal
        open={showAdjust}
        account={showAdjust ? account : null}
        onClose={() => setShowAdjust(false)}
      />

      <CuentaEditModal
        open={showEdit}
        account={account}
        onClose={() => setShowEdit(false)}
      />

      <TransactionActionsModal
        tx={selectedTx}
        wallets={wallets}
        accounts={accounts}
        currency={display}
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
  return { ingresos, egresos }
}

function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const navBtn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 99,
    border: '0.5px solid var(--hairline)',
    background: 'var(--bg-card)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button type="button" aria-label="Mes anterior" onClick={() => onChange(shiftMonth(month, -1))} style={navBtn}>
        <Icon name="chevron-left" size={12} color="var(--ink)" />
      </button>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 14,
          color: 'var(--ink)',
          minWidth: 100,
          textAlign: 'center',
        }}
      >
        {formatMonthLong(month)}
      </div>
      <button type="button" aria-label="Mes siguiente" onClick={() => onChange(shiftMonth(month, 1))} style={navBtn}>
        <Icon name="chevron-right" size={12} color="var(--ink)" />
      </button>
    </div>
  )
}

function TxRow({
  tx,
  isLast,
  wallets,
  display,
  onClick,
}: {
  tx: Transaction
  isLast: boolean
  wallets: Wallet[]
  display: DisplayCurrency
  onClick: () => void
}) {
  const isTransfer = tx.source === 'transfer'
  const isAdjustment = tx.source === 'adjustment'
  const wallet = wallets.find((w) => w.id === tx.walletId)
  const value = tx.snapshot?.[display] ?? 0
  const isOut = tx.type === 'out'

  const iconName = isTransfer ? 'arrow-right' : isAdjustment ? 'settings' : isOut ? 'arrow-up' : 'arrow-down'
  const iconBg = isTransfer
    ? 'var(--bg-inset)'
    : isAdjustment
      ? 'var(--bg-inset)'
      : isOut
        ? 'var(--bg-inset)'
        : 'var(--accent-pale)'
  const iconColor = isTransfer
    ? 'var(--ink-mute)'
    : isAdjustment
      ? 'var(--ink-mute)'
      : isOut
        ? 'var(--ink)'
        : 'var(--accent)'

  return (
    <div
      onClick={onClick}
      role="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderBottom: isLast ? 'none' : '0.5px solid var(--hairline)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 12, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name={iconName} size={16} color={iconColor} />
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
          {isTransfer ? ' · TRANSFERENCIA' : isAdjustment ? ' · AJUSTE' : wallet ? ` · ${wallet.name}` : ''}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          fontWeight: 500,
          color: isOut ? 'var(--ink)' : 'var(--accent)',
          textAlign: 'right',
        }}
      >
        {isOut ? '−' : '+'}
        {formatMoneyRound(value, display)}
      </div>
    </div>
  )
}
