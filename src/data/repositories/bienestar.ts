import { addDays, differenceInCalendarDays, parseISO } from 'date-fns'
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
import { uid } from './wallets'
import type { CycleEntry, Task, TaskCompletion } from '../types'

function safeUid(): string | null {
  try {
    return requireUid()
  } catch {
    return null
  }
}

/* ─────────── Cycle (period tracker) ─────────── */

export function cycleQuery(): Query<DocumentData> | null {
  const u = safeUid()
  return u ? query(userCol(u, 'cycle'), orderBy('startDate', 'desc')) : null
}

export async function listCycle(): Promise<CycleEntry[]> {
  const q = cycleQuery()
  if (!q) return []
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as CycleEntry)
}

export async function logPeriod(
  startDate: string,
  periodLength = 4,
  notes?: string,
  symptoms?: string[]
): Promise<CycleEntry> {
  const u = requireUid()
  const id = uid()
  const entry: CycleEntry = {
    id,
    startDate,
    periodLength,
    notes,
    symptoms,
    createdAt: Date.now(),
  }
  await setDoc(userSubDoc(u, 'cycle', id), clean(entry))
  return entry
}

export async function deleteCycleEntry(id: string): Promise<void> {
  const u = requireUid()
  await deleteDoc(userSubDoc(u, 'cycle', id))
}

// (CyclePrediction is exported below)
export interface CyclePrediction {
  avgCycle: number
  avgPeriod: number
  lastStart: string | null
  nextStart: string | null
  inDays: number | null
  phase: 'Menstruación' | 'Folicular' | 'Ovulación' | 'Lútea' | null
  dayInCycle: number | null
  fertileDayNumbers: number[]
  periodDayNumbers: number[]
}

const DEFAULT_CYCLE_LEN = 26 /* per client */
const DEFAULT_PERIOD_LEN = 4 /* per client */

export async function getCyclePrediction(today: Date = new Date()): Promise<CyclePrediction> {
  const u = safeUid()
  if (!u) {
    return blankPrediction()
  }
  const snap = await getDocs(query(userCol(u, 'cycle'), orderBy('startDate', 'asc')))
  const entries = snap.docs.map((d) => d.data() as CycleEntry)
  if (entries.length === 0) return blankPrediction()

  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const lastStartIso = sorted[sorted.length - 1].startDate
  const lastStart = parseISO(lastStartIso)

  let avgCycle = DEFAULT_CYCLE_LEN
  if (sorted.length >= 2) {
    const diffs: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      diffs.push(differenceInCalendarDays(parseISO(sorted[i].startDate), parseISO(sorted[i - 1].startDate)))
    }
    avgCycle = Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length)
  }

  const avgPeriod = Math.round(sorted.reduce((s, e) => s + e.periodLength, 0) / sorted.length) || DEFAULT_PERIOD_LEN
  const nextStart = addDays(lastStart, avgCycle)
  const dayInCycle = differenceInCalendarDays(today, lastStart) + 1
  const inDays = differenceInCalendarDays(nextStart, today)

  let phase: CyclePrediction['phase'] = 'Folicular'
  if (dayInCycle <= avgPeriod) phase = 'Menstruación'
  else if (dayInCycle >= avgCycle - 16 && dayInCycle <= avgCycle - 12) phase = 'Ovulación'
  else if (dayInCycle > avgCycle - 12) phase = 'Lútea'

  const ovulation = addDays(lastStart, avgCycle - 14)
  const fertileStart = addDays(ovulation, -3)
  const fertileEnd = addDays(ovulation, 1)

  const month = today.getMonth()
  const fertileDayNumbers: number[] = []
  for (let d = fertileStart; d <= fertileEnd; d = addDays(d, 1)) {
    if (d.getMonth() === month) fertileDayNumbers.push(d.getDate())
  }
  const periodDayNumbers: number[] = []
  for (let i = 0; i < avgPeriod; i++) {
    const d = addDays(nextStart, i)
    if (d.getMonth() === month) periodDayNumbers.push(d.getDate())
  }
  for (let i = 0; i < avgPeriod; i++) {
    const d = addDays(lastStart, i)
    if (d.getMonth() === month) periodDayNumbers.push(d.getDate())
  }
  return {
    avgCycle,
    avgPeriod,
    lastStart: lastStartIso,
    nextStart: nextStart.toISOString().slice(0, 10),
    inDays,
    phase,
    dayInCycle,
    fertileDayNumbers: Array.from(new Set(fertileDayNumbers)),
    periodDayNumbers: Array.from(new Set(periodDayNumbers)),
  }
}

