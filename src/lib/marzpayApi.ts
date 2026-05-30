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
