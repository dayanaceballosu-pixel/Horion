import { deleteField, doc, getDoc, getDocs, updateDoc, writeBatch, type DocumentData } from 'firebase/firestore'
import { db, userCol, userSubDoc } from './firebase'
import { buildSnapshot } from './repositories/fx'
import type { DisplayCurrency, Settings, Transaction } from './types'

/**
 * Schema version for the user's Firestore namespace. Bump it whenever we add
 * a new migration. Each version is applied at most once per user.
 *
 *  v1 — adds `Transaction.snapshot` (3-currency snapshot) for legacy txs and
 *       removes the `balance` and `currency` fields from wallet/category docs
 *       (those concepts no longer exist after the registry rewrite).
 */
const TARGET_VERSION = 1

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
