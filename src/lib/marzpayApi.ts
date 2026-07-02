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

export type MarzpayCollectPayload = {
  amount: number
  method?: MarzpayMethod
  phone_number?: string
  description: string
  user_id?: string
  booking_id?: string
  order_id?: string
}

export type MarzpayCollectResult = {
  reference: string
  redirect_url?: string
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
