import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  try {
    // Validate currency code - only allow known valid codes
    const validCurrencies = ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF'];
    const safeCurrency = validCurrencies.includes(currency) ? currency : 'UGX';
    
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback to simple formatting if Intl.NumberFormat fails
    console.warn('Currency formatting failed for:', currency, 'falling back to UGX');
    return `UGX ${amount.toLocaleString('en-UG')}`;
  }
}

// Convert between currencies using a simple static rates table (base: UGX)
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
  const exchangeRates: { [key: string]: number } = {
    'UGX': 1,
    'USD': 0.00027,
    'EUR': 0.00025,
    'GBP': 0.00021,
    'KES': 0.0023,
    'TZS': 0.00064,
    'RWF': 0.0010,
    'BRL': 0.0014,
    'MXN': 0.0054,
    'EGP': 0.0084,
    'MAD': 0.0025,
    'TRY': 0.0089,
    'THB': 0.0077,
    'KRW': 0.33,
    'RUB': 0.019,
    'INR': 0.022,
    'CNY': 0.0019,
    'JPY': 0.039,
    'CAD': 0.00036,
    'AUD': 0.00037,
    'CHF': 0.00024,
    'SEK': 0.0024,
    'NOK': 0.0024,
    'DKK': 0.0017,
    'PLN': 0.0011,
    'CZK': 0.0064,
    'HUF': 0.088,
    'ZAR': 0.0048,
    'NGN': 0.11,
    'GHS': 0.0037,
    'XAF': 0.16,
    'XOF': 0.16
  }

  if (fromCurrency === toCurrency) return amount
  const fromRate = exchangeRates[fromCurrency] || 1
  const toRate = exchangeRates[toCurrency] || 1
  const amountInUGX = fromCurrency === 'UGX' ? amount : amount / fromRate
  return amountInUGX * toRate
}

export function formatCurrencyWithConversion(
  amount: number,
  serviceCurrency: string,
  targetCurrency: string = 'UGX',
  locale: string = 'en-US'
) {
  const converted = convertCurrency(amount, serviceCurrency, targetCurrency)
  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(converted)
  } catch (error) {
    return `${targetCurrency} ${converted.toLocaleString()}`
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