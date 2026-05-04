import { deleteField, doc, getDoc, getDocs, updateDoc, writeBatch, type DocumentData } from 'firebase/firestore'
import { clean, db, userCol, userSubDoc } from './firebase'
import { buildSnapshot } from './repositories/fx'
import type { Account, DisplayCurrency, FixedBill, Settings, Transaction } from './types'

/**
 * Schema version for the user's Firestore namespace. Bump it whenever we add
 * a new migration. Each version is applied at most once per user.
 *
 *  v1 — adds `Transaction.snapshot` (3-currency snapshot) for legacy txs and
 *       removes the `balance` and `currency` fields from wallet/category docs
 *       (those concepts no longer exist after the registry rewrite).
 *  v2 — converts `FixedBill.dueDay` (number 1-31) to `dueDate` (ISO date)
 *       and stamps `frequency: 'monthly'` so the auto-advance logic works.
 *  v3 — introduces `Account` (Efectivo / Nequi / Daviplata seed) and
 *       backfills `Transaction.accountId` so every existing tx points at
 *       Efectivo. This is the change that unlocks real-time balances.
 */
const TARGET_VERSION = 3

const VERSION_FIELD = 'schemaVersion'

interface VersionedSettings extends Settings {
  schemaVersion?: number
}

export async function runMigrations(uid: string): Promise<void> {
  const settingsRef = userSubDoc(uid, 'settings', 'main')
  const snap = await getDoc(settingsRef)
  if (!snap.exists()) return /* bootstrap will run first; nothing to migrate */
  const settings = snap.data() as VersionedSettings
  const current = settings.schemaVersion ?? 0
  if (current >= TARGET_VERSION) return

  if (current < 1) await migrationV1(uid)
  if (current < 2) await migrationV2(uid)
  if (current < 3) await migrationV3(uid)

  await updateDoc(settingsRef, { [VERSION_FIELD]: TARGET_VERSION })
}

/** v1 — backfill snapshots and strip wallet currency/balance. */
async function migrationV1(uid: string): Promise<void> {
  /* 1) Strip currency/balance from wallets (now categories). */
  const walletsSnap = await getDocs(userCol(uid, 'wallets'))
  const walletBatch = writeBatch(db)
  let walletWrites = 0
  walletsSnap.forEach((d) => {
    const data = d.data() as DocumentData
    if (data.balance === undefined && data.currency === undefined) return
    walletBatch.update(d.ref, {
      balance: deleteField(),
      currency: deleteField(),
    })
    walletWrites += 1
  })
  if (walletWrites > 0) await walletBatch.commit()

  /* 2) Backfill snapshots for transactions missing them. Old txs were created
        when wallets had a fixed currency, so we use today's live rate to
        produce the snapshot. This is a one-time backfill — future txs persist
        their own snapshot at registration time. */
  const txsSnap = await getDocs(userCol(uid, 'transactions'))
  const docs = txsSnap.docs.filter((d) => {
    const data = d.data() as Partial<Transaction>
    return !data.snapshot
  })
  /* Process sequentially in chunks to keep the FX API happy. */
  let chunk: typeof docs = []
  for (const d of docs) chunk.push(d)
  while (chunk.length) {
    const slice = chunk.splice(0, 50)
    await Promise.all(
      slice.map(async (d) => {
        const data = d.data() as Partial<Transaction>
        const amount = typeof data.amount === 'number' ? data.amount : 0
        const original = (data.currency ?? 'COP') as DisplayCurrency
        const safeOriginal: DisplayCurrency =
          original === 'USD' || original === 'EUR' ? original : 'COP'
        const snapshot = await buildSnapshot(amount, safeOriginal)
        await updateDoc(doc(userCol(uid, 'transactions'), d.id), { snapshot })
      }),
    )
  }
}

/** v3 — Real accounts (Efectivo / Nequi / Daviplata) and backfill of every
 *  transaction with `accountId`. Existing flows had no concept of "where the
 *  money lives", so we land everything in Efectivo by default. The user can
 *  redistribute movements later from the action sheet, or simply log new
 *  movements against the right account going forward.
 *
 *  Idempotent: skips seeds that already exist (a re-run after partial failure
 *  doesn't duplicate accounts) and only stamps `accountId` on txs that lack it. */
