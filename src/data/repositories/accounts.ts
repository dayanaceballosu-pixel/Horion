import {
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
import { uid } from './wallets'
import { buildSnapshot, getRate } from './fx'
import type {
  Account,
  AccountKind,
  CurrencyCode,
  DisplayCurrency,
  Transaction,
} from '../types'

function safeUid(): string | null {
  try {
    return requireUid()
  } catch {
    return null
  }
}

/** Restrict any CurrencyCode (which includes PLN) to the three currencies the
 *  registry knows how to snapshot. PLN balances aren't supported on accounts —
 *  PLN is reserved for the trips module. */
function asDisplayCurrency(c: CurrencyCode): DisplayCurrency {
  return c === 'USD' || c === 'EUR' ? c : 'COP'
}

/* ─────────── Live queries ─────────── */

export function accountsQuery(): Query<DocumentData> | null {
  const u = safeUid()
  if (!u) return null
  return query(userCol(u, 'accounts'), orderBy('createdAt', 'asc'))
}

/* ─────────── Reads ─────────── */

export async function listAccounts(): Promise<Account[]> {
  const q = accountsQuery()
  if (!q) return []
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Account).filter((a) => !a.archived)
}

export async function getAccount(id: string): Promise<Account | undefined> {
  const u = requireUid()
  const snap = await getDoc(userSubDoc(u, 'accounts', id))
  return snap.exists() ? (snap.data() as Account) : undefined
}

/* ─────────── Mutations ─────────── */

export interface CreateAccountInput {
  name: string
  kind: AccountKind
  currency: CurrencyCode
  initialBalance: number
  color?: string
  notes?: string
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const u = requireUid()
  const id = uid()
  const now = Date.now()
  const account: Account = {
    id,
    name: input.name.trim() || 'Cuenta',
    kind: input.kind,
    currency: input.currency,
    initialBalance: Math.max(0, input.initialBalance || 0),
    balance: Math.max(0, input.initialBalance || 0),
    balanceUpdatedAt: now,
    color: input.color,
    notes: input.notes,
    createdAt: now,
  }
  await setDoc(userSubDoc(u, 'accounts', id), clean(account))
  return account
}

export async function updateAccount(id: string, patch: Partial<Account>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'accounts', id), clean(patch))
  /* If the user tweaked initialBalance the cached balance is now stale —
   *  recompute so the UI never shows the wrong number even for one frame. */
  if (patch.initialBalance !== undefined) {
    await recomputeAccountBalance(id)
  }
}

export async function archiveAccount(id: string): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'accounts', id), { archived: true })
}

/* ─────────── Balance ─────────── */

/** Recompute and persist the cached balance for one account.
 *
 *  Sums initialBalance + Σ(in − out) across every transaction whose
 *  `accountId` matches. Each tx is normalized to the account's native
 *  currency via its 3-currency snapshot — so a USD transaction in a COP
 *  account contributes its COP-equivalent at registration time, not today. */
export async function recomputeAccountBalance(accountId: string): Promise<number> {
  const u = requireUid()
  const accSnap = await getDoc(userSubDoc(u, 'accounts', accountId))
  if (!accSnap.exists()) return 0
  const account = accSnap.data() as Account
  const target = asDisplayCurrency(account.currency)

  const txSnap = await getDocs(query(userCol(u, 'transactions'), where('accountId', '==', accountId)))
  let net = 0
  txSnap.forEach((d) => {
    const t = d.data() as Transaction
    const v = t.snapshot?.[target] ?? 0
    net += t.type === 'in' ? v : -v
  })

  const balance = account.initialBalance + net
  await updateDoc(userSubDoc(u, 'accounts', accountId), {
    balance,
    balanceUpdatedAt: Date.now(),
  })
  return balance
}

/** Recompute every account's balance — used after migrations and as a manual
 *  "rebuild" hatch the user can trigger from each account if reality drifts. */
export async function recomputeAllBalances(): Promise<void> {
  const accounts = await listAccounts()
  for (const a of accounts) {
    await recomputeAccountBalance(a.id)
  }
}

/* ─────────── Manual balance adjustment (reconciliation) ─────────── */

/** Records a single in/out transaction so the cached balance lands on the
 *  number the user typed. Used when reality and registry drift (forgot to log
 *  a withdrawal, found a bill in a pocket, etc.). */
export interface AdjustBalanceInput {
  accountId: string
  newBalance: number
  date: string
  notes?: string
}

