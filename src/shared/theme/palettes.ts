export type PaletteKey = 'horion' | 'hotpink' | 'rose' | 'fuchsia'
export type ThemeModePreference = 'light' | 'dark' | 'auto'
export type ThemeMode = 'light' | 'dark'

/** Resolves the user's preference (which may be 'auto') to a concrete light/dark
 *  by checking the system preference at this moment. */
export function resolveMode(pref: ThemeModePreference): ThemeMode {
  if (pref === 'light' || pref === 'dark') return pref
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export interface Palette {
  name: string
  pink: string
  pinkSoft: string
  pinkPale: string
  pinkInk: string
}

export const PALETTES: Record<PaletteKey, Palette> = {
  horion: {
    name: 'Horión Signature',
    pink: '#E8779A',
    pinkSoft: '#F2B5C8',
    pinkPale: '#FCE8EE',
    pinkInk: '#0A0204',
  },
  hotpink: {
    name: 'Hot Pink Editorial',
    pink: '#FF2E7E',
    pinkSoft: '#FFD9E6',
    pinkPale: '#FFF1F5',
    pinkInk: '#1A0810',
  },
  rose: {
    name: 'Soft Rose',
    pink: '#FF7AA8',
    pinkSoft: '#FBDCE5',
    pinkPale: '#FCF2F5',
    pinkInk: '#170A10',
  },
  fuchsia: {
    name: 'Fuchsia Magazine',
    pink: '#E5005C',
    pinkSoft: '#FFC1D6',
    pinkPale: '#FFE9F0',
    pinkInk: '#15050B',
  },
}

export interface Theme {
  pal: Palette
  bg: string
  bgElev: string
  bgCard: string
  bgInset: string
  ink: string
  inkMute: string
  inkFaint: string
  hairline: string
  accent: string
  accentSoft: string
  accentPale: string
  onAccent: string
  mode: ThemeMode
}

export function buildTheme(palKey: PaletteKey, mode: ThemeMode): Theme {
  const p = PALETTES[palKey] ?? PALETTES.horion
  if (mode === 'dark') {
    return {
      pal: p,
      bg: '#080304',
      bgElev: '#120709',
      bgCard: '#190B0F',
      bgInset: '#0E0506',
      ink: '#FCE8EE',
      inkMute: 'rgba(252,232,238,0.62)',
      inkFaint: 'rgba(252,232,238,0.30)',
      hairline: 'rgba(232,119,154,0.14)',
      accent: p.pink,
      accentSoft: p.pinkSoft,
      accentPale: 'rgba(232,119,154,0.16)',
      onAccent: '#0A0204',
      mode: 'dark',
    }
  }
  return {
    pal: p,
    bg: '#FBF6F8',
    bgElev: '#FFFFFF',
    bgCard: '#FFFFFF',
    bgInset: '#F5EBEF',
    ink: '#0A0204',
    inkMute: 'rgba(10,2,4,0.58)',
    inkFaint: 'rgba(10,2,4,0.30)',
    hairline: 'rgba(10,2,4,0.08)',
    accent: p.pink,
    accentSoft: p.pinkSoft,
    accentPale: p.pinkPale,
    onAccent: '#FFFFFF',
    mode: 'light',
  }
}

export const FONT_DISPLAY = "'Fraunces Variable', 'Fraunces', 'Times New Roman', serif"
export const FONT_SANS = "'Geist Variable', 'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
export const FONT_MONO = "'Geist Mono Variable', 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace"
