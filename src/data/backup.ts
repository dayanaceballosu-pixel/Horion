import { doc, deleteDoc, getDocs, writeBatch, type DocumentReference } from 'firebase/firestore'
import { db, userCol } from './firebase'
import { requireUid } from './auth'

const FIRESTORE_COLLECTIONS = [
  'wallets', 'transactions',
  'debts', 'debtPayments',
  'fixedBills',
  'trips', 'studios',
  'inventory', 'inventoryMovements',
  'goals', 'goalAllocations',
  'cycle', 'tasks', 'taskCompletions',
  'settings',
] as const

export interface Backup {
  version: number
  createdAt: number
  data: Record<string, unknown[]>
}

/**
 * Reads the user's entire Firestore namespace as JSON. The portfolio (which
 * lives locally in IndexedDB and contains image blobs) is NOT included —
 * those have to be backed up separately by the user from the Portafolio screen.
 */
export async function exportBackup(): Promise<Backup> {
  const u = requireUid()
  const data: Record<string, unknown[]> = {}
  for (const name of FIRESTORE_COLLECTIONS) {
    const snap = await getDocs(userCol(u, name))
    data[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  return { version: 2, createdAt: Date.now(), data }
}

export async function importBackup(backup: Backup): Promise<void> {
  if (backup.version !== 2 && backup.version !== 1) throw new Error('Versión de backup no soportada')
  const u = requireUid()
  /* Wipe + restore each collection. Run in chunks of 400 writes (batch limit 500). */
  for (const name of FIRESTORE_COLLECTIONS) {
    const rows = backup.data[name]
    if (!Array.isArray(rows)) continue
    /* Delete current docs in this collection. */
    const existing = await getDocs(userCol(u, name))
    await batchedDelete(existing.docs.map((d) => d.ref))
    /* Insert new docs. */
    if (rows.length > 0) {
      const chunks = chunk(rows as Array<Record<string, unknown> & { id: string }>, 400)
      for (const ch of chunks) {
        const batch = writeBatch(db)
        for (const row of ch) {
          batch.set(doc(userCol(u, name), row.id), row)
        }
        await batch.commit()
      }
    }
  }
}

async function batchedDelete(refs: DocumentReference[]): Promise<void> {
  /* Sequentially delete — keeps writes well under daily quota and is fine for backup restore. */
  for (const ref of refs) {
    await deleteDoc(ref)
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Hard-wipes the user's Firestore namespace + local IndexedDB. Used by the
 *  "Borrar todos los datos" action in the profile. After this the next
 *  sign-in will rebootstrap defaults via `ensureUserBootstrap`. */
export async function wipeAllData(): Promise<void> {
  const u = requireUid()
  for (const name of FIRESTORE_COLLECTIONS) {
    const snap = await getDocs(userCol(u, name))
    for (const d of snap.docs) await deleteDoc(d.ref)
  }
  /* Local Dexie tables (portfolio + fxRates). */
  const { db: localDb } = await import('./db')
  await localDb.delete()
}

export function downloadBackup(backup: Backup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `horion-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