export async function adjustAccountBalance(input: AdjustBalanceInput): Promise<void> {
  const account = await getAccount(input.accountId)
  if (!account) throw new Error('Cuenta no encontrada')
  const delta = input.newBalance - account.balance
  if (Math.abs(delta) < 0.005) return /* nothing to do */

  /* Adjustment is a real transaction so it shows up in history and affects
   *  the snapshot. Categorized as "manual" with source 'adjustment' — the UI
   *  flags these visually so they're easy to audit later. */
  const txCurrency = asDisplayCurrency(account.currency)
  const u = requireUid()
  const id = uid()
  const snapshot = await buildSnapshot(Math.abs(delta), txCurrency)
  const tx: Transaction = {
    id,
    accountId: input.accountId,
    type: delta > 0 ? 'in' : 'out',
    amount: Math.abs(delta),
    currency: txCurrency,
    snapshot,
    title: 'Ajuste de saldo',
    date: input.date,
    createdAt: Date.now(),
    notes: input.notes,
    source: 'adjustment',
  }
  await setDoc(userSubDoc(u, 'transactions', id), clean(tx))
  await recomputeAccountBalance(input.accountId)
}

/* ─────────── Transfers ─────────── */

export interface TransferInput {
  fromAccountId: string
  toAccountId: string
  /** Amount in the source account's currency. */
  amount: number
  date: string
  notes?: string
  /** Optional override; when omitted we render "Transferencia <kind> → <kind>". */
  title?: string
}

/** Move money between two accounts, persisted as two linked transactions
 *  sharing a `transferGroupId`. Both legs use `source: 'transfer'`.
 *
 *  When the accounts have different currencies we convert the amount via the
 *  current FX rate (same path the rest of the app uses). The receiving leg
 *  is registered in the destination's native currency so its balance moves
 *  by the right amount. The two snapshots are independent — either side can
 *  be displayed in any of the three display currencies. */
export async function registerTransfer(input: TransferInput): Promise<void> {
  if (input.amount <= 0) throw new Error('El monto debe ser mayor a 0')
  if (input.fromAccountId === input.toAccountId) {
    throw new Error('Elige una cuenta distinta')
  }
  const u = requireUid()
  const [fromSnap, toSnap] = await Promise.all([
    getDoc(userSubDoc(u, 'accounts', input.fromAccountId)),
    getDoc(userSubDoc(u, 'accounts', input.toAccountId)),
  ])
  if (!fromSnap.exists() || !toSnap.exists()) throw new Error('Cuenta no encontrada')
  const from = fromSnap.data() as Account
  const to = toSnap.data() as Account

  const fromCur = asDisplayCurrency(from.currency)
  const toCur = asDisplayCurrency(to.currency)
  const rate = fromCur === toCur ? 1 : await getRate(fromCur, toCur)
  const fromAmount = input.amount
  const toAmount = +(input.amount * rate).toFixed(2)

  const groupId = uid()
  const now = Date.now()
  const baseTitle = input.title?.trim() || `Transferencia · ${from.name} → ${to.name}`

  const fromSnapshotMoney = await buildSnapshot(fromAmount, fromCur)
  const toSnapshotMoney = await buildSnapshot(toAmount, toCur)

  const outId = uid()
  const inId = uid()

  const outTx: Transaction = {
    id: outId,
    accountId: input.fromAccountId,
    type: 'out',
    amount: fromAmount,
    currency: fromCur,
    snapshot: fromSnapshotMoney,
    title: baseTitle,
    date: input.date,
    createdAt: now,
    notes: input.notes,
    source: 'transfer',
    transferGroupId: groupId,
  }
  const inTx: Transaction = {
    id: inId,
    accountId: input.toAccountId,
    type: 'in',
    amount: toAmount,
    currency: toCur,
    snapshot: toSnapshotMoney,
    title: baseTitle,
    date: input.date,
    createdAt: now + 1,
    notes: input.notes,
    source: 'transfer',
    transferGroupId: groupId,
  }

  const batch = writeBatch(db)
  batch.set(userSubDoc(u, 'transactions', outId), clean(outTx))
  batch.set(userSubDoc(u, 'transactions', inId), clean(inTx))
  await batch.commit()

  /* Update both balances in parallel — order doesn't matter, neither account
   *  depends on the other for its own recompute. */
  await Promise.all([
    recomputeAccountBalance(input.fromAccountId),
    recomputeAccountBalance(input.toAccountId),
  ])
}

/** Delete both legs of a transfer in one batch. Used by the action sheet
 *  when the user confirms removal of a transfer row. */
export async function deleteTransfer(transferGroupId: string): Promise<void> {
  const u = requireUid()
  const snap = await getDocs(
    query(userCol(u, 'transactions'), where('transferGroupId', '==', transferGroupId)),
  )
  if (snap.empty) return
  const accountIds = new Set<string>()
  const batch = writeBatch(db)
  snap.docs.forEach((d) => {
    const t = d.data() as Transaction
    if (t.accountId) accountIds.add(t.accountId)
    batch.delete(d.ref)
  })
  await batch.commit()
  await Promise.all([...accountIds].map((id) => recomputeAccountBalance(id)))
}
