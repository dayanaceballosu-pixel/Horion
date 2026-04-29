import {
  getDoc,
  getDocs,
  increment,
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
import type { InventoryItem, InventoryMovement } from '../types'

function safeUid(): string | null {
  try {
    return requireUid()
  } catch {
    return null
  }
}

export function inventoryQuery(): Query<DocumentData> | null {
  const u = safeUid()
  return u ? query(userCol(u, 'inventory'), orderBy('name', 'asc')) : null
}

export async function listInventory(): Promise<InventoryItem[]> {
  const q = inventoryQuery()
  if (!q) return []
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as InventoryItem)
}

export interface CreateItemInput {
  name: string
  stock: number
  min: number
  unit: string
  category: string
  notes?: string
}
export async function createItem(input: CreateItemInput): Promise<InventoryItem> {
  const u = requireUid()
  const id = uid()
  const item: InventoryItem = {
    id,
    name: input.name.trim(),
    stock: Math.max(0, input.stock),
    min: Math.max(0, input.min),
    unit: input.unit.trim(),
    category: input.category.trim(),
    notes: input.notes,
    createdAt: Date.now(),
  }
  await setDoc(userSubDoc(u, 'inventory', id), clean(item))
  return item
}

export async function updateItem(id: string, patch: Partial<InventoryItem>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'inventory', id), clean(patch))
}

export async function deleteItem(id: string): Promise<void> {
  const u = requireUid()
  const movSnap = await getDocs(query(userCol(u, 'inventoryMovements'), where('itemId', '==', id)))
  const batch = writeBatch(db)
  movSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(userSubDoc(u, 'inventory', id))
  await batch.commit()
}

export async function recordMovement(
  itemId: string,
  delta: number,
  reason: 'use' | 'restock' | 'adjust',
  options?: { cost?: number; date?: string }
): Promise<void> {
  const u = requireUid()
  const itemRef = userSubDoc(u, 'inventory', itemId)
  const itemSnap = await getDoc(itemRef)
  if (!itemSnap.exists()) throw new Error('Item no encontrado')
  const item = itemSnap.data() as InventoryItem
  const newStock = Math.max(0, item.stock + delta)
  const realDelta = newStock - item.stock /* may differ from `delta` if floor at 0 */

  const movId = uid()
  const movement: InventoryMovement = {
    id: movId,
    itemId,
    delta,
    reason,
    cost: options?.cost,
    date: options?.date ?? new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
  }

  const batch = writeBatch(db)
  batch.set(userSubDoc(u, 'inventoryMovements', movId), clean(movement))
  const patch: Record<string, unknown> = { stock: increment(realDelta) }
  if (reason === 'restock') patch.lastRestockAt = Date.now()
  batch.update(itemRef, patch)
  await batch.commit()
}

export async function listMovements(itemId: string): Promise<InventoryMovement[]> {
  const u = requireUid()
  const q = query(userCol(u, 'inventoryMovements'), where('itemId', '==', itemId))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => d.data() as InventoryMovement)
  list.sort((a, b) => b.createdAt - a.createdAt)
  return list
}

export async function lowStockItems(): Promise<InventoryItem[]> {
  const all = await listInventory()
  return all.filter((i) => i.stock < i.min)
}

export function isLow(item: InventoryItem): boolean {
  return item.stock < item.min
}
