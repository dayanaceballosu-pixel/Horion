import { create } from 'zustand'
import { updateSettings } from '@/data/repositories/settings'
import { TUTORIAL_STEPS } from './steps'

interface TutorialState {
  /** Index into TUTORIAL_STEPS, or null when the tour is inactive. */
  active: number | null
  start: () => void
  next: () => void
  prev: () => void
  /** Skip the rest of the tour and persist `tutorialCompleted: true`. */
  skip: () => void
  /** Mark complete and persist. */
  complete: () => void
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: null,
  start: () => set({ active: 0 }),
  next: () => {
    const i = get().active
    if (i === null) return
    if (i + 1 >= TUTORIAL_STEPS.length) {
      get().complete()
      return
    }
    set({ active: i + 1 })
  },
  prev: () => {
    const i = get().active
    if (i === null || i <= 0) return
    set({ active: i - 1 })
  },
  skip: () => {
    set({ active: null })
    /* Persist outside the render cycle — failure shouldn't break the UI. */
    void updateSettings({ tutorialCompleted: true }).catch(() => undefined)
  },
  complete: () => {
    set({ active: null })
    void updateSettings({ tutorialCompleted: true }).catch(() => undefined)
  },
}))
