import { useEffect, useState } from 'react'
import {
  onSnapshot,
  type DocumentReference,
  type Query,
  type DocumentData,
} from 'firebase/firestore'

/**
 * Subscribe to a Firestore Query and return the docs as an array.
 * Same ergonomics as dexie-react-hooks `useLiveQuery`.
 *
 * `queryFactory` is rebuilt whenever `deps` change, so it can depend on UI state
 * (like a selected month) without reattaching listeners on every render.
 */
export function useCollection<T extends { id: string }>(
  queryFactory: () => Query<DocumentData> | null,
  deps: ReadonlyArray<unknown>,
  fallback: T[] = []
): T[] {
  const [data, setData] = useState<T[]>(fallback)

  useEffect(() => {
    const q = queryFactory()
    if (!q) {
      setData(fallback)
      return
    }
    const unsub = onSnapshot(q, (snap) => {
      const next: T[] = []
      snap.forEach((d) => {
        next.push({ id: d.id, ...d.data() } as T)
      })
      setData(next)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}

/** Subscribe to a single Firestore doc; returns undefined while loading or if missing. */
export function useDoc<T>(
  refFactory: () => DocumentReference<DocumentData> | null,
  deps: ReadonlyArray<unknown>
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined)

  useEffect(() => {
    const r = refFactory()
    if (!r) {
      setData(undefined)
      return
    }
    const unsub = onSnapshot(r, (snap) => {
      setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : undefined)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}
