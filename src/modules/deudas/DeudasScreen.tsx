import { useEffect, useMemo, useState } from 'react'
import { Card, ModuleHeading, Pill, PrimaryButton, Progress, SectionTitle } from '@shared/components/primitives'
import { Modal } from '@shared/components/Modal'
import { TextField, SelectField } from '@shared/components/TextField'
import { Icon } from '@shared/icons/Icon'
import { CURRENCY_SYMBOLS, todayIso } from '@shared/utils/format'
import { useCollection } from '@shared/hooks/useFirestore'
import {
  billUrgency,
  createDebt,
  createFixedBill,
  daysUntil,
  debtUrgency,
  debtsQuery,
  deleteDebt,
  deleteFixedBill,
  fixedBillsQuery,
  listPayments,
  markFixedBillPaid,
  registerDebtPayment,
  updateDebt,
  type PaymentAllocation,
} from '@/data/repositories/debts'
import { walletsQuery } from '@/data/repositories/wallets'
import { accountsQuery } from '@/data/repositories/accounts'
import type { Account, BillFrequency, CurrencyCode, Debt, DebtDirection, DebtPayment, FixedBill, Wallet } from '@/data/types'
import { ACCOUNT_KIND_META } from '@modules/finanzas/accountKinds'

const FREQUENCY_LABELS: Record<BillFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  bimonthly: 'Cada 2 meses',
}

/** Splits a total amount equally across N category wallets, with rounding
 *  consistent with the currency's decimal precision. The leftover cents
 *  from rounding land on the last bucket so the sum always matches. */
function equalSplit(total: number, walletIds: string[], currency: CurrencyCode): PaymentAllocation[] {
  const n = walletIds.length
  if (n === 0) return []
  const decimals = currency === 'COP' || currency === 'PLN' ? 0 : 2
  const factor = Math.pow(10, decimals)
  const each = Math.round((total / n) * factor) / factor
  const out: PaymentAllocation[] = []
  for (let i = 0; i < n - 1; i++) out.push({ walletId: walletIds[i], amount: each })
  const remainder = Math.round((total - each * (n - 1)) * factor) / factor
  out.push({ walletId: walletIds[n - 1], amount: remainder })
  return out
}

/** Friendly relative label for an ISO date — used in lists. */
function relativeDateLabel(iso: string, today: string): string {
  const d = daysUntil(iso, today)
  if (d < 0) return `Vencido hace ${Math.abs(d)}d`
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Mañana'
  if (d <= 30) return `En ${d}d`
  return iso
}

