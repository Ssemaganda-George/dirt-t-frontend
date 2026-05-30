// Live exchange rates from Frankfurter (https://www.frankfurter.app)
// All rates are stored relative to UGX: 1 UGX = X foreign currency
// Rates are fetched once per session and cached for 4 hours.

const CACHE_TTL_MS = 4 * 60 * 60 * 1000

const SUPPORTED = [
  'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF', 'INR', 'CNY', 'JPY',
  'CAD', 'AUD', 'CHF', 'ZAR', 'NGN', 'GHS', 'BRL', 'MXN', 'EGP',
  'MAD', 'TRY', 'THB', 'KRW', 'SEK', 'NOK', 'DKK', 'PLN',
]

// Static fallback rates — used when Frankfurter is unreachable
export const FALLBACK_RATES: Record<string, number> = {
  UGX: 1,
  USD: 0.00027, EUR: 0.00025, GBP: 0.00021,
  KES: 0.035,   TZS: 0.64,    RWF: 0.30,
  INR: 0.022,   CNY: 0.0019,  JPY: 0.039,
  CAD: 0.00036, AUD: 0.00037, CHF: 0.00024,
  ZAR: 0.0048,  NGN: 0.44,    GHS: 0.0037,
  BRL: 0.0014,  MXN: 0.0054,  EGP: 0.013,
  MAD: 0.0025,  TRY: 0.0089,  THB: 0.0094,
  KRW: 0.36,    SEK: 0.0028,  NOK: 0.0028,
  DKK: 0.0018,  PLN: 0.0011,
}

let cachedRates: Record<string, number> = { ...FALLBACK_RATES }
let fetchedAt = 0

export async function initCurrencyRates(): Promise<void> {
  if (Date.now() - fetchedAt < CACHE_TTL_MS) return
  try {
    const url = `https://api.frankfurter.app/latest?from=UGX&to=${SUPPORTED.join(',')}`
    const res = await fetch(url)
    if (!res.ok) return
    const json: { rates?: Record<string, number> } = await res.json()
    if (json.rates && typeof json.rates === 'object') {
      cachedRates = { UGX: 1, ...json.rates }
      fetchedAt = Date.now()
    }
  } catch {
    // API unreachable — keep using fallback, try again next render cycle
  }
}

export function getRate(currency: string): number {
  return cachedRates[currency] ?? FALLBACK_RATES[currency] ?? 1
}
