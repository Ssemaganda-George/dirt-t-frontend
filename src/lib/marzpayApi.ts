import { isValidUgMobileMoneyPhone } from './bookingFormValidation'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

/** Poll MarzPay payment status (edge function allows anonymous read by reference). */
export async function fetchMarzpayPaymentStatus(
  reference: string
): Promise<'completed' | 'failed' | null> {
  try {
    const url = `${supabaseUrl}/functions/v1/marzpay-payment-status?reference=${encodeURIComponent(reference)}&_ts=${Date.now()}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${supabaseAnonKey}` },
    })
    const data = (await res.json().catch(() => ({}))) as { status?: string }
    if (data?.status === 'completed') return 'completed'
    if (data?.status === 'failed') return 'failed'
    return null
  } catch {
    return null
  }
}

export type MarzpayMethod = 'mobile_money' | 'card'

export function isMobileUiMethod(method: string): boolean {
  return method === 'mobile' || method === 'mobile_money'
}

export function isPaidOnlineMethod(method: string): boolean {
  return isMobileUiMethod(method) || method === 'card'
}

export function toMarzpayMethod(method: string): MarzpayMethod {
  return method === 'card' ? 'card' : 'mobile_money'
}

export type MarzpayCollectResult = {
  reference: string
  redirect_url?: string
}

export function redirectMarzpayIfNeeded(result: MarzpayCollectResult): boolean {
  if (!result.redirect_url) return false
  window.location.assign(result.redirect_url)
  return true
}

export type MarzpayCollectPayload = {
  amount: number
  method?: MarzpayMethod
  phone_number?: string
  description: string
  user_id?: string
  booking_id?: string
  order_id?: string
  metadata?: Record<string, unknown>
}

export type MarzpayUiMethod = 'mobile' | 'card' | 'mobile_money'

export type MarzpayPaymentFieldsValue = {
  method: MarzpayUiMethod
  phone: string
  provider: 'MTN' | 'Airtel' | ''
}

/** Normalize Ugandan mobile money number to +256… */
export function normalizeMarzpayPhone(raw: string): string {
  const trimmed = raw.trim().replace(/^\+256/, '')
  return trimmed.startsWith('+') ? trimmed : `+256${trimmed.replace(/^0/, '')}`
}

export function detectMarzpayProvider(val: string): 'MTN' | 'Airtel' | '' {
  const d = val.replace(/\D/g, '').replace(/^256/, '').replace(/^0/, '')
  const p = d.slice(0, 2)
  if (['76', '77', '78', '39', '46', '31'].includes(p)) return 'MTN'
  if (['70', '74', '75', '20', '50'].includes(p)) return 'Airtel'
  return ''
}

export function getMarzpayMobileValidationErrors(
  value: Pick<MarzpayPaymentFieldsValue, 'phone' | 'provider'>
): { phone?: string; mobileProvider?: string } {
  const errs: { phone?: string; mobileProvider?: string } = {}
  if (!value.provider) errs.mobileProvider = 'Select MTN or Airtel.'
  if (!value.phone.trim()) errs.phone = 'Mobile money number is required.'
  else if (!isValidUgMobileMoneyPhone(value.phone)) errs.phone = 'Enter a valid number (e.g. 0712345678).'
  return errs
}

export function isCardUiMethod(method: string): boolean {
  return method === 'card'
}

/** Start MarzPay collect; returns reference and optional card redirect URL. */
export async function initiateMarzpayCollect(payload: MarzpayCollectPayload): Promise<MarzpayCollectResult> {
  const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(payload),
  })

  const result = (await collectRes.json().catch(() => ({}))) as {
    success?: boolean
    error?: string
    details?: unknown
    data?: { reference: string; redirect_url?: string }
  }

  if (!collectRes.ok) {
    const msg = result?.error || `Payment initiation failed (${collectRes.status})`
    if (result?.details) console.warn('MarzPay collect details:', result.details)
    throw new Error(msg)
  }
  if (!result?.success || !result?.data?.reference) {
    throw new Error(result?.error || 'Payment initiation failed')
  }

  return {
    reference: result.data.reference,
    redirect_url: result.data.redirect_url,
  }
}
