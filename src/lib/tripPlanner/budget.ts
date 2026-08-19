import { RESTAURANT_CATEGORY, type CatalogService } from './types'

export const UGX_PER_USD = 3700

export type NamedBudget = {
  amount: number
  currency: 'USD' | 'UGX'
}

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0
  return Number(raw.replace(/,/g, ''))
}

export function parseBudget(text?: string | null): NamedBudget | null {
  if (!text) return null
  const usd = text.match(/\$\s*([\d,]+(?:\.\d+)?)|\b([\d,]+(?:\.\d+)?)\s*(?:usd|dollars?)\b/i)
  if (usd) {
    const amount = parseAmount(usd[1] || usd[2])
    if (amount > 0) return { amount, currency: 'USD' }
  }
  const ugx = text.match(/\b(?:ugx|ush)\s*([\d,]+(?:\.\d+)?)|\b([\d,]+(?:\.\d+)?)\s*(?:ugx|ush)\b/i)
  if (ugx) {
    const amount = parseAmount(ugx[1] || ugx[2])
    if (amount > 0) return { amount, currency: 'UGX' }
  }
  return null
}

export function toUgx(amount: number, currency: string): number {
  return currency.toUpperCase() === 'USD' ? amount * UGX_PER_USD : amount
}

export function priceInUgx(service: Pick<CatalogService, 'price' | 'currency'>): number {
  return toUgx(Number(service.price) || 0, service.currency || 'UGX')
}

export function serviceFitsBudget(service: CatalogService, budget: NamedBudget | null): boolean {
  if (!budget) return true
  if (service.category_id === RESTAURANT_CATEGORY) return true
  return priceInUgx(service) <= toUgx(budget.amount, budget.currency)
}

export function formatBudget(budget: NamedBudget): string {
  return budget.currency === 'USD' ? `$${budget.amount}` : `${budget.amount} UGX`
}
