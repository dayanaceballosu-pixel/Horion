import { getDoc, setDoc, type DocumentReference, type DocumentData } from 'firebase/firestore'
import { clean, userSubDoc } from '../firebase'
import { requireUid } from '../auth'
import type { Settings } from '../types'

function safeUid(): string | null {
  try {
    return requireUid()
  } catch {
    return null
  }
}

export function settingsRef(): DocumentReference<DocumentData> | null {
  const u = safeUid()
  return u ? userSubDoc(u, 'settings', 'main') : null
}

export async function getSettings(): Promise<Settings> {
  const u = requireUid()
  const snap = await getDoc(userSubDoc(u, 'settings', 'main'))
  if (!snap.exists()) throw new Error('Settings not initialised — bootstrap must run first')
  return snap.data() as Settings
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const u = requireUid()
  const ref = userSubDoc(u, 'settings', 'main')
  const snap = await getDoc(ref)
  const current = snap.exists() ? (snap.data() as Settings) : null
  const merged = { ...current, ...patch, id: 'main' } as Settings
  await setDoc(ref, clean(merged))
}

export async function completeOnboarding(): Promise<void> {
  await updateSettings({ onboardingCompleted: true })
}
