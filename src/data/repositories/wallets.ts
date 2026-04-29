import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Query,
  type DocumentData,
} from 'firebase/firestore'
import { clean, userCol, userSubDoc } from '../firebase'
import { requireUid } from '../auth'
import type { DisplayCurrency, Transaction, TxType, Wallet, WalletTone } from '../types'
import { buildSnapshot } from './fx'

const uid = (): string => Math.random().toString(36).slice(2, 11) + Date.now().toString(36)

/* ─────────── Live queries (used with useCollection hook) ─────────── */

export function walletsQuery(): Query<DocumentData> | null {
  const u = useUidSafe()
  if (!u) return null
  return query(userCol(u, 'wallets'), orderBy('createdAt', 'asc'))
}

export function transactionsQuery(filter?: { walletId?: string; limit?: number }): Query<DocumentData> | null {
  const u = useUidSafe()
  if (!u) return null
  const base = userCol(u, 'transactions')
  /* When filtering by walletId, drop orderBy so Firestore does not require a
     composite index. The screens sort client-side after the snapshot. */
  if (filter?.walletId) {
    return query(base, where('walletId', '==', filter.walletId), fsLimit(filter.limit ?? 500))
  }
  return query(base, orderBy('createdAt', 'desc'), fsLimit(filter?.limit ?? 200))
}

/** Subscribe to all transactions of a YYYY-MM month. The range is over `date`
 *  (a single field), so Firestore needs no composite index. The screens sort
 *  client-side because we don't pair the range with an orderBy. */
export function transactionsForMonthQuery(isoMonth: string): Query<DocumentData> | null {
  const u = useUidSafe()
  if (!u) return null
  const [y, m] = isoMonth.split('-').map(Number)
  const start = `${isoMonth}-01`
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10)
  return query(
    userCol(u, 'transactions'),
    where('date', '>=', start),
    where('date', '<', next),
  )
}

/* ─────────── One-shot reads ─────────── */

export async function listWallets(): Promise<Wallet[]> {
  const q = walletsQuery()
  if (!q) return []
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Wallet).filter((w) => !w.archived)
}

export async function getWallet(id: string): Promise<Wallet | undefined> {
  const u = requireUid()
  const snap = await getDoc(userSubDoc(u, 'wallets', id))
  return snap.exists() ? (snap.data() as Wallet) : undefined
}

/* ─────────── Mutations ─────────── */

export interface CreateWalletInput {
  name: string
  sub: string
  tone: WalletTone
}
export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  const u = requireUid()
  const id = uid()
  const wallet: Wallet = {
    id,
    name: input.name.trim(),
    sub: input.sub.trim(),
    tone: input.tone,
    createdAt: Date.now(),
  }
  await setDoc(userSubDoc(u, 'wallets', id), clean(wallet))
  return wallet
}

export async function updateWallet(id: string, patch: Partial<Wallet>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'wallets', id), clean(patch))
}

export async function archiveWallet(id: string): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'wallets', id), { archived: true })
}

/* ─────────── Transactions ─────────── */

export interface CreateTransactionInput {
  walletId: string
  type: TxType
  amount: number
  /** Original currency the user typed the amount in. Restricted to the three
   *  display currencies — PLN is reserved for the trips module. */
  currency: DisplayCurrency
  title: string
  date: string
  notes?: string
  source?: Transaction['source']
  sourceId?: string
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  if (input.amount <= 0) throw new Error('El monto debe ser mayor a 0')
  const u = requireUid()
  const id = uid()
  const snapshot = await buildSnapshot(input.amount, input.currency)
  const tx: Transaction = {
    id,
    walletId: input.walletId,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    snapshot,
    title: input.title.trim() || (input.type === 'in' ? 'Ingreso' : 'Egreso'),
    date: input.date,
    createdAt: Date.now(),
    notes: input.notes,
    source: input.source ?? 'manual',
    sourceId: input.sourceId,
  }
  await setDoc(userSubDoc(u, 'transactions', id), clean(tx))
  return tx
}

export async function deleteTransaction(id: string): Promise<void> {
  const u = requireUid()
  await deleteDoc(userSubDoc(u, 'transactions', id))
}

export async function listTransactions(filter?: { walletId?: string; limit?: number }): Promise<Transaction[]> {
  const q = transactionsQuery(filter)
  if (!q) return []
  const snap = await getDocs(q)
  const txs = snap.docs.map((d) => d.data() as Transaction)
  /* When filtered by walletId we dropped the orderBy to avoid a composite
     index — restore the ordering client-side. */
  if (filter?.walletId) txs.sort((a, b) => b.createdAt - a.createdAt)
  return txs
}

/** Monthly net flow for a category, expressed in the chosen display currency
 *  using the frozen snapshots stored on each transaction. */
export async function walletMonthStats(
  walletId: string,
  isoMonth: string,
  currency: DisplayCurrency = 'COP',
): Promise<{ ingresos: number; egresos: number }> {
  const u = useUidSafe()
  if (!u) return { ingresos: 0, egresos: 0 }
  /* Single where + client-side date filter — no composite index required. */
  const q = query(userCol(u, 'transactions'), where('walletId', '==', walletId))
  const snap = await getDocs(q)
  const txs = snap.docs
    .map((d) => d.data() as Transaction)
    .filter((t) => t.date.startsWith(isoMonth))
  const sumIn = (t: Transaction) => t.snapshot?.[currency] ?? t.amount
  return {
    ingresos: txs.filter((t) => t.type === 'in').reduce((s, t) => s + sumIn(t), 0),
    egresos: txs.filter((t) => t.type === 'out').reduce((s, t) => s + sumIn(t), 0),
  }
}

/* Returns the current uid without throwing; null when not signed in.
   Used inside query factories that can run before login resolves. */
function useUidSafe(): string | null {
  try {
    return requireUid()
  } catch {
    return null
  }
}

/* Re-exported so other repos can keep building unique IDs the same way. */
export { uid }
/* Re-exported helpers for potential cleanup utilities */
export { collection, deleteDoc, doc }