async function migrationV3(uid: string): Promise<void> {
  const accountsCol = userCol(uid, 'accounts')
  const accountsSnap = await getDocs(accountsCol)
  const existingIds = new Set<string>(accountsSnap.docs.map((d) => d.id))

  const now = Date.now()
  /* The first account in createdAt order becomes the legacy bucket — keep
   *  Efectivo at index 0 so backfilled txs land somewhere recognisable. */
  const seed: Array<Pick<Account, 'id' | 'name' | 'kind' | 'currency'> & { initialBalance?: number }> = [
    { id: 'a_efectivo',  name: 'Efectivo',  kind: 'cash',      currency: 'COP' },
    { id: 'a_nequi',     name: 'Nequi',     kind: 'nequi',     currency: 'COP' },
    { id: 'a_daviplata', name: 'Daviplata', kind: 'daviplata', currency: 'COP' },
  ]

  const accountBatch = writeBatch(db)
  let writes = 0
  seed.forEach((s, i) => {
    if (existingIds.has(s.id)) return
    const acc: Account = {
      id: s.id,
      name: s.name,
      kind: s.kind,
      currency: s.currency,
      initialBalance: 0,
      balance: 0,
      balanceUpdatedAt: now + i,
      order: i,
      createdAt: now + i,
    }
    accountBatch.set(userSubDoc(uid, 'accounts', s.id), clean(acc))
    writes += 1
  })
  if (writes > 0) await accountBatch.commit()

  /* Backfill `accountId` on every existing transaction. We point them at the
   *  first existing account (Efectivo after seeding). Done in chunks because
   *  Firestore batches cap at 500 ops. */
  const txsSnap = await getDocs(userCol(uid, 'transactions'))
  const stale = txsSnap.docs.filter((d) => {
    const data = d.data() as Partial<Transaction>
    return !data.accountId
  })

  const fallbackId = existingIds.has('a_efectivo') || writes > 0
    ? 'a_efectivo'
    : (accountsSnap.docs[0]?.id ?? 'a_efectivo')

  let chunk = stale.slice()
  while (chunk.length) {
    const slice = chunk.splice(0, 400)
    const batch = writeBatch(db)
    slice.forEach((d) => batch.update(d.ref, { accountId: fallbackId }))
    await batch.commit()
  }

  /* Recompute balances now that every tx has an accountId. Lazy-import the
   *  repo to avoid pulling the auth context inside the migrations module. */
  const { recomputeAccountBalance } = await import('./repositories/accounts')
  for (const s of seed) {
    if (!existingIds.has(s.id)) {
      try {
        await recomputeAccountBalance(s.id)
      } catch {
        /* swallow — the account exists but recompute may transiently fail
           if the user has no transactions yet. */
      }
    }
  }
}

/** v2 — Fixed bills migrate from `dueDay: number` to `dueDate: string` with
 *  an explicit `frequency`. Existing docs are assumed monthly (the only
 *  possible cadence under v1). The next due date is computed as "this
 *  month's day-N if not yet past, otherwise next month's day-N", which
 *  preserves the user's intuition of when the bill is next due. */
async function migrationV2(uid: string): Promise<void> {
  const billsSnap = await getDocs(userCol(uid, 'fixedBills'))
  const today = new Date()
  const todayDay = today.getUTCDate()
  const batch = writeBatch(db)
  let writes = 0
  billsSnap.forEach((d) => {
    const data = d.data() as Partial<FixedBill> & { dueDay?: number }
    if (data.dueDate && data.frequency) return /* already migrated */
    const day = Math.max(1, Math.min(28, data.dueDay ?? 1))
    /* If the day has not passed yet this month, use this month; otherwise
     *  jump to the same day next month. Cap at day 28 for safety so we don't
     *  generate invalid dates like Feb 30. */
    const baseDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day))
    if (day < todayDay) baseDate.setUTCMonth(baseDate.getUTCMonth() + 1)
    const dueDate = baseDate.toISOString().slice(0, 10)
    batch.update(d.ref, {
      dueDate,
      frequency: 'monthly',
      dueDay: deleteField(),
    })
    writes += 1
  })
  if (writes > 0) await batch.commit()
}
