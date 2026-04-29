import { useState } from 'react'
import { useLocation } from 'wouter'
import { BackBar, Card, ModuleHeading, Pill, PrimaryButton, Progress, SectionTitle } from '@shared/components/primitives'
import { Modal } from '@shared/components/Modal'
import { TextField, SelectField } from '@shared/components/TextField'
import { Icon } from '@shared/icons/Icon'
import { CURRENCY_SYMBOLS, dayOfMonth, todayIso } from '@shared/utils/format'
import { useCollection, useDoc } from '@shared/hooks/useFirestore'
import { settingsRef } from '@/data/repositories/settings'
import {
  billUrgency,
  createDebt,
  createFixedBill,
  debtsQuery,
  deleteDebt,
  deleteFixedBill,
  fixedBillsQuery,
  markFixedBillPaid,
  registerDebtPayment,
} from '@/data/repositories/debts'
import { walletsQuery } from '@/data/repositories/wallets'
import type { Debt, DebtDirection, FixedBill, Settings, Wallet } from '@/data/types'

export function DeudasScreen() {
  const [, navigate] = useLocation()
  const [tab, setTab] = useState<DebtDirection>('iOwe')
  const debts = useCollection<Debt>(() => debtsQuery(), [])
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  const bills = useCollection<FixedBill>(() => fixedBillsQuery(), [])

  const [newDebtOpen, setNewDebtOpen] = useState(false)
  const [paymentOf, setPaymentOf] = useState<Debt | null>(null)
  const [newBillOpen, setNewBillOpen] = useState(false)

  const owedToMe = debts.filter((d) => d.direction === 'owedToMe')
  const iOwe = debts.filter((d) => d.direction === 'iOwe')
  const totalOwedToMe = owedToMe.reduce((s, d) => s + (d.total - d.paid), 0)
  const totalIOwe = iOwe.reduce((s, d) => s + (d.total - d.paid), 0)
  const list = tab === 'iOwe' ? iOwe : owedToMe
  const today = dayOfMonth()

  return (
    <div>
      <BackBar label="Finanzas" onBack={() => navigate('/finanzas')} />
      <ModuleHeading kicker="Módulo 02" title="Deudas" subtitle="Lo que te deben y lo que debes — por persona." />

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
            +€{totalOwedToMe}
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
            −€{totalIOwe}
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
              return (
                <Card key={d.id} padding={16}>
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
                          color: 'var(--ink-mute)',
                          marginTop: 4,
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        {d.due ? `Vence · ${d.due}` : 'Sin fecha tope'}
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
                        onClick={() => setPaymentOf(d)}
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
                        onClick={() => {
                          if (confirm(`¿Eliminar deuda de ${d.person}?`)) deleteDebt(d.id)
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 99,
                          background: 'transparent',
                          border: '0.5px solid var(--hairline)',
                          cursor: 'pointer',
                        }}
                        aria-label="Eliminar"
                      >
                        <Icon name="trash" size={14} color="var(--ink-mute)" />
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
              const u = billUrgency(b, today)
              const isUrgent = u === 'urgent' || u === 'overdue'
              const paidThisMonth = b.lastPaidMonth === todayIso().slice(0, 7)
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
                      {paidThisMonth ? 'Pagado este mes' : `Día ${b.dueDay} · ${u === 'overdue' ? 'Vencido' : u === 'urgent' ? 'Pronto' : 'Programado'}`}
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
                      onClick={() => markFixedBillPaid(b.id, b.walletId ?? wallets[0].id, todayIso())}
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
      <NewBillModal open={newBillOpen} onClose={() => setNewBillOpen(false)} />
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
  const settings = useDoc<Settings>(() => settingsRef(), [])

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
        currency: settings?.defaultCurrency ?? 'COP',
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
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState<string>('')
  const [date, setDate] = useState(todayIso())
  const [error, setError] = useState<string | null>(null)

  if (!debt) return null
  if (walletId === '' && wallets.length > 0) setWalletId(wallets[0].id)

  const handleSave = async () => {
    setError(null)
    const a = Number(amount.replace(',', '.'))
    if (!Number.isFinite(a) || a <= 0) return setError('Monto inválido')
    try {
      await registerDebtPayment({ debtId: debt.id, amount: a, date, walletId: walletId || undefined })
      setAmount('')
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
        <TextField label="Monto" value={amount} onChange={setAmount} inputMode="decimal" />
        <SelectField
          label="Billetera (opcional)"
          value={walletId}
          onChange={setWalletId}
          options={[{ value: '', label: 'No mover billetera' }, ...wallets.map((w) => ({ value: w.id, label: w.name }))]}
        />
        <TextField label="Fecha" value={date} onChange={setDate} type="date" />
        <div
          style={{
            background: 'var(--bg-inset)',
            borderRadius: 12,
            padding: 12,
            fontSize: 11,
            color: 'var(--ink-mute)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {debt.direction === 'iOwe'
            ? 'Si eliges una billetera, registramos egreso ahí.'
            : 'Si eliges una billetera, registramos ingreso ahí.'}
        </div>
        {error && (
          <div style={{ fontSize: 11, color: 'var(--accent)', padding: 10, borderRadius: 12, background: 'var(--accent-pale)' }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

function NewBillModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wallets = useCollection<Wallet>(() => walletsQuery(), [])
  const settings = useDoc<Settings>(() => settingsRef(), [])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState('1')
  const [walletId, setWalletId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    const a = Number(amount.replace(',', '.'))
    const d = Number(day)
    if (!name.trim()) return setError('Ingresa un nombre')
    if (!Number.isFinite(a) || a <= 0) return setError('Monto inválido')
    if (!Number.isFinite(d) || d < 1 || d > 31) return setError('Día entre 1 y 31')
    try {
      await createFixedBill({
        name,
        amount: a,
        currency: settings?.defaultCurrency ?? 'COP',
        dueDay: d,
        walletId: walletId || undefined,
      })
      setName('')
      setAmount('')
      setDay('1')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo gasto fijo"
      footer={<PrimaryButton onClick={handleSave}>Guardar</PrimaryButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej: Arriendo Berlín" />
        <TextField label="Monto" value={amount} onChange={setAmount} inputMode="decimal" />
        <TextField label="Día del mes" value={day} onChange={setDay} type="number" inputMode="numeric" />
        <SelectField
          label="Billetera por defecto"
          value={walletId}
          onChange={setWalletId}
          options={[{ value: '', label: 'Elegir al pagar' }, ...wallets.map((w) => ({ value: w.id, label: w.name }))]}
        />
        {error && (
          <Pill bg="var(--accent-pale)" color="var(--accent)">
            {error}
          </Pill>
        )}
      </div>
    </Modal>
  )
}
