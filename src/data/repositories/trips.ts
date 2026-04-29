import {
  deleteDoc,
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
import type { CurrencyCode, Studio, StudioStatus, Trip, TripCost, TripStatus } from '../types'

function safeUid(): string | null {
  try {
    return requireUid()
  } catch {
    return null
  }
}

const EMPTY_COST: TripCost = { flight: 0, stay: 0, food: 0, transport: 0, materials: 0, other: 0 }

export function tripsQuery(): Query<DocumentData> | null {
  const u = safeUid()
  return u ? query(userCol(u, 'trips'), orderBy('createdAt', 'desc')) : null
}

export function studiosQuery(tripId: string): Query<DocumentData> | null {
  const u = safeUid()
  /* Drop orderBy to avoid composite index — sort client-side in screens. */
  return u ? query(userCol(u, 'studios'), where('tripId', '==', tripId)) : null
}

export async function listTrips(): Promise<Trip[]> {
  const q = tripsQuery()
  if (!q) return []
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as Trip)
}

export async function getTrip(id: string): Promise<Trip | undefined> {
  const u = requireUid()
  const snap = await getDoc(userSubDoc(u, 'trips', id))
  return snap.exists() ? (snap.data() as Trip) : undefined
}

export interface CreateTripInput {
  city: string
  country: string
  flag?: string
  when: string
  startDate?: string
  endDate?: string
  status?: TripStatus
  cost?: Partial<TripCost>
  currency: CurrencyCode
  avgPrice: number
  target: number
  notes?: string
}
export async function createTrip(input: CreateTripInput): Promise<Trip> {
  const u = requireUid()
  const id = uid()
  const trip: Trip = {
    id,
    city: input.city.trim(),
    country: input.country.trim(),
    flag: input.flag ?? '🌍',
    when: input.when.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status ?? 'planning',
    cost: { ...EMPTY_COST, ...(input.cost ?? {}) },
    currency: input.currency,
    avgPrice: input.avgPrice,
    target: input.target,
    sold: 0,
    notes: input.notes,
    createdAt: Date.now(),
  }
  await setDoc(userSubDoc(u, 'trips', id), clean(trip))
  return trip
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'trips', id), clean(patch))
}

export async function deleteTrip(id: string): Promise<void> {
  const u = requireUid()
  const studioSnap = await getDocs(query(userCol(u, 'studios'), where('tripId', '==', id)))
  const batch = writeBatch(db)
  studioSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(userSubDoc(u, 'trips', id))
  await batch.commit()
}

export async function incrementSold(tripId: string, by = 1): Promise<void> {
  const u = requireUid()
  const ref = userSubDoc(u, 'trips', tripId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const trip = snap.data() as Trip
  const next = Math.max(0, trip.sold + by)
  /* Use increment for the common +/- 1 case to keep it cheap. */
  if (by !== 0 && trip.sold + by >= 0) {
    await updateDoc(ref, { sold: increment(by) })
  } else {
    await updateDoc(ref, { sold: next })
  }
}

/* Studios */

export async function listStudios(tripId: string): Promise<Studio[]> {
  const q = studiosQuery(tripId)
  if (!q) return []
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => d.data() as Studio)
  list.sort((a, b) => a.createdAt - b.createdAt)
  return list
}

export interface CreateStudioInput {
  tripId: string
  name: string
  status?: StudioStatus
  contact?: string
  instagram?: string
  email?: string
  notes?: string
}
export async function createStudio(input: CreateStudioInput): Promise<Studio> {
  const u = requireUid()
  const id = uid()
  const studio: Studio = {
    id,
    tripId: input.tripId,
    name: input.name.trim(),
    status: input.status ?? 'pending',
    contact: input.contact,
    instagram: input.instagram,
    email: input.email,
    notes: input.notes,
    createdAt: Date.now(),
  }
  await setDoc(userSubDoc(u, 'studios', id), clean(studio))
  return studio
}

export async function updateStudio(id: string, patch: Partial<Studio>): Promise<void> {
  const u = requireUid()
  await updateDoc(userSubDoc(u, 'studios', id), clean(patch))
}

export async function deleteStudio(id: string): Promise<void> {
  const u = requireUid()
  await deleteDoc(userSubDoc(u, 'studios', id))
}

/* Pure calculations */

export function tripTotalCost(cost: TripCost): number {
  return cost.flight + cost.stay + cost.food + cost.transport + cost.materials + cost.other
}

export function tripBreakeven(cost: TripCost, avgPrice: number): number {
  if (avgPrice <= 0) return 0
  return Math.ceil(tripTotalCost(cost) / avgPrice)
}

export function tripProfitAtTarget(cost: TripCost, avgPrice: number, target: number): number {
  return target * avgPrice - tripTotalCost(cost)
}
