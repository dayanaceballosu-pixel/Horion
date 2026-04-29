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
import { createTransaction, uid } from './wallets'
import type { CurrencyCode, DisplayCurrency, Goal, GoalAllocation } from '../types'

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

export function goalsQuery(): Query<DocumentData> | null {
  const u = safeUid()
  return u ? query(userCol(u, 'goals'), orderBy('createdAt', 'desc')) : null
}

export async function listGoals(): Promise<Goal[]> {
  const q = goalsQuery()
  if (!q) return []
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Goal)
}

export interface CreateGoalInput {
  name: string
  target: number
  saved?: number
  currency: CurrencyCode
  due?: string
}
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  if (input.target <= 0) throw new Error('La meta debe ser mayor a 0')
  const u = requireUid()
  const id = uid()
  const goal: Goal = {
    id,
    name: input.name.trim(),
    target: input.target,
    saved: input.saved ?? 0,
    currency: input.currency,
    due: input.due,
    createdAt: Date.now(),
  }
  if (goal.saved >= goal.target) goal.completedAt = Date.now()
  await setDoc(userSubDoc(u, 'goals', id), clean(goal))
  return goal
}

export async function updateGoal(id: string, patch: Partial<Goal>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'goals', id), clean(patch))
}

export async function deleteGoal(id: string): Promise<void> {
  const u = requireUid()
  const allocSnap = await getDocs(query(userCol(u, 'goalAllocations'), where('goalId', '==', id)))
  const batch = writeBatch(db)
  allocSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(userSubDoc(u, 'goals', id))
  await batch.commit()
}

export interface AllocateInput {
  goalId: string
  amount: number
  date: string
  walletId?: string
}
export async function allocateToGoal(input: AllocateInput): Promise<GoalAllocation> {
  if (input.amount <= 0) throw new Error('El aporte debe ser mayor a 0')
  const u = requireUid()
  const goalRef = userSubDoc(u, 'goals', input.goalId)
  const snap = await getDoc(goalRef)
  if (!snap.exists()) throw new Error('Meta no encontrada')
  const goal = snap.data() as Goal
  const newSaved = Math.min(goal.target, goal.saved + input.amount)
  const completedAt = newSaved >= goal.target ? Date.now() : undefined

  const allocId = uid()
  const allocation: GoalAllocation = {
    id: allocId,
    goalId: input.goalId,
    amount: input.amount,
    date: input.date,
    walletId: input.walletId,
    createdAt: Date.now(),
  }

  const batch = writeBatch(db)
  batch.set(userSubDoc(u, 'goalAllocations', allocId), clean(allocation))
  /* Use increment to avoid the read-modify-write cost. */
  const patch: Record<string, unknown> = { saved: increment(input.amount) }
  if (completedAt) patch.completedAt = completedAt
  batch.update(goalRef, patch)
  await batch.commit()

  if (input.walletId) {
    await createTransaction({
      walletId: input.walletId,
      type: 'out',
      amount: input.amount,
      currency: asDisplayCurrency(goal.currency),
      title: `Meta: ${goal.name}`,
      date: input.date,
      source: 'goal',
      sourceId: input.goalId,
    })
  }
  return allocation
}

export async function listAllocations(goalId: string): Promise<GoalAllocation[]> {
  const u = requireUid()
  const q = query(userCol(u, 'goalAllocations'), where('goalId', '==', goalId))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => d.data() as GoalAllocation)
  list.sort((a, b) => (a.date < b.date ? 1 : -1))
  return list
}
