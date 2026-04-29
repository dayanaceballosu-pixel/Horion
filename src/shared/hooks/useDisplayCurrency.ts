import { settingsRef, updateSettings } from '@/data/repositories/settings'
import type { DisplayCurrency, Settings } from '@/data/types'
import { useDoc } from './useFirestore'

/**
 * Reactive accessor for the user's chosen display currency. Persists in
 * Firestore so the choice survives across devices and sessions, and so any
 * screen rendering totals re-renders automatically when the user flips it.
 */
export function useDisplayCurrency(): {
  currency: DisplayCurrency
  setCurrency: (c: DisplayCurrency) => Promise<void>
} {
  const settings = useDoc<Settings>(() => settingsRef(), [])
  const currency: DisplayCurrency = settings?.displayCurrency ?? 'COP'
  return {
    currency,
    setCurrency: async (c) => {
      await updateSettings({ displayCurrency: c })
    },
  }
}
