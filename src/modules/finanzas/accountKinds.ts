import type { AccountKind, CurrencyCode } from '@/data/types'
import type { IconName } from '@shared/icons/Icon'

/** UI metadata for each account kind: human label, default colors, default
 *  currency, and which icon to render. Adding a new kind = add an entry here,
 *  add it to `AccountKind` in types, and the rest of the UI picks it up. */
export interface AccountKindMeta {
  label: string
  short: string
  /** Background color of the account card hero (in dark mode). */
  bg: string
  /** Foreground / accent on top of `bg`. */
  fg: string
  /** Icon shown next to the account name. */
  icon: IconName
  /** Sensible default currency when the user picks this kind. */
  defaultCurrency: CurrencyCode
}

export const ACCOUNT_KIND_META: Record<AccountKind, AccountKindMeta> = {
  cash:        { label: 'Efectivo',     short: 'Efectivo',  bg: '#1F4036', fg: '#9DE6CB', icon: 'wallet',   defaultCurrency: 'COP' },
  nequi:       { label: 'Nequi',        short: 'Nequi',     bg: '#2A0F3D', fg: '#D6A6FF', icon: 'wallet',   defaultCurrency: 'COP' },
  daviplata:   { label: 'Daviplata',    short: 'Daviplata', bg: '#3D0E16', fg: '#FF8FA1', icon: 'wallet',   defaultCurrency: 'COP' },
  bancolombia: { label: 'Bancolombia',  short: 'Bcolombia', bg: '#2E2510', fg: '#FFD980', icon: 'wallet',   defaultCurrency: 'COP' },
  bank:        { label: 'Cuenta banco', short: 'Banco',     bg: '#101F36', fg: '#9DC4FF', icon: 'wallet',   defaultCurrency: 'COP' },
  savings:     { label: 'Ahorros',      short: 'Ahorros',   bg: '#1A2E16', fg: '#A8E89C', icon: 'lock',     defaultCurrency: 'COP' },
  paypal:      { label: 'PayPal',       short: 'PayPal',    bg: '#0E1F3A', fg: '#7FB0FF', icon: 'globe',    defaultCurrency: 'USD' },
  crypto:      { label: 'Cripto',       short: 'Cripto',    bg: '#2C1A0E', fg: '#FFB780', icon: 'sparkle',  defaultCurrency: 'USD' },
  other:       { label: 'Otra',         short: 'Otra',      bg: '#1F1620', fg: '#E8C0FF', icon: 'wallet',   defaultCurrency: 'COP' },
}

/** Order shown in the "kind picker" — most common first for the Colombian user. */
export const ACCOUNT_KIND_ORDER: AccountKind[] = [
  'cash', 'nequi', 'daviplata', 'bancolombia', 'bank', 'savings', 'paypal', 'crypto', 'other',
]
