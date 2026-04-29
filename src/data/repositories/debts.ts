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
import type { CurrencyCode, Debt, DebtDirection, DebtPayment, DisplayCurrency, FixedBill } from '../types'

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
  /* Same rationale as tasks — no UI to deactivate, so we drop where(active). */
  return u ? query(userCol(u, 'fixedBills'), orderBy('dueDay', 'asc')) : null
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
  amount: number
  date: string
  walletId?: string
  notes?: string
}

export async function registerDebtPayment(input: RegisterPaymentInput): Promise<DebtPayment> {
  if (input.amount <= 0) throw new Error('El abono debe ser mayor a 0')
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
    walletId: input.walletId,
    notes: input.notes,
    createdAt: Date.now(),
  }

  const batch = writeBatch(db)
  batch.set(userSubDoc(u, 'debtPayments', id), clean(payment))
  const update: Partial<Debt> = { paid: newPaid }
  if (closedAt) update.closedAt = closedAt
  batch.update(debtRef, update)
  await batch.commit()

  if (input.walletId) {
    await createTransaction({
      walletId: input.walletId,
      type: debt.direction === 'iOwe' ? 'out' : 'in',
      amount: input.amount,
      currency: asDisplayCurrency(debt.currency),
      title: debt.direction === 'iOwe' ? `Pago a ${debt.person}` : `Cobro de ${debt.person}`,
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
  dueDay: number
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
    dueDay: Math.max(1, Math.min(31, input.dueDay)),
    walletId: input.walletId,
    active: true,
    createdAt: Date.now(),
  }
  await setDoc(userSubDoc(u, 'fixedBills', id), clean(bill))
  return bill
}

export async function deleteFixedBill(id: string): Promise<void> {
  const u = requireUid()
  await deleteDoc(userSubDoc(u, 'fixedBills', id))
}

export async function markFixedBillPaid(billId: string, walletId: string, date: string): Promise<void> {
  const u = requireUid()
  const billRef = userSubDoc(u, 'fixedBills', billId)
  const snap = await getDoc(billRef)
  if (!snap.exists()) return
  const bill = snap.data() as FixedBill
  const isoMonth = date.slice(0, 7)

  /* Mark paid first (single write), then create the transaction (uses increment, 1 write to wallet + 1 write to tx). */
  await updateDoc(billRef, { lastPaidMonth: isoMonth })
  await createTransaction({
    walletId,
    type: 'out',
    amount: bill.amount,
    currency: asDisplayCurrency(bill.currency),
    title: bill.name,
    date,
    source: 'fixedBill',
    sourceId: bill.id,
  })
}

export function billUrgency(bill: FixedBill, todayDay: number): 'overdue' | 'urgent' | 'soon' | 'normal' {
  const diff = bill.dueDay - todayDay
  if (diff < 0) return 'overdue'
  if (diff <= 1) return 'urgent'
  if (diff <= 5) return 'soon'
  return 'normal'
}
