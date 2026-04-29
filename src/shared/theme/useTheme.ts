import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
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

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      palette: 'horion',
      modePref: 'auto', /* per client: que cambie automático según el sistema */
      hidePrivate: false,
      setPalette: (palette) => set({ palette }),
      setMode: (modePref) => set({ modePref }),
      toggleHidePrivate: () => set((s) => ({ hidePrivate: !s.hidePrivate })),
    }),
    {
      name: 'horion-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

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
