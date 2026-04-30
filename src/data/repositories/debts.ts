import {
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Query,
  type DocumentData,
} from 'firebase/firestore'
import { clean, db, userCol, userSubDoc } from '../firebase'
import { requireUid } from '../auth'
import { createTransaction, uid } from './wallets'
import type {
  BillFrequency,
  CurrencyCode,
  Debt,
  DebtDirection,
  DebtPayment,
  DisplayCurrency,
  FixedBill,
} from '../types'

/** A "split" allocation across one or more category wallets. The sum of the
 *  amounts is what was paid in total. Used by both debt payments and fixed
 *  bill payments to register the egress in 4 categories at once. */
export interface PaymentAllocation {
  walletId: string
  amount: number
}

/** Advances an ISO date by one period of the given frequency. Used to roll
 *  the next-due date of a bill forward each time it's paid. */
export function advanceDueDate(iso: string, freq: BillFrequency): string {
  const [y, m, d] = iso.split('-').map(Number)
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

/** Days between today and an ISO due date. Negative = overdue. */
export function daysUntil(iso: string, todayIso: string): number {
  const [y1, m1, d1] = iso.split('-').map(Number)
  const [y2, m2, d2] = todayIso.split('-').map(Number)
  const a = Date.UTC(y1, m1 - 1, d1)
  const b = Date.UTC(y2, m2 - 1, d2)
  return Math.round((a - b) / 86_400_000)
}

/** Narrow CurrencyCode (which includes PLN, reserved for trips) to a
 *  DisplayCurrency. Anything outside COP/USD/EUR is recorded as COP — debts
 *  and bills in PLN are effectively unsupported in the registry, which is
 *  fine because the user keeps PLN inside the trips module. */
function asDisplayCurrency(c: CurrencyCode): DisplayCurrency {
  return c === 'USD' || c === 'EUR' ? c : 'COP'
}

function safeUid(): string | null {
  try {
    return requireUid()
  } catch {
    return null
  }
}

/* ─────────── Live queries ─────────── */

export function debtsQuery(): Query<DocumentData> | null {
  const u = safeUid()
  return u ? query(userCol(u, 'debts'), orderBy('createdAt', 'desc')) : null
}

export function fixedBillsQuery(): Query<DocumentData> | null {
  const u = safeUid()
  /* Order by next due date ascending — most urgent first. The migration
   *  ensures every doc has `dueDate` before this query runs. */
  return u ? query(userCol(u, 'fixedBills'), orderBy('dueDate', 'asc')) : null
}

/* ─────────── Reads ─────────── */

export async function listDebts(direction?: DebtDirection): Promise<Debt[]> {
  const q = debtsQuery()
  if (!q) return []
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => d.data() as Debt)
  return direction ? all.filter((d) => d.direction === direction) : all
}

export async function listFixedBills(): Promise<FixedBill[]> {
  const q = fixedBillsQuery()
  if (!q) return []
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as FixedBill)
}

export async function listPayments(debtId: string): Promise<DebtPayment[]> {
  const u = requireUid()
  /* Single where + client-side sort — avoids composite index. */
  const q = query(userCol(u, 'debtPayments'), where('debtId', '==', debtId))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => d.data() as DebtPayment)
  list.sort((a, b) => (a.date < b.date ? 1 : -1))
  return list
}

/* ─────────── Debt mutations ─────────── */

export interface CreateDebtInput {
  person: string
  direction: DebtDirection
  total: number
  paid?: number
  currency: CurrencyCode
  due?: string
  notes?: string
}
export async function createDebt(input: CreateDebtInput): Promise<Debt> {
  if (input.total <= 0) throw new Error('El total debe ser mayor a 0')
  const u = requireUid()
  const id = uid()
  const debt: Debt = {
    id,
    person: input.person.trim(),
    direction: input.direction,
    total: input.total,
    paid: input.paid ?? 0,
    currency: input.currency,
    due: input.due,
    notes: input.notes,
    createdAt: Date.now(),
  }
  await setDoc(userSubDoc(u, 'debts', id), clean(debt))
  return debt
}

export async function updateDebt(id: string, patch: Partial<Debt>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'debts', id), clean(patch))
}

export async function deleteDebt(id: string): Promise<void> {
  const u = requireUid()
  /* Cascade delete payments — at most a handful per debt, fine in batch. */
  const paySnap = await getDocs(query(userCol(u, 'debtPayments'), where('debtId', '==', id)))
  const batch = writeBatch(db)
  paySnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(userSubDoc(u, 'debts', id))
  await batch.commit()
}

export interface RegisterPaymentInput {
  debtId: string
  /** Total amount paid (sum of all allocations). */
  amount: number
  date: string
  /** Per-category split. Default flow precomputes 4 equal slices but the
   *  user may tweak them in the UI before submitting. Empty array is also
   *  allowed — payment is recorded but no transactions are generated (rare
   *  case where the user is just tracking that a payment happened off-app). */
  allocations: PaymentAllocation[]
  notes?: string
}

