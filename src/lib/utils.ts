import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getRate } from './currencyRates'

/** ISO-like codes we accept for service pricing and bookings. */
export const VALID_SERVICE_CURRENCIES = [
  'UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF', 'INR', 'CNY', 'JPY',
  'CAD', 'AUD', 'CHF', 'ZAR', 'NGN', 'GHS', 'BRL', 'MXN', 'EGP',
  'MAD', 'TRY', 'THB', 'KRW', 'SEK', 'NOK', 'DKK', 'PLN',
] as const

/** Vendors sometimes store labels (e.g. "Hand made") in currency — coerce to UGX. */
export function normalizeServiceCurrency(currency: string | null | undefined): string {
  const code = (currency || '').trim().toUpperCase()
  return (VALID_SERVICE_CURRENCIES as readonly string[]).includes(code) ? code : 'UGX'
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  try {
    // Validate currency code - only allow known valid codes
    const validCurrencies = VALID_SERVICE_CURRENCIES as readonly string[]
    const safeCurrency = validCurrencies.includes(currency) ? currency : 'UGX'
    
    const noDecimals = ['UGX', 'KES', 'TZS', 'RWF', 'NGN', 'GHS', 'EGP', 'MAD']
    const decimals = noDecimals.includes(safeCurrency) ? 0 : 2
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch (error) {
    // Fallback to simple formatting if Intl.NumberFormat fails
    console.warn('Currency formatting failed for:', currency, 'falling back to UGX');
    return `UGX ${amount.toLocaleString('en-UG')}`;
  }
}

/** Format tier commission for display (supports percentage and flat) */
export function formatTierCommission(tier: {
  commission_type?: 'percentage' | 'flat';
  commission_value?: number;
  commission_rate?: number;
}, currency = 'UGX'): string {
  if (tier.commission_type === 'flat' && tier.commission_value != null) {
    return `${tier.commission_value.toLocaleString()} ${currency} flat`;
  }
  const pct = tier.commission_value != null
    ? (tier.commission_value > 1 ? tier.commission_value : tier.commission_value * 100)
    : (tier.commission_rate != null ? tier.commission_rate * 100 : 0);
  return `${pct}% commission`;
}

// Convert between currencies using live rates (open.er-api.com, with static fallback).
// Rates are cached in currencyRates.ts and refreshed once per session.
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
  if (fromCurrency === toCurrency) return amount
  const from = normalizeServiceCurrency(fromCurrency)
  const to = normalizeServiceCurrency(toCurrency)
  if (from === to) return amount
  const fromRate = getRate(from)
  const toRate = getRate(to)
  // All rates are expressed as "1 UGX = X foreign", so:
  // amount_in_ugx = fromCurrency === 'UGX' ? amount : amount / fromRate
  const amountInUGX = from === 'UGX' ? amount : amount / fromRate
  return amountInUGX * toRate
}

export function formatCurrencyWithConversion(
  amount: number,
  serviceCurrency: string,
  targetCurrency: string = 'UGX',
  locale: string = 'en-US'
) {
  const from = normalizeServiceCurrency(serviceCurrency)
  const to = normalizeServiceCurrency(targetCurrency)
  const converted = convertCurrency(amount, from, to)
  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: to,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(converted)
  } catch (error) {
    return `${targetCurrency} ${converted.toLocaleString()}`
  }
}

// Return currency and amount parts separately so the UI can style them independently.
export function formatCurrencyPartsWithConversion(
  amount: number,
  serviceCurrency: string,
  targetCurrency: string = 'UGX',
  locale: string = 'en-US'
) {
  const converted = convertCurrency(amount, serviceCurrency, targetCurrency)
  try {
    const nf: any = new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    const parts = nf.formatToParts(converted)
    const currency = parts.filter((p: any) => p.type === 'currency').map((p: any) => p.value).join('')
    // Build amount string from all non-currency and non-literal parts (keeps groups and decimals)
    const amountStr = parts
      .filter((p: any) => p.type !== 'currency' && p.type !== 'literal')
      .map((p: any) => p.value)
      .join('')
    return { currency, amount: amountStr }
  } catch (error) {
    // Fallback: simple split
    const formatted = `${targetCurrency} ${converted.toLocaleString()}`
    const [curr, ...rest] = formatted.split(' ')
    return { currency: curr, amount: rest.join(' ') }
  }
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'confirmed':
    case 'completed':
      return 'text-green-600 bg-green-100'
    case 'pending':
      return 'text-yellow-600 bg-yellow-100'
    case 'rejected':
    case 'cancelled':
    case 'failed':
      return 'text-red-600 bg-red-100'
    case 'suspended':
    case 'inactive':
      return 'text-orange-600 bg-orange-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

export function getVendorDisplayStatus(bookingStatus: string, paymentStatus: string): 'pending' | 'confirmed' | 'cancelled' | 'completed' {
  // For vendors: booking is only "confirmed" if both booking status is confirmed AND payment is paid
  // Otherwise, show as "pending"
  if (bookingStatus === 'confirmed' && paymentStatus === 'paid') {
    return 'confirmed';
  } else if (bookingStatus === 'cancelled') {
    return 'cancelled';
  } else if (bookingStatus === 'completed') {
    return 'completed';
  } else {
    return 'pending';
  }
}

/**
 * Determine the best display price for a service.
 * Priority:
 * 1. Provided ticketTypes array (if any) -> minimum ticket price
 * 2. service.ticket_types property on the service object -> minimum ticket price
 * 3. service.price
 * Returns a safe number (0 when absent/invalid).
 */
export function getDisplayPrice(service: any, ticketTypes?: any[]): number {
  try {
    if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      // prefer positive ticket prices; ignore zero or invalid prices
      const prices = ticketTypes
        .map((t: any) => Number(t?.price ?? 0))
        .filter((p: number) => Number.isFinite(p) && p > 0)
      if (prices.length > 0) return Math.min(...prices)
    }

    if (Array.isArray(service?.ticket_types) && service.ticket_types.length > 0) {
      // prefer positive ticket prices; ignore zero or invalid prices
      const prices = service.ticket_types
        .map((t: any) => Number(t?.price ?? 0))
        .filter((p: number) => Number.isFinite(p) && p > 0)
      if (prices.length > 0) return Math.min(...prices)
    }

    // Check category-specific pricing fields
    const categoryName = service?.service_categories?.name?.toLowerCase()
    // Transport: prefer specialised within/upcountry prices if provided
    if (categoryName === 'transport') {
      const within = Number(service?.price_within_town ?? NaN)
      const upcountry = Number(service?.price_upcountry ?? NaN)
      const candidates: number[] = []
      if (Number.isFinite(within) && within > 0) candidates.push(within)
      if (Number.isFinite(upcountry) && upcountry > 0) candidates.push(upcountry)
      if (candidates.length > 0) return Math.min(...candidates)
    }
    if (categoryName === 'restaurants' && service?.average_cost_per_person) {
      const price = Number(service.average_cost_per_person)
      if (Number.isFinite(price)) return price
    }

    if (categoryName === 'shops') {
      const buy = Number((service as any)?.buy_price || service?.price)
      const rent = Number(service?.rental_price_per_day ?? NaN)
      // prefer buy price on cards so "From" matches the product page primary price
      if (Number.isFinite(buy) && buy > 0) return buy
      if (Number.isFinite(rent) && rent > 0) return rent
    }

    // Fall back to general price field
    let p = service?.price
    if (typeof p === 'string') {
      p = parseFloat(p)
    }
    if (!Number.isFinite(p)) p = 0
    return Number(p)
  } catch (e) {
    return 0
  }
}