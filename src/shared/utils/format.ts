import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CurrencyCode } from '@/data/types'

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  COP: '$',
  EUR: '€',
  USD: 'US$',
  PLN: 'zł',
}

/** Returns sensible decimal precision per currency.
 *  COP shows no decimals (cents are noise), USD/EUR show 2 to be readable. */
export function currencyMaxFractionDigits(currency: CurrencyCode): number {
  return currency === 'COP' || currency === 'PLN' ? 0 : 2
}

export function formatMoney(amount: number, currency: CurrencyCode = 'EUR'): string {
  const sym = CURRENCY_SYMBOLS[currency]
  const max = currencyMaxFractionDigits(currency)
  const fmt = new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: max,
    minimumFractionDigits: 0,
  }).format(Math.abs(amount))
  return `${amount < 0 ? '−' : ''}${sym}${fmt}`
}

/** Same as formatMoney but rounds tiny near-zero results so we don't show "$0,01". */
export function formatMoneyRound(amount: number, currency: CurrencyCode = 'COP'): string {
  const max = currencyMaxFractionDigits(currency)
  const factor = Math.pow(10, max)
  const rounded = Math.round(amount * factor) / factor
  return formatMoney(rounded, currency)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isoMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

/** Increment/decrement a YYYY-MM string by N months. */
export function shiftMonth(yyyymm: string, byMonths: number): string {
  const [y, m] = yyyymm.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + byMonths, 1))
  const yy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${yy}-${mm}`
}

/** Pretty label for a YYYY-MM string, e.g. "Abril 2026". */
export function formatMonthLong(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return format(d, 'LLLL yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())
}

export function formatDateLong(iso: string): string {
  return format(parseISO(iso), 'd MMM yyyy', { locale: es })
}

export function formatDateShort(iso: string): string {
  return format(parseISO(iso), 'd MMM', { locale: es })
}

export function formatDateRelative(iso: string): string {
  const d = parseISO(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Mañana'
  if (diffDays === -1) return 'Ayer'
  if (diffDays > 1 && diffDays <= 7) return `En ${diffDays} días`
  return formatDateShort(iso)
}

export function dayOfMonth(): number {
  return new Date().getDate()
}
