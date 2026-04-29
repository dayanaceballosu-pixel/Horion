import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { settingsRef, updateSettings } from '@/data/repositories/settings'
import { useDoc } from '@shared/hooks/useFirestore'
import type { Settings } from '@/data/types'
import {
  buildTheme,
  resolveMode,
  type PaletteKey,
  type Theme,
  type ThemeMode,
  type ThemeModePreference,
} from './palettes'

interface ThemeStore {
  palette: PaletteKey
  modePref: ThemeModePreference
  hidePrivate: boolean
  setPalette: (p: PaletteKey) => void
  setMode: (m: ThemeModePreference) => void
  toggleHidePrivate: () => void
}

/**
 * Local cache of the theme. Persisted in localStorage so the first paint of
 * the next session shows the right colors immediately, with no flash of the
 * default theme while Firestore loads. The Firestore Settings doc is the
 * source of truth — see `useThemeSync` below — but this layer keeps reads
 * synchronous and instantaneous.
 *
 * Setters write locally and fire-and-forget to Firestore so the change
 * propagates to other devices. If the network is down or the user is not
 * signed in, the local update still applies.
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      palette: 'horion',
      modePref: 'auto', /* per client: que cambie automático según el sistema */
      hidePrivate: false,
      setPalette: (palette) => {
        set({ palette })
        void updateSettings({ palette }).catch(() => undefined)
      },
      setMode: (modePref) => {
        set({ modePref })
        void updateSettings({ modePref }).catch(() => undefined)
      },
      toggleHidePrivate: () => set((s) => ({ hidePrivate: !s.hidePrivate })),
    }),
    {
      name: 'horion-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

/**
 * Two-way bridge between the Firestore Settings doc and the local theme
 * store. Mount once in the authenticated shell.
 *
 *   - Firestore → local: when the doc changes (e.g. another device flipped
 *     the palette), update the local store so this device repaints.
 *   - Local → Firestore: on first connection, if the doc is missing the new
 *     fields (legacy users), upload the local preference. Direct user
 *     changes already write through via the setters above.
 */
export function useThemeSync(): void {
  const settings = useDoc<Settings>(() => settingsRef(), [])
  const seededRef = useRef(false)

  useEffect(() => {
    if (!settings) return
    const remotePalette = settings.palette
    const remoteMode = settings.modePref
    const local = useThemeStore.getState()

    /* Firestore → local: only patch when remote actually has a value AND it
       differs, to avoid stomping fresh local edits with stale snapshots. */
    if (remotePalette && remotePalette !== local.palette) {
      useThemeStore.setState({ palette: remotePalette })
    }
    if (remoteMode && remoteMode !== local.modePref) {
      useThemeStore.setState({ modePref: remoteMode })
    }

    /* Local → Firestore: legacy doc has neither field; push the local
       preference up so future devices read the user's actual choice. */
    if (!seededRef.current && remotePalette === undefined && remoteMode === undefined) {
      seededRef.current = true
      void updateSettings({ palette: local.palette, modePref: local.modePref }).catch(() => undefined)
    }
  }, [settings])
}

/** Reactively resolves the current ThemeMode, listening to system preference changes when 'auto'. */
function useResolvedMode(pref: ThemeModePreference): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() => resolveMode(pref))

  useEffect(() => {
    setMode(resolveMode(pref))
    if (pref !== 'auto') return
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => setMode(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [pref])

  return mode
}

export function useTheme(): Theme {
  const palette = useThemeStore((s) => s.palette)
  const pref = useThemeStore((s) => s.modePref)
  const mode = useResolvedMode(pref)
  return buildTheme(palette, mode)
}