export function DeudasScreen() {
  const [tab, setTab] = useState<DebtDirection>('iOwe')
  const debts = useCollection<Debt>(() => debtsQuery(), [])
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  const bills = useCollection<FixedBill>(() => fixedBillsQuery(), [])

  const [newDebtOpen, setNewDebtOpen] = useState(false)
  const [paymentOf, setPaymentOf] = useState<Debt | null>(null)
  const [detailOf, setDetailOf] = useState<Debt | null>(null)
  const [newBillOpen, setNewBillOpen] = useState(false)
  const [billPaymentOf, setBillPaymentOf] = useState<FixedBill | null>(null)

  const owedToMe = debts.filter((d) => d.direction === 'owedToMe')
  const iOwe = debts.filter((d) => d.direction === 'iOwe')
  const totalOwedToMe = owedToMe.reduce((s, d) => s + (d.total - d.paid), 0)
  const totalIOwe = iOwe.reduce((s, d) => s + (d.total - d.paid), 0)
  const list = tab === 'iOwe' ? iOwe : owedToMe
  const today = todayIso()

  /* In-app alert: count debts and bills that are urgent (≤1d) or overdue. */
  const urgent = useMemo(() => {
    const u: { kind: 'debt' | 'bill'; label: string; overdue: boolean }[] = []
    for (const d of debts) {
      if (d.paid >= d.total) continue
      const ur = debtUrgency(d, today)
      if (ur === 'urgent' || ur === 'overdue') {
        u.push({ kind: 'debt', label: d.person, overdue: ur === 'overdue' })
      }
    }
    for (const b of bills) {
      if (!b.dueDate) continue
      if (b.lastPaidMonth === today.slice(0, 7)) continue
      const ur = billUrgency(b, today)
      if (ur === 'urgent' || ur === 'overdue') {
        u.push({ kind: 'bill', label: b.name, overdue: ur === 'overdue' })
      }
    }
    return u
  }, [debts, bills, today])

  return (
    <div>
      <ModuleHeading kicker="Módulo 02" title="Deudas" subtitle="Lo que te deben y lo que debes — por persona." />

      {urgent.length > 0 && (
        <div style={{ padding: '16px 20px 0' }}>
          <div
            style={{
              padding: 14,
              borderRadius: 16,
              background: 'var(--accent-pale)',
              border: '0.5px solid var(--accent)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 99,
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="bell" size={14} color="#FFFFFF" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--accent)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                {urgent.some((u) => u.overdue) ? 'Vencidos' : 'Próximos a vencer'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--ink)',
                  lineHeight: 1.4,
                }}
              >
                {urgent
                  .slice(0, 3)
                  .map((u) => u.label)
                  .join(' · ')}
                {urgent.length > 3 ? ` +${urgent.length - 3} más` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '20px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Card
          padding={16}
          onClick={() => setTab('owedToMe')}
          style={{ background: tab === 'owedToMe' ? 'var(--accent)' : 'var(--bg-card)' }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: tab === 'owedToMe' ? 'var(--on-accent)' : 'var(--ink-mute)',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Te deben
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 26,
              color: tab === 'owedToMe' ? 'var(--on-accent)' : 'var(--ink)',
              marginTop: 6,
            }}
          >
            +${totalOwedToMe}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: tab === 'owedToMe' ? 'var(--on-accent)' : 'var(--ink-mute)',
              marginTop: 4,
              opacity: 0.7,
            }}
          >
            {owedToMe.length} personas
          </div>
        </Card>
        <Card
          padding={16}
          onClick={() => setTab('iOwe')}
          style={{ background: tab === 'iOwe' ? 'var(--ink)' : 'var(--bg-card)' }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: tab === 'iOwe' ? 'var(--bg)' : 'var(--ink-mute)',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Tú debes
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 26,
              color: tab === 'iOwe' ? 'var(--bg)' : 'var(--ink)',
              marginTop: 6,
            }}
          >
            −${totalIOwe}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              color: tab === 'iOwe' ? 'var(--bg)' : 'var(--ink-mute)',
              marginTop: 4,
              opacity: 0.7,
            }}
          >
            {iOwe.length} personas
          </div>
        </Card>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle
          kicker={tab === 'iOwe' ? 'Pagos pendientes' : 'Cobros pendientes'}
          title={tab === 'iOwe' ? 'A quién le debes' : 'Quién te debe'}
          action="+ Persona"
          onAction={() => setNewDebtOpen(true)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length === 0 ? (
            <Card padding={24}>
              <div style={{ textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
                {tab === 'iOwe' ? 'No tienes deudas.' : 'Nadie te debe nada ahora.'}
              </div>
            </Card>
          ) : (
            list.map((d) => {
              const remaining = d.total - d.paid
              const done = remaining === 0
              const urgency = debtUrgency(d, today)
              const isUrgent = urgency === 'urgent' || urgency === 'overdue'
              const dueLabel = d.due ? relativeDateLabel(d.due, today) : null
              return (
                <Card
                  key={d.id}
                  padding={16}
                  onClick={() => setDetailOf(d)}
                  style={
                    isUrgent && !done
                      ? { borderLeft: '3px solid var(--accent)' }
                      : undefined
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontStyle: 'italic',
                          fontSize: 18,
                          color: 'var(--ink)',
                          lineHeight: 1.1,
                        }}
                      >
                        {d.person}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          color: isUrgent && !done ? 'var(--accent)' : 'var(--ink-mute)',
                          marginTop: 4,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        {d.due ? `Vence ${d.due} · ${dueLabel}` : 'Sin fecha tope'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          color: 'var(--ink-mute)',
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        {done ? 'Saldada' : 'Restan'}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 22,
                          color: done ? 'var(--accent)' : 'var(--ink)',
                          marginTop: 2,
                        }}
                      >
                        {CURRENCY_SYMBOLS[d.currency]}
                        {remaining}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)' }}>
                        {CURRENCY_SYMBOLS[d.currency]}
                        {d.paid} de {CURRENCY_SYMBOLS[d.currency]}
                        {d.total}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>
                        {Math.round((d.paid / d.total) * 100)}%
                      </span>
                    </div>
                    <Progress value={d.paid} max={d.total} height={4} />
                  </div>
                  {!done && (
                    <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPaymentOf(d)
                        }}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 99,
                          background: 'var(--accent)',
                          color: 'var(--on-accent)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        + Registrar abono
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDetailOf(d)
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 99,
                          background: 'transparent',
                          border: '0.5px solid var(--hairline)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label="Ver detalle"
                      >
                        <Icon name="dots" size={14} color="var(--ink-mute)" />
                      </button>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Recordatorios fijos */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle
          kicker="Próximos pagos"
          title="Gastos fijos"
          action="+ Gasto"
          onAction={() => setNewBillOpen(true)}
        />
        <Card padding={6}>
          {bills.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-mute)', fontSize: 13 }}>
              Aún no registras gastos fijos.
            </div>
          ) : (
            bills.map((b, i) => {
              if (!b.dueDate) return null /* legacy doc still mid-migration */
              const u = billUrgency(b, today)
              const isUrgent = u === 'urgent' || u === 'overdue'
              const paidThisMonth = b.lastPaidMonth === today.slice(0, 7)
              const dueRel = relativeDateLabel(b.dueDate, today)
              return (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderBottom: i < bills.length - 1 ? '0.5px solid var(--hairline)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: isUrgent && !paidThisMonth ? 'var(--accent)' : 'var(--bg-inset)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name="bell"
                      size={14}
                      color={isUrgent && !paidThisMonth ? 'var(--on-accent)' : 'var(--ink)'}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--ink)' }}>{b.name}</div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: paidThisMonth ? 'var(--ink-mute)' : isUrgent ? 'var(--accent)' : 'var(--ink-mute)',
                        marginTop: 2,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      {paidThisMonth
                        ? 'Pagado · próximo ' + b.dueDate
                        : `${b.dueDate} · ${dueRel} · ${FREQUENCY_LABELS[b.frequency ?? 'monthly']}`}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 14,
                      color: 'var(--ink)',
                      textDecoration: paidThisMonth ? 'line-through' : 'none',
                      opacity: paidThisMonth ? 0.5 : 1,
                    }}
                  >
                    {CURRENCY_SYMBOLS[b.currency]}
                    {b.amount}
                  </div>
                  {!paidThisMonth && wallets.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBillPaymentOf(b)}
                      style={{
                        height: 28,
                        padding: '0 10px',
                        borderRadius: 99,
                        background: 'var(--ink)',
                        color: 'var(--bg)',
                        border: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      Pagar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar gasto "${b.name}"?`)) deleteFixedBill(b.id)
                    }}
                    aria-label="Eliminar"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon name="x" size={12} color="var(--ink-faint)" />
                  </button>
                </div>
              )
            })
          )}
        </Card>
      </div>

      <NewDebtModal open={newDebtOpen} onClose={() => setNewDebtOpen(false)} initialDirection={tab} />
      <PaymentModal debt={paymentOf} onClose={() => setPaymentOf(null)} />
      <DebtDetailModal
        debt={detailOf}
        onClose={() => setDetailOf(null)}
        onPay={(d) => {
          setDetailOf(null)
          setPaymentOf(d)
        }}
      />
      <NewBillModal open={newBillOpen} onClose={() => setNewBillOpen(false)} />
      <BillPaymentModal bill={billPaymentOf} onClose={() => setBillPaymentOf(null)} />
    </div>
  )
}

function NewDebtModal({
  open,
  onClose,
  initialDirection,
}: {
  open: boolean
  onClose: () => void
  initialDirection: DebtDirection
}) {
  const [person, setPerson] = useState('')
  const [direction, setDirection] = useState<DebtDirection>(initialDirection)
  const [total, setTotal] = useState('')
  const [paid, setPaid] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setPerson('')
    setTotal('')
    setPaid('')
    setDue('')
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    setError(null)
    const t = Number(total.replace(',', '.'))
    const p = Number(paid.replace(',', '.')) || 0
    if (!person.trim()) return setError('Ingresa el nombre o alias')
    if (!Number.isFinite(t) || t <= 0) return setError('El total debe ser > 0')
    try {
      await createDebt({
        person,
        direction,
        total: t,
        paid: p,
        currency: 'COP',
        due: due || undefined,
      })
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nueva deuda"
      footer={<PrimaryButton onClick={handleSave}>Guardar</PrimaryButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SelectField
          label="Tipo"
          value={direction}
          onChange={(v) => setDirection(v as DebtDirection)}
          options={[
            { value: 'iOwe', label: 'Yo le debo' },
            { value: 'owedToMe', label: 'Me debe' },
          ]}
        />
        <TextField label="Persona / alias" value={person} onChange={setPerson} placeholder="Persona 1" />
        <TextField label="Total" value={total} onChange={setTotal} type="text" inputMode="decimal" />
        <TextField
          label="Ya abonado (opcional)"
          value={paid}
          onChange={setPaid}
          type="text"
          inputMode="decimal"
        />
        <TextField label="Fecha tope (opcional)" value={due} onChange={setDue} type="date" />
        {error && (
          <div style={{ fontSize: 11, color: 'var(--accent)', padding: 10, borderRadius: 12, background: 'var(--accent-pale)' }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

function PaymentModal({ debt, onClose }: { debt: Debt | null; onClose: () => void }) {
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  const accounts = useCollection<Account>(() => accountsQuery(), [])
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const [accountId, setAccountId] = useState('')
  const [splits, setSplits] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  /* Re-prefill the per-category inputs every time amount/wallets change.
   *  The user can still override any value manually — we only auto-fill
   *  when they haven't started editing the splits yet. */
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (!debt) return
    const a = Number(amount.replace(',', '.'))
    if (!Number.isFinite(a) || a <= 0 || wallets.length === 0) return
    if (touched) return
    const ids = wallets.map((w) => w.id)
    const split = equalSplit(a, ids, debt.currency)
    const next: Record<string, string> = {}
    for (const s of split) next[s.walletId] = String(s.amount)
    setSplits(next)
  }, [amount, wallets, debt, touched])

  /* Reset on every fresh open. */
  useEffect(() => {
    if (debt) {
      setAmount('')
      setSplits({})
      setTouched(false)
      setError(null)
      setDate(todayIso())
      setAccountId(accounts[0]?.id ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debt?.id])

  /* Pick a default account once they load (the modal can open before the
     accounts query resolves). */
  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  if (!debt) return null

  const allocations: PaymentAllocation[] = wallets.map((w) => ({
    walletId: w.id,
    amount: Number((splits[w.id] ?? '0').replace(',', '.')) || 0,
  }))
  const splitSum = allocations.reduce((s, a) => s + a.amount, 0)
  const total = Number(amount.replace(',', '.')) || 0
  const mismatch = total > 0 && Math.abs(splitSum - total) > 0.01

  const updateSplit = (walletId: string, value: string) => {
    setTouched(true)
    setSplits((prev) => ({ ...prev, [walletId]: value }))
  }

  const distributeEqually = () => {
    if (total <= 0) return
    setTouched(false)
    const ids = wallets.map((w) => w.id)
    const split = equalSplit(total, ids, debt.currency)
    const next: Record<string, string> = {}
    for (const s of split) next[s.walletId] = String(s.amount)
    setSplits(next)
  }

  const handleSave = async () => {
    setError(null)
    if (!Number.isFinite(total) || total <= 0) return setError('Monto inválido')
    if (mismatch) return setError(`La suma del desglose (${splitSum}) no coincide con el total (${total})`)
    try {
      await registerDebtPayment({
        debtId: debt.id,
        amount: total,
        date,
        accountId: accountId || undefined,
        allocations: allocations.filter((a) => a.amount > 0),
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal
      open={Boolean(debt)}
      onClose={onClose}
      title={`Abono · ${debt.person}`}
      footer={<PrimaryButton onClick={handleSave}>Registrar abono</PrimaryButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Monto total" value={amount} onChange={setAmount} inputMode="decimal" placeholder="0" />
        <TextField label="Fecha" value={date} onChange={setDate} type="date" />

        <SelectField
          label={debt.direction === 'iOwe' ? 'Cuenta de donde sale' : 'Cuenta donde entra'}
          value={accountId}
          onChange={setAccountId}
          options={
            accounts.length > 0
              ? accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} · ${ACCOUNT_KIND_META[a.kind].short}`,
                }))
              : [{ value: '', label: 'Sin cuentas — se omite el movimiento' }]
          }
        />

        <AllocationsBlock
          wallets={wallets}
          splits={splits}
          updateSplit={updateSplit}
          distributeEqually={distributeEqually}
          splitSum={splitSum}
          total={total}
          mismatch={mismatch}
          currency={debt.currency}
          subtitle={
            debt.direction === 'iOwe'
              ? 'Cómo se reparte el egreso entre tus 4 categorías'
              : 'Cómo se reparte el ingreso entre tus 4 categorías'
          }
        />

        {error && (
          <div style={{ fontSize: 11, color: 'var(--accent)', padding: 10, borderRadius: 12, background: 'var(--accent-pale)' }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Reusable block of N inputs (one per category wallet) for splitting a
 *  total payment. Used by both PaymentModal (debts) and BillPaymentModal
 *  (fixed bills) — same UX in both. */
function AllocationsBlock({
  wallets,
  splits,
  updateSplit,
  distributeEqually,
  splitSum,
  total,
  mismatch,
  currency,
  subtitle,
}: {
  wallets: Wallet[]
  splits: Record<string, string>
  updateSplit: (walletId: string, value: string) => void
  distributeEqually: () => void
  splitSum: number
  total: number
  mismatch: boolean
  currency: CurrencyCode
  subtitle: string
}) {
  const sym = CURRENCY_SYMBOLS[currency]
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: 'var(--bg-inset)',
        border: '0.5px solid var(--hairline)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-mute)',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          Desglose por categoría
        </div>
        <button
          type="button"
          onClick={distributeEqually}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Dividir 25% c/u
        </button>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-mute)', lineHeight: 1.4 }}>
        {subtitle}
      </div>
      {wallets.map((w) => (
        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink)' }}>{w.name}</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              borderRadius: 10,
              border: '0.5px solid var(--hairline)',
              padding: '0 10px',
              minWidth: 130,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-mute)' }}>{sym}</span>
            <input
              type="text"
              inputMode="decimal"
              value={splits[w.id] ?? ''}
              onChange={(e) => updateSplit(w.id, e.target.value)}
              placeholder="0"
              style={{
                flex: 1,
                height: 36,
                padding: '0 6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--ink)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                outline: 'none',
                textAlign: 'right',
                minWidth: 0,
              }}
            />
          </div>
        </div>
      ))}
      <div
        style={{
          marginTop: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
        }}
      >
        <span style={{ color: 'var(--ink-mute)' }}>Suma del desglose</span>
        <span style={{ color: mismatch ? 'var(--accent)' : 'var(--ink)', fontWeight: 600 }}>
          {sym}
          {splitSum} {total > 0 && `/ ${sym}${total}`}
        </span>
      </div>
    </div>
  )
}

function NewBillModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(todayIso())
  const [frequency, setFrequency] = useState<BillFrequency>('monthly')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setAmount('')
    setDueDate(todayIso())
    setFrequency('monthly')
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = async () => {
    setError(null)
    const a = Number(amount.replace(',', '.'))
    if (!name.trim()) return setError('Ingresa un nombre')
    if (!Number.isFinite(a) || a <= 0) return setError('Monto inválido')
    if (!dueDate) return setError('Elige la próxima fecha de pago')
    try {
      await createFixedBill({
        name,
        amount: a,
        currency: 'COP',
        dueDate,
        frequency,
      })
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nuevo gasto fijo"
      footer={<PrimaryButton onClick={handleSave}>Guardar</PrimaryButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej: Arriendo Berlín" />
        <TextField label="Monto" value={amount} onChange={setAmount} inputMode="decimal" placeholder="0" />
        <TextField label="Próxima fecha de pago" value={dueDate} onChange={setDueDate} type="date" />
        <SelectField
          label="Frecuencia"
          value={frequency}
          onChange={(v) => setFrequency(v as BillFrequency)}
          options={(Object.keys(FREQUENCY_LABELS) as BillFrequency[]).map((f) => ({
            value: f,
            label: FREQUENCY_LABELS[f],
          }))}
        />
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            color: 'var(--ink-mute)',
            lineHeight: 1.5,
            padding: 10,
            background: 'var(--bg-inset)',
            borderRadius: 12,
          }}
        >
          Al marcarlo como pagado, la fecha avanzará automáticamente al siguiente periodo según la frecuencia elegida.
        </div>
        {error && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            {error}
          </Pill>
        )}
      </div>
    </Modal>
  )
}

