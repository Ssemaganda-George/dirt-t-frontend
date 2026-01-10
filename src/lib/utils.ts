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