function blankPrediction(): CyclePrediction {
  return {
    avgCycle: DEFAULT_CYCLE_LEN,
    avgPeriod: DEFAULT_PERIOD_LEN,
    lastStart: null,
    nextStart: null,
    inDays: null,
    phase: null,
    dayInCycle: null,
    fertileDayNumbers: [],
    periodDayNumbers: [],
  }
}

/* ─────────── Tasks (daily checklist) ─────────── */

export function tasksQuery(): Query<DocumentData> | null {
  const u = safeUid()
  /* Drop the where(active) to avoid composite index — there's no UI to deactivate
     tasks (delete removes them outright), so all stored tasks are active. */
  return u ? query(userCol(u, 'tasks'), orderBy('order', 'asc')) : null
}

export async function listTasks(): Promise<Task[]> {
  const q = tasksQuery()
  if (!q) return []
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Task)
}

export interface CreateTaskInput {
  text: string
  category?: string
  recurrence?: 'daily' | 'weekly' | null
  weekDays?: number[]
}
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const u = requireUid()
  const tasks = await listTasks()
  const order = tasks.length
  const id = uid()
  const task: Task = {
    id,
    text: input.text.trim(),
    category: input.category?.trim() || 'General',
    recurrence: input.recurrence ?? 'daily',
    weekDays: input.weekDays,
    active: true,
    createdAt: Date.now(),
    order,
  }
  await setDoc(userSubDoc(u, 'tasks', id), clean(task))
  return task
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'tasks', id), clean(patch))
}

export async function deleteTask(id: string): Promise<void> {
  const u = requireUid()
  /* Cascade completions cleanup — keep storage tidy. */
  const compSnap = await getDocs(query(userCol(u, 'taskCompletions'), where('taskId', '==', id)))
  const batch = writeBatch(db)
  compSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(userSubDoc(u, 'tasks', id))
  await batch.commit()
}

export async function reorderTasks(orderedIds: string[]): Promise<void> {
  const u = requireUid()
  const batch = writeBatch(db)
  orderedIds.forEach((id, idx) => {
    batch.update(userSubDoc(u, 'tasks', id), { order: idx })
  })
  await batch.commit()
}

export function completionDocId(taskId: string, date: string): string {
  return `${taskId}_${date}`
}

export async function toggleCompletion(taskId: string, date: string): Promise<void> {
  const u = requireUid()
  const compId = completionDocId(taskId, date)
  const ref = userSubDoc(u, 'taskCompletions', compId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const cur = snap.data() as TaskCompletion
    await updateDoc(ref, { done: !cur.done })
  } else {
    await setDoc(ref, {
      id: compId,
      taskId,
      date,
      done: true,
      createdAt: Date.now(),
    } satisfies TaskCompletion)
  }
}

export function completionsByDateQuery(date: string): Query<DocumentData> | null {
  const u = safeUid()
  return u ? query(userCol(u, 'taskCompletions'), where('date', '==', date)) : null
}

export async function completionsForDate(date: string): Promise<Map<string, boolean>> {
  const q = completionsByDateQuery(date)
  if (!q) return new Map()
  const snap = await getDocs(q)
  const map = new Map<string, boolean>()
  snap.forEach((d) => {
    const c = d.data() as TaskCompletion
    map.set(c.taskId, c.done)
  })
  return map
}

export async function dailyStreak(today: Date = new Date()): Promise<number> {
  const tasks = (await listTasks()).filter((t) => t.recurrence === 'daily')
  if (tasks.length === 0) return 0
  let streak = 0
  /* Cap to 60 days to keep reads bounded — 60 reads max for a streak check. */
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i).toISOString().slice(0, 10)
    const map = await completionsForDate(d)
    const allDone = tasks.every((t) => map.get(t.id) === true)
    if (allDone) streak++
    else if (i === 0) continue /* don't break on today if not done yet */
    else break
  }
  return streak
}