/** Pay a fixed bill — same allocation UX as a debt payment. */
function BillPaymentModal({ bill, onClose }: { bill: FixedBill | null; onClose: () => void }) {
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  const accounts = useCollection<Account>(() => accountsQuery(), [])
  const [date, setDate] = useState(todayIso())
  const [accountId, setAccountId] = useState('')
  const [splits, setSplits] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /* Reset on reopen. */
  useEffect(() => {
    if (bill) {
      setDate(todayIso())
      setSplits({})
      setTouched(false)
      setError(null)
      setBusy(false)
      setAccountId(accounts[0]?.id ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill?.id])

  useEffect(() => {
    if (!accountId && accounts.length > 0) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  /* Pre-fill 25% per category whenever the bill or wallets change. */
  useEffect(() => {
    if (!bill || wallets.length === 0 || touched) return
    const ids = wallets.map((w) => w.id)
    const split = equalSplit(bill.amount, ids, bill.currency)
    const next: Record<string, string> = {}
    for (const s of split) next[s.walletId] = String(s.amount)
    setSplits(next)
  }, [bill, wallets, touched])

  if (!bill) return null

  const allocations: PaymentAllocation[] = wallets.map((w) => ({
    walletId: w.id,
    amount: Number((splits[w.id] ?? '0').replace(',', '.')) || 0,
  }))
  const splitSum = allocations.reduce((s, a) => s + a.amount, 0)
  const mismatch = Math.abs(splitSum - bill.amount) > 0.01

  const updateSplit = (walletId: string, value: string) => {
    setTouched(true)
    setSplits((prev) => ({ ...prev, [walletId]: value }))
  }

  const distributeEqually = () => {
    setTouched(false)
    const ids = wallets.map((w) => w.id)
    const split = equalSplit(bill.amount, ids, bill.currency)
    const next: Record<string, string> = {}
    for (const s of split) next[s.walletId] = String(s.amount)
    setSplits(next)
  }

  const handleSave = async () => {
    setError(null)
    if (mismatch) return setError(`La suma del desglose no coincide con ${CURRENCY_SYMBOLS[bill.currency]}${bill.amount}`)
    setBusy(true)
    try {
      await markFixedBillPaid(
        bill.id,
        allocations.filter((a) => a.amount > 0),
        date,
        accountId || undefined,
      )
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(bill)}
      onClose={onClose}
      title={`Pagar · ${bill.name}`}
      footer={
        <PrimaryButton onClick={handleSave} disabled={busy}>
          {busy ? 'Guardando…' : 'Marcar pagado'}
        </PrimaryButton>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            background: 'var(--accent-pale)',
            borderRadius: 16,
            padding: 14,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ink-mute)',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Monto
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 22,
              color: 'var(--accent)',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {CURRENCY_SYMBOLS[bill.currency]}
            {bill.amount}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-mute)', marginTop: 6 }}>
            Próxima vez: {advanceDateLabel(bill.dueDate, bill.frequency ?? 'monthly')}
          </div>
        </div>

        <TextField label="Fecha del pago" value={date} onChange={setDate} type="date" />

        <SelectField
          label="Cuenta de donde sale"
          value={accountId}
          onChange={setAccountId}
          options={
            accounts.length > 0
              ? accounts.map((a) => ({
                  value: a.id,
                  label: `${a.name} · ${ACCOUNT_KIND_META[a.kind].short}`,
                }))
              : [{ value: '', label: 'Sin cuentas — se omite el movimiento' }]
          }
        />

        <AllocationsBlock
          wallets={wallets}
          splits={splits}
          updateSplit={updateSplit}
          distributeEqually={distributeEqually}
          splitSum={splitSum}
          total={bill.amount}
          mismatch={mismatch}
          currency={bill.currency}
          subtitle="Cómo se reparte el egreso entre tus 4 categorías"
        />

        {error && (
          <div style={{ fontSize: 11, color: 'var(--accent)', padding: 10, borderRadius: 12, background: 'var(--accent-pale)' }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

function advanceDateLabel(dueDate: string, freq: BillFrequency): string {
  const [y, m, d] = dueDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  switch (freq) {
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7)
      break
    case 'biweekly':
      date.setUTCDate(date.getUTCDate() + 14)
      break
    case 'monthly':
      date.setUTCMonth(date.getUTCMonth() + 1)
      break
    case 'bimonthly':
      date.setUTCMonth(date.getUTCMonth() + 2)
      break
  }
  return date.toISOString().slice(0, 10)
}

/** Detail modal for a debt — shows full info, payments history, edit and
 *  delete actions. Opened by tapping a debt card in the list. */
function DebtDetailModal({
  debt,
  onClose,
  onPay,
}: {
  debt: Debt | null
  onClose: () => void
  onPay: (d: Debt) => void
}) {
  const [payments, setPayments] = useState<DebtPayment[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!debt) return
    let mounted = true
    void listPayments(debt.id).then((rows) => {
      if (mounted) setPayments(rows)
    })
    return () => {
      mounted = false
    }
  }, [debt?.id, debt?.paid])

  useEffect(() => {
    if (debt) {
      setConfirmDelete(false)
      setError(null)
      setBusy(false)
    }
  }, [debt?.id])

  if (!debt) return null

  const remaining = debt.total - debt.paid
  const done = remaining <= 0
  const sym = CURRENCY_SYMBOLS[debt.currency]

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteDebt(debt.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        open={Boolean(debt) && !editOpen}
        onClose={onClose}
        title={debt.person}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Hero stats */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'var(--bg-inset)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--ink-mute)',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {done ? 'Saldada' : debt.direction === 'iOwe' ? 'Tú debes' : 'Te deben'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 26,
                color: done ? 'var(--accent)' : 'var(--ink)',
                fontWeight: 600,
              }}
            >
              {sym}
              {remaining}
            </div>
            <div style={{ marginTop: 6 }}>
              <Progress value={debt.paid} max={debt.total} height={4} />
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-mute)',
              }}
            >
              {sym}
              {debt.paid} de {sym}
              {debt.total} ({Math.round((debt.paid / debt.total) * 100)}%)
            </div>
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <DetailLine label="Tipo" value={debt.direction === 'iOwe' ? 'Yo debo' : 'Me deben'} />
            <DetailLine label="Moneda" value={debt.currency} />
            {debt.due && <DetailLine label="Vence" value={debt.due} />}
            {debt.notes && <DetailLine label="Notas" value={debt.notes} />}
          </div>

          {/* Payments history */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-mute)',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                margin: '6px 0 8px',
              }}
            >
              Historial ({payments.length})
            </div>
            {payments.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  textAlign: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--ink-mute)',
                  background: 'var(--bg-inset)',
                  borderRadius: 12,
                }}
              >
                Sin abonos registrados.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg-inset)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {payments.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderBottom: i < payments.length - 1 ? '0.5px solid var(--hairline)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--ink-mute)',
                      }}
                    >
                      {p.date}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                      +{sym}
                      {p.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!confirmDelete ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!done && (
                <PrimaryButton onClick={() => onPay(debt)}>+ Registrar abono</PrimaryButton>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 99,
                    background: 'var(--bg-card)',
                    color: 'var(--ink)',
                    border: '0.5px solid var(--hairline)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 99,
                    background: 'transparent',
                    color: 'var(--accent)',
                    border: '0.5px solid var(--accent)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Icon name="trash" size={13} color="var(--accent)" /> Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: 'var(--accent-pale)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: 'var(--accent)',
                  textAlign: 'center',
                }}
              >
                ¿Eliminar la deuda y todo su historial? No se puede deshacer.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 99,
                    background: 'var(--bg-card)',
                    color: 'var(--ink)',
                    border: '0.5px solid var(--hairline)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 99,
                    background: 'var(--accent)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: busy ? 'wait' : 'pointer',
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ fontSize: 11, color: 'var(--accent)', padding: 10, borderRadius: 12, background: 'var(--accent-pale)' }}>
              {error}
            </div>
          )}
        </div>
      </Modal>

      <EditDebtModal
        debt={editOpen ? debt : null}
        onClose={() => setEditOpen(false)}
      />
    </>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        padding: '6px 2px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-mute)',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          minWidth: 80,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          color: 'var(--ink)',
          textAlign: 'right',
          flex: 1,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function EditDebtModal({ debt, onClose }: { debt: Debt | null; onClose: () => void }) {
  const [person, setPerson] = useState('')
  const [direction, setDirection] = useState<DebtDirection>('iOwe')
  const [total, setTotal] = useState('')
  const [due, setDue] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!debt) return
    setPerson(debt.person)
    setDirection(debt.direction)
    setTotal(String(debt.total))
    setDue(debt.due ?? '')
    setNotes(debt.notes ?? '')
    setError(null)
    setBusy(false)
  }, [debt?.id])

  if (!debt) return null

  const handleSave = async () => {
    setError(null)
    const t = Number(total.replace(',', '.'))
    if (!person.trim()) return setError('Ingresa el nombre')
    if (!Number.isFinite(t) || t <= 0) return setError('El total debe ser > 0')
    if (t < debt.paid) return setError(`Total no puede ser menor a lo ya abonado (${debt.paid})`)
    setBusy(true)
    try {
      const patch: Partial<Debt> = {
        person: person.trim(),
        direction,
        total: t,
        due: due || undefined,
        notes: notes.trim() || undefined,
      }
      await updateDebt(debt.id, patch)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(debt)}
      onClose={onClose}
      title="Editar deuda"
      footer={
        <PrimaryButton onClick={handleSave} disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </PrimaryButton>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SelectField
          label="Tipo"
          value={direction}
          onChange={(v) => setDirection(v as DebtDirection)}
          options={[
            { value: 'iOwe', label: 'Yo le debo' },
            { value: 'owedToMe', label: 'Me debe' },
          ]}
        />
        <TextField label="Persona / alias" value={person} onChange={setPerson} />
        <TextField label="Total" value={total} onChange={setTotal} inputMode="decimal" />
        <TextField label="Fecha tope (opcional)" value={due} onChange={setDue} type="date" />
        <TextField label="Notas (opcional)" value={notes} onChange={setNotes} />
        {error && (
          <div style={{ fontSize: 11, color: 'var(--accent)', padding: 10, borderRadius: 12, background: 'var(--accent-pale)' }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
