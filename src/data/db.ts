import Dexie, { type EntityTable } from 'dexie'
import type { PortfolioPiece, FxRate } from './types'

/**
 * Local-only IndexedDB database. Used ONLY for things we deliberately keep
 * off Firestore:
 *   - portfolio: image blobs (would require Firebase Storage Blaze plan)
 *   - fxRates:   currency conversion cache (transient, no need to sync)
 *
 * Everything else (wallets, transactions, debts, trips, inventory,
 * goals, cycle, tasks, settings) lives in Firestore via the repositories.
 */
export class HorionLocalDB extends Dexie {
  portfolio!: EntityTable<PortfolioPiece, 'id'>
  fxRates!: EntityTable<FxRate, 'id'>

  constructor() {
    super('horion-local')
    this.version(1).stores({
      portfolio: 'id, monthYear, selected, createdAt',
      fxRates: 'id, base, quote, fetchedAt',
    })
  }
}

export const db = new HorionLocalDB()

export function uid(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}
