import { db } from '../db'
import type { CurrencyCode, DisplayCurrency, MoneySnapshot } from '../types'

/**
 * Conservative offline-first fallback rates so the app keeps working
 * with no network. These are intentionally rough — when online we
 * refresh them via exchangerate.host and persist.
 *
 * Last hand-tuned: 2026-04-28.
 */
const FALLBACK: Record<CurrencyCode, Record<CurrencyCode, number>> = {
  COP: { COP: 1, EUR: 0.000222, USD: 0.000241, PLN: 0.000965 },
  EUR: { COP: 4500, EUR: 1, USD: 1.08, PLN: 4.3 },
  USD: { COP: 4150, EUR: 0.92, USD: 1, PLN: 4.0 },
  PLN: { COP: 1036, EUR: 0.232, USD: 0.25, PLN: 1 },
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000

function key(base: CurrencyCode, quote: CurrencyCode): string {
  return `${base}-${quote}`
}

export async function getRate(base: CurrencyCode, quote: CurrencyCode): Promise<number> {
  if (base === quote) return 1
  const cached = await db.fxRates.get(key(base, quote))
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached.rate
  /* Try to refresh in background; return whatever we have right now. */
  refreshRate(base, quote).catch(() => undefined)
  if (cached) return cached.rate
  return FALLBACK[base][quote] ?? 1
}

export async function refreshRate(base: CurrencyCode, quote: CurrencyCode): Promise<number | null> {
  if (!navigator.onLine) return null
  try {
    const resp = await fetch(`https://api.exchangerate.host/convert?from=${base}&to=${quote}`)
    if (!resp.ok) return null
    const json = (await resp.json()) as { result?: number }
    if (typeof json.result !== 'number') return null
    await db.fxRates.put({
      id: key(base, quote),
      base,
      quote,
      rate: json.result,
      fetchedAt: Date.now(),
    })
    return json.result
  } catch {
    return null
  }
}

export async function convert(amount: number, from: CurrencyCode, to: CurrencyCode): Promise<number> {
  const rate = await getRate(from, to)
  return amount * rate
}

/**
 * Builds a 3-currency snapshot (COP, USD, EUR) from an amount in its original
 * currency, using LIVE rates if available, falling back to cached/hardcoded
 * rates if the network refresh fails. The result is meant to be persisted
 * alongside the transaction so historical totals never drift.
 */
export async function buildSnapshot(amount: number, original: DisplayCurrency): Promise<MoneySnapshot> {
  const targets: DisplayCurrency[] = ['COP', 'USD', 'EUR']
  const out: MoneySnapshot = { COP: 0, USD: 0, EUR: 0 }
  for (const target of targets) {
    if (target === original) {
      out[target] = amount
      continue
    }
    const fresh = await refreshRate(original, target)
    const rate = fresh ?? (await getRate(original, target))
    out[target] = amount * rate
  }
  return out
}
