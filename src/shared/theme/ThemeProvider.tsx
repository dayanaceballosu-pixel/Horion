import { useEffect, type ReactNode } from 'react'
import { useTheme } from './useTheme'
import { FONT_DISPLAY, FONT_MONO, FONT_SANS } from './palettes'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme()

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--bg', theme.bg)
    root.style.setProperty('--bg-elev', theme.bgElev)
    root.style.setProperty('--bg-card', theme.bgCard)
    root.style.setProperty('--bg-inset', theme.bgInset)
    root.style.setProperty('--ink', theme.ink)
    root.style.setProperty('--ink-mute', theme.inkMute)
    root.style.setProperty('--ink-faint', theme.inkFaint)
    root.style.setProperty('--hairline', theme.hairline)
    root.style.setProperty('--accent', theme.accent)
    root.style.setProperty('--accent-soft', theme.accentSoft)
    root.style.setProperty('--accent-pale', theme.accentPale)
    root.style.setProperty('--on-accent', theme.onAccent)
    root.style.setProperty('--font-display', FONT_DISPLAY)
    root.style.setProperty('--font-sans', FONT_SANS)
    root.style.setProperty('--font-mono', FONT_MONO)
    root.dataset.theme = theme.mode

    // Update theme-color meta to match current bg for nice browser chrome
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme.mode === 'dark' ? '#0A0204' : '#FBF6F8')
  }, [theme])

  return <>{children}</>
}
