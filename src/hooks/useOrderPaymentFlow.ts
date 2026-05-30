import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { fetchMarzpayPaymentStatus } from '../lib/marzpayApi'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const BACKOFF_DELAYS_MS = [500, 1000, 2000, 4000, 8000, 16000, 32000]
const POLL_TIMEOUT_MS = 90_000

async function checkPaymentStatus(ref: string): Promise<'completed' | 'failed' | null> {
  return fetchMarzpayPaymentStatus(ref)
}

export function useOrderPaymentFlow(orderId: string | undefined) {
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [pollingMessage, setPollingMessage] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const paymentChannelRef = useRef<RealtimeChannel | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const completionHandledRef = useRef(false)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      paymentChannelRef.current?.unsubscribe()
      paymentChannelRef.current = null
    }
  }, [])

  const startWatchingReference = useCallback(async (ref: string) => {
    completionHandledRef.current = false
    setPollingMessage('Check your phone — a USSD prompt should appear shortly.')

    abortControllerRef.current?.abort()
    const abort = new AbortController()
    abortControllerRef.current = abort

    const messages: [number, string][] = [
      [8000, 'Enter your PIN on the USSD prompt to confirm payment.'],
      [20000, 'Still waiting… Airtel payments can take up to 60 seconds.'],
      [40000, 'Almost there — waiting for network confirmation.'],
      [65000, 'Taking longer than usual. If no prompt appeared, you can retry.'],
    ]
    for (const [delay, msg] of messages) {
      setTimeout(() => {
        if (!abort.signal.aborted && !completionHandledRef.current) setPollingMessage(msg)
      }, delay)
    }

    const cleanup = () => {
      abort.abort()
      paymentChannelRef.current?.unsubscribe()
      paymentChannelRef.current = null
    }

    const handleCompleted = () => {
      if (completionHandledRef.current) return
      completionHandledRef.current = true
      cleanup()
      setProcessing(false)
      setPollingMessage('')
      setPaymentSuccess(true)
    }

    const handleFailed = () => {
      if (completionHandledRef.current) return
      completionHandledRef.current = true
      cleanup()
      setPollingMessage('')
      setProcessing(false)
      setPaymentError('Payment was not completed or was declined. Please try again.')
    }

    const channel = supabase
      .channel(`payment_${ref}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `reference=eq.${ref}` },
        (payload) => {
          const row = payload.new as { status: string }
          if (row.status === 'completed') handleCompleted()
          else if (row.status === 'failed') handleFailed()
        }
      )
      .subscribe()
    paymentChannelRef.current = channel

    ;(async () => {
      const deadline = Date.now() + POLL_TIMEOUT_MS
      for (let i = 0; i < BACKOFF_DELAYS_MS.length; i++) {
        await new Promise<void>(r => setTimeout(r, BACKOFF_DELAYS_MS[i]))
        if (abort.signal.aborted || completionHandledRef.current) return
        if (Date.now() > deadline) return
        const status = await checkPaymentStatus(ref)
        if (abort.signal.aborted) return
        if (status === 'completed') { handleCompleted(); return }
        if (status === 'failed') { handleFailed(); return }
      }
    })()
  }, [])

  const payOrder = useCallback(async (params: {
    order: any
    items: any[]
    ticketCalculations: Record<string, any>
    totalAmount: number
    ticketPricingReady: boolean
    phone: string
    guestEmail: string
    guestName: string
  }) => {
    const { order, items, ticketCalculations, totalAmount, ticketPricingReady, phone, guestEmail, guestName } = params
    if (!orderId || !order) return

    setPaymentError(null)
    if (!ticketPricingReady) {
      setPaymentError('Pricing is still loading. Please wait a moment and try again.')
      return
    }
    if (!phone || phone.length < 10) {
      setPaymentError('Please enter a valid mobile money phone number (e.g. 0712345678).')
      return
    }

    const totalWithFee = Math.round(totalAmount)
    const activeItems = items.filter((it: any) => Number(it.quantity ?? 0) > 0)

    let orderPatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      guest_name: guestName.trim() || order.guest_name || null,
      guest_email: guestEmail.trim() || order.guest_email || null,
      guest_phone: phone,
    }

    if (activeItems.length > 0) {
      let platformFeeSum = 0
      let vendorPayoutSum = 0
      let basePriceSum = 0
      let feePayer: string | null = null
      let pricingSource: string | null = null
      let pricingReferenceId: string | null = null

      for (const it of activeItems) {
        const qty = Number(it.quantity ?? 0)
        const calc = ticketCalculations[it.ticket_type_id]
        if (!calc || calc.success === false) {
          setPaymentError('Pricing is still loading. Please wait a moment and try again.')
          return
        }
        platformFeeSum += Number(calc.platform_fee || 0) * qty
        vendorPayoutSum += Number(calc.vendor_payout || 0) * qty
        basePriceSum += Number(calc.base_price || 0) * qty
        if (feePayer === null) feePayer = String(calc.fee_payer || 'vendor')
        if (pricingSource === null) pricingSource = String(calc.pricing_source || 'tier')
        if (!pricingReferenceId && calc.pricing_reference_id) pricingReferenceId = String(calc.pricing_reference_id)
      }

      orderPatch = {
        ...orderPatch,
        total_amount: totalWithFee,
        base_price: Math.round(basePriceSum),
        platform_fee: Math.round(platformFeeSum),
        vendor_payout: Math.round(vendorPayoutSum),
        fee_payer: feePayer,
        pricing_source: pricingSource,
        pricing_reference_id: pricingReferenceId,
      }
    }

    const { error: orderUpdateErr } = await supabase.from('orders').update(orderPatch).eq('id', orderId)
    if (orderUpdateErr) {
      setPaymentError('Could not save order before payment. Please try again.')
      return
    }

    setProcessing(true)
    setPollingMessage('')
    try {
      const { data: session } = await supabase.auth.getSession()
      const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          amount: totalWithFee,
          phone_number: phone,
          order_id: orderId,
          description: `Order #${order.reference || orderId.slice(0, 8)} payment`,
          user_id: session?.session?.user?.id || undefined,
        }),
      })

      const result = (await collectRes.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        data?: { reference: string }
      }

      if (!collectRes.ok || !result?.success || !result?.data?.reference) {
        throw new Error(result?.error || 'Payment initiation failed')
      }

      await startWatchingReference(result.data.reference)
    } catch (err) {
      setProcessing(false)
      setPollingMessage('')
      setPaymentError((err as Error).message || 'Payment failed. Please try again.')
    }
  }, [orderId, startWatchingReference])

  return {
    processing,
    paymentError,
    setPaymentError,
    pollingMessage,
    paymentSuccess,
    setPaymentSuccess,
    payOrder,
    startWatchingReference,
  }
}