export async function registerDebtPayment(input: RegisterPaymentInput): Promise<DebtPayment> {
  if (input.amount <= 0) throw new Error('El abono debe ser mayor a 0')
  const sum = input.allocations.reduce((s, a) => s + a.amount, 0)
  if (input.allocations.length > 0 && Math.abs(sum - input.amount) > 0.01) {
    throw new Error('La suma del desglose no coincide con el total')
  }
  const u = requireUid()
  const debtRef = userSubDoc(u, 'debts', input.debtId)
  const debtSnap = await getDoc(debtRef)
  if (!debtSnap.exists()) throw new Error('Deuda no encontrada')
  const debt = debtSnap.data() as Debt
  const newPaid = Math.min(debt.total, debt.paid + input.amount)
  const closedAt = newPaid >= debt.total ? Date.now() : undefined

  const id = uid()
  const payment: DebtPayment = {
    id,
    debtId: input.debtId,
    amount: input.amount,
    date: input.date,
    notes: input.notes,
    createdAt: Date.now(),
  }

  const batch = writeBatch(db)
  batch.set(userSubDoc(u, 'debtPayments', id), clean(payment))
  const update: Partial<Debt> = { paid: newPaid }
  if (closedAt) update.closedAt = closedAt
  batch.update(debtRef, update)
  await batch.commit()

  /* One transaction per non-zero allocation. The whole batch shares the same
   *  source/sourceId so a delete cascade can find them later if needed. */
  const txCurrency = asDisplayCurrency(debt.currency)
  const txTitle = debt.direction === 'iOwe' ? `Pago a ${debt.person}` : `Cobro de ${debt.person}`
  const txType = debt.direction === 'iOwe' ? 'out' : 'in'
  for (const alloc of input.allocations) {
    if (alloc.amount <= 0) continue
    await createTransaction({
      walletId: alloc.walletId,
      type: txType,
      amount: alloc.amount,
      currency: txCurrency,
      title: txTitle,
      date: input.date,
      notes: input.notes,
      source: 'debt',
      sourceId: input.debtId,
    })
  }
  return payment
}

/* ─────────── Fixed bills ─────────── */

export interface CreateFixedBillInput {
  name: string
  amount: number
  currency: CurrencyCode
  /** Next due date as ISO 'YYYY-MM-DD'. */
  dueDate: string
  /** How often the bill repeats — drives the auto-advance after each pay. */
  frequency: BillFrequency
  walletId?: string
}
export async function createFixedBill(input: CreateFixedBillInput): Promise<FixedBill> {
  const u = requireUid()
  const id = uid()
  const bill: FixedBill = {
    id,
    name: input.name.trim(),
    amount: input.amount,
    currency: input.currency,
    dueDate: input.dueDate,
    frequency: input.frequency,
    walletId: input.walletId,
    active: true,
    createdAt: Date.now(),
  }
  await setDoc(userSubDoc(u, 'fixedBills', id), clean(bill))
  return bill
}

export async function updateFixedBill(id: string, patch: Partial<FixedBill>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'fixedBills', id), clean(patch))
}

export async function deleteFixedBill(id: string): Promise<void> {
  const u = requireUid()
  await deleteDoc(userSubDoc(u, 'fixedBills', id))
}

export async function markFixedBillPaid(
  billId: string,
  allocations: PaymentAllocation[],
  date: string,
): Promise<void> {
  const u = requireUid()
  const billRef = userSubDoc(u, 'fixedBills', billId)
  const snap = await getDoc(billRef)
  if (!snap.exists()) return
  const bill = snap.data() as FixedBill
  const isoMonth = date.slice(0, 7)
  const sum = allocations.reduce((s, a) => s + a.amount, 0)
  if (allocations.length > 0 && Math.abs(sum - bill.amount) > 0.01) {
    throw new Error('La suma del desglose no coincide con el monto del gasto')
  }

  /* Roll the next due date forward and persist the "last paid month" stamp
   *  in a single write, then fan out one tx per allocation. */
  const nextDue = advanceDueDate(bill.dueDate, bill.frequency)
  await updateDoc(billRef, { lastPaidMonth: isoMonth, dueDate: nextDue })

  const txCurrency = asDisplayCurrency(bill.currency)
  for (const alloc of allocations) {
    if (alloc.amount <= 0) continue
    await createTransaction({
      walletId: alloc.walletId,
      type: 'out',
      amount: alloc.amount,
      currency: txCurrency,
      title: bill.name,
      date,
      source: 'fixedBill',
      sourceId: bill.id,
    })
  }
}

/** Urgency now uses the actual ISO due date instead of an implicit day of
 *  the current month. Caller passes today's ISO date so the function stays
 *  pure / testable. */
export function billUrgency(bill: FixedBill, todayIso: string): 'overdue' | 'urgent' | 'soon' | 'normal' {
  const diff = daysUntil(bill.dueDate, todayIso)
  if (diff < 0) return 'overdue'
  if (diff <= 1) return 'urgent'
  if (diff <= 5) return 'soon'
  return 'normal'
}

/** Same urgency scale applied to a Debt's optional due date. Returns
 *  'normal' if the debt has no due date set. */
export function debtUrgency(debt: Debt, todayIso: string): 'overdue' | 'urgent' | 'soon' | 'normal' {
  if (!debt.due) return 'normal'
  if (debt.paid >= debt.total) return 'normal'
  return billUrgency({ dueDate: debt.due } as FixedBill, todayIso)
}
