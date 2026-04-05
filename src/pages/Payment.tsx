import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatCurrencyWithConversion } from '../lib/utils'
import { calculatePaymentForAmount } from '../lib/pricingService'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useOrderQuery, useOrderQueryClient, orderQueryKey } from '../hooks/useOrderQuery'
import { PageSkeleton } from '../components/SkeletonLoader'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useOrderQuery(orderId)
  const order = data?.order ?? null
  const items = data?.items ?? []
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('mobile_money')
  const [mobileProvider, setMobileProvider] = useState('')
  const [cardNoticeVisible, setCardNoticeVisible] = useState(false)
  const [ticketEmail, setTicketEmail] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const queryClient = useOrderQueryClient()

  const updateTicketQuantity = async (ticketTypeId: string, newQuantity: number) => {
    if (newQuantity < 0 || !orderId) return

    try {
      const existingItem = items.find((it: any) => it.ticket_type_id === ticketTypeId)

      if (existingItem) {
        if (newQuantity === 0) {
          const { error } = await supabase
            .from('order_items')
            .delete()
            .eq('id', existingItem.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('order_items')
            .update({ quantity: newQuantity })
            .eq('id', existingItem.id)
          if (error) throw error
        }
      } else if (newQuantity > 0) {
        // fallback unit_price to existing item price if available
        const fallbackPrice = items.find((it: any) => it.ticket_type_id === ticketTypeId)?.unit_price || 0
        const { error } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            ticket_type_id: ticketTypeId,
            quantity: newQuantity,
            unit_price: fallbackPrice
          })
          .select()
          .single()
        if (error) throw error
      }

      await queryClient.invalidateQueries({ queryKey: orderQueryKey(orderId) })
    } catch (err) {
      console.error('Failed to update ticket quantity (payment page):', err)
      alert('Failed to update ticket quantity. Please try again.')
    }
  }
  
  // Derived totals from current items so UI updates when quantities change
  const subtotalAmount = items.reduce((s: number, it: any) => {
    const unit = Number(it.unit_price ?? it.price ?? 0)
    const qty = Number(it.quantity ?? 0)
    return s + unit * qty
  }, 0)

  const [ticketCalculations, setTicketCalculations] = useState<Record<string, any>>({})

  // Tourist-visible platform charges from tier/ overrides only (tourist_fee), never a synthetic % fallback
  const ticketPricingReady =
    items.length === 0 ||
    items.every(
      (it: any) =>
        Number(it.quantity ?? 0) === 0 ||
        (ticketCalculations[it.ticket_type_id] &&
          ticketCalculations[it.ticket_type_id].success !== false)
    )

  const effectiveServiceFees = items.reduce((sum: number, it: any) => {
    const qty = Number(it.quantity ?? 0)
    if (qty === 0) return sum
    const calc = ticketCalculations[it.ticket_type_id]
    if (!calc || calc.success === false) return sum
    return sum + Number(calc.tourist_fee || 0) * qty
  }, 0)

  const totalAmount = ticketPricingReady
    ? items.reduce((sum: number, it: any) => {
        const qty = Number(it.quantity ?? 0)
        if (qty === 0) return sum
        const calc = ticketCalculations[it.ticket_type_id]
        if (calc && calc.success !== false && typeof calc.total_customer_payment === 'number') {
          return sum + Number(calc.total_customer_payment) * qty
        }
        const unit = Number(it.unit_price ?? it.price ?? 0)
        return sum + unit * qty
      }, 0)
    : subtotalAmount
  // summary toggle removed — details always visible
  const [phoneNumber, setPhoneNumber] = useState('')
  const [paymentReference, setPaymentReference] = useState<string | null>(null)
  const [pollingMessage, setPollingMessage] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const paymentChannelRef = useRef<RealtimeChannel | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const completionHandledRef = useRef(false)
  const [searchParams] = useSearchParams()

  const refFromQuery = searchParams.get('reference')
  const [donationPayment, setDonationPayment] = useState<any | null>(null)

  useEffect(() => {
    if (!refFromQuery) return
    let mounted = true
    const load = async () => {
      try {
        const { data } = await supabase.from('payments').select('*').eq('reference', refFromQuery).maybeSingle()
        if (mounted) setDonationPayment(data || null)
      } catch (e) {
        console.warn('[Payment] failed to fetch payment row for reference', refFromQuery, e)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [refFromQuery])

  const checkStatus = async (ref: string): Promise<'completed' | 'failed' | null> => {
    try {
      const url = `${supabaseUrl}/functions/v1/marzpay-payment-status?reference=${encodeURIComponent(ref)}&_ts=${Date.now()}`
      console.log('[Payment] checkStatus: fetching', { ref, url: url.replace(supabaseUrl, '...') })
      const res = await fetch(url, {
        cache: 'no-store',
      })
      const raw = await res.text()
      console.log('[Payment] checkStatus: response', {
        ok: res.ok,
        status: res.status,
        body: raw?.slice(0, 300),
      })
      const data = (JSON.parse(raw || '{}') as { status?: string; error?: string })
      const result = data?.status === 'completed' ? 'completed' : data?.status === 'failed' ? 'failed' : null
      console.log('[Payment] checkStatus: parsed', { 'data.status': data?.status, result })
      if (data?.status === 'completed') return 'completed'
      if (data?.status === 'failed') return 'failed'
      return null
    } catch (e) {
      console.error('[Payment] checkStatus: error', e)
      return null
    }
  }

  // Exponential backoff delays: 500ms → 1s → 2s → 4s → 8s → 16s → 32s
  // Max 7 polls over 90s vs the previous ~87 polls over 120s (94% reduction)
  const BACKOFF_DELAYS_MS = [500, 1000, 2000, 4000, 8000, 16000, 32000]
  const POLL_TIMEOUT_MS = 90_000

  const startWatchingReference = async (ref: string): Promise<void> => {
    completionHandledRef.current = false
    setPaymentReference(ref)
    setPollingMessage('Check your phone — a USSD prompt should appear shortly.')

    // Cancel any prior watch session
    abortControllerRef.current?.abort()
    const abort = new AbortController()
    abortControllerRef.current = abort

    // Progressive status messages — sets realistic expectations for 30–90s USSD flow
    const messages: [number, string][] = [
      [8000,  'Enter your PIN on the USSD prompt to confirm payment.'],
      [20000, 'Still waiting… Airtel payments can take up to 60 seconds.'],
      [40000, 'Almost there — waiting for network confirmation.'],
      [65000, 'Taking longer than usual. If no prompt appeared, you can go back and retry.'],
    ]
    for (const [delay, msg] of messages) {
      setTimeout(() => {
        if (!abort.signal.aborted && !completionHandledRef.current) setPollingMessage(msg)
      }, delay)
    }

    const cleanup = () => {
      abort.abort()
      if (paymentChannelRef.current) {
        paymentChannelRef.current.unsubscribe()
        paymentChannelRef.current = null
      }
    }

    const handleCompleted = async () => {
      if (completionHandledRef.current) return
      completionHandledRef.current = true
      cleanup()
      setProcessing(false)
      setPollingMessage('Payment confirmed! Finalizing your tickets in background…')
      setPaymentSuccess(true)

      if (orderId) {
        ;(async () => {
          for (let attempt = 0; attempt < 6; attempt++) {
            const { data: ticketCheck } = await supabase
              .from('tickets')
              .select('id')
              .eq('order_id', orderId)
              .limit(1)
            if (ticketCheck && ticketCheck.length > 0) {
              setPollingMessage('Payment confirmed! Tickets are ready.')
              return
            }
            if (attempt < 5) await new Promise<void>(r => setTimeout(r, 1000))
          }
          setPollingMessage('Payment confirmed! Tickets may take a moment to appear.')
        })().catch((e) => console.warn('[Payment] post-success ticket check failed', e))
      } else {
        setPollingMessage('Payment confirmed!')
      }
    }

    const handleFailed = () => {
      if (completionHandledRef.current) return
      completionHandledRef.current = true
      cleanup()
      setPollingMessage('')
      setPaymentReference(null)
      setProcessing(false)
      alert('Payment was not completed or was declined. Please try again.')
    }

    // ── 1. Realtime subscription — primary delivery path ──────────────────
    // postgres_changes fires after WAL commit: status="completed" here is final.
    // This resolves the payment instantly for the majority of users.
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
      .subscribe((channelState) => {
        if (channelState === 'CHANNEL_ERROR' || channelState === 'TIMED_OUT') {
          console.warn('[Payment] Realtime channel degraded, exponential backoff poll active', channelState)
        }
      })
    paymentChannelRef.current = channel

    // ── 2. Exponential backoff polling — sparse safety net ────────────────
    // Fires only if Realtime doesn't deliver (network issues, silent WS drops).
    // 7 polls over 90s vs 87 polls over 120s previously: 94% Postgres load reduction.
    ;(async () => {
      const deadline = Date.now() + POLL_TIMEOUT_MS
      for (let i = 0; i < BACKOFF_DELAYS_MS.length; i++) {
        await new Promise<void>(r => setTimeout(r, BACKOFF_DELAYS_MS[i]))
        if (abort.signal.aborted) return
        if (completionHandledRef.current) return
        if (Date.now() > deadline) return

        const status = await checkStatus(ref)
        if (abort.signal.aborted) return
        if (status === 'completed') { handleCompleted(); return }
        if (status === 'failed') { handleFailed(); return }
      }
      // All backoff slots exhausted — Realtime subscription remains active
    })()
  }

  // Ensure the paymentReference is observed so linters/TS don't flag it as unused.
  useEffect(() => {
    if (paymentReference) console.debug('[Payment] internal reference set', paymentReference)
  }, [paymentReference])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (paymentChannelRef.current) {
        paymentChannelRef.current.unsubscribe()
        paymentChannelRef.current = null
      }
    }
  }, [])

  // If a reference is provided in the URL (e.g. from Donate flow), start watching it
  useEffect(() => {
    const ref = searchParams.get('reference')
    if (ref) {
      // kick off watcher for provided reference
      startWatchingReference(ref).catch((e) => console.error('[Payment] startWatchingReference error', e))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Prefill phone from order when order data is ready
  useEffect(() => {
    if (!order?.guest_phone) return
    const p = String(order.guest_phone).replace(/^\+256/, '')
    setPhoneNumber(p.startsWith('+') ? p : p)
  }, [order?.guest_phone])

  // Compute per-ticket pricing calculations (mirrors Checkout/TransportBooking logic)
  useEffect(() => {
    if (!order?._service?.id) return

    const uniqueTicketTypeIds = Array.from(new Set(items.map((it: any) => it.ticket_type_id)))
    let cancelled = false

    const fetchCalculations = async () => {
      const map: Record<string, any> = {}
      await Promise.all(uniqueTicketTypeIds.map(async (ttId) => {
        const tt = (data?.allTicketTypes || []).find((t: any) => t.id === ttId)
        if (!tt) return
        try {
          const calc = await calculatePaymentForAmount(order._service.id, Number(tt.price || 0))
          if (cancelled) return
          map[ttId] = calc
        } catch (err) {
          console.error('Failed to calculate ticket pricing for', ttId, err)
        }
      }))

      if (!cancelled) setTicketCalculations(map)
    }

    fetchCalculations()
    return () => { cancelled = true }
  }, [items, data?.allTicketTypes, order?._service?.id])

  // Prefill ticket email from order (if available) but keep it editable
  useEffect(() => {
    if (!order?.guest_email) return
    // only autofill when the input is still empty to avoid stomping user edits
    if (!ticketEmail) setTicketEmail(order.guest_email)
  }, [order?.guest_email, ticketEmail])

  const handlePayment = useCallback(async () => {
  if (!orderId || !order) return
  if (!ticketPricingReady) {
    alert('Pricing is still loading. Please wait a moment and try again.')
    return
  }
  // Use derived totals from items (keeps payment amount in sync with edits)
  const totalWithFee = Math.round(totalAmount)
    const rawPhone = (phoneNumber || order?.guest_phone || '').trim().replace(/^\+256/, '')
    const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`

    if (!phone || phone.length < 10) {
      alert('Please enter a valid mobile money phone number (e.g. 0712345678 or +256712345678).')
      return
    }

    // Persist tier/pricing breakdown on the order before collect so admin finance (Dirt Trails Wallet)
    // can resolve platform fee via payments.reference → order_id (transactions are not booking-linked).
    const emailToSave = (ticketEmail || order?.guest_email || '').trim()
    const activeItems = items.filter((it: any) => Number(it.quantity ?? 0) > 0)
    let orderPatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      ...(emailToSave ? { guest_email: emailToSave } : {}),
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
          alert('Pricing is incomplete for one or more tickets. Please wait a moment or refresh the page.')
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
      console.error('[Payment] failed to persist order pricing', orderUpdateErr)
      alert('Could not save order totals before payment. Please try again.')
      return
    }

    setProcessing(true)
    setPollingMessage('')
    setPaymentReference(null)
    try {
      const { data: session } = await supabase.auth.getSession()
                const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
                  amount: Math.round(totalWithFee),
          phone_number: phone,
          order_id: orderId,
          description: `Order #${order.reference || orderId.slice(0, 8)} payment`,
          user_id: session?.session?.user?.id || undefined,
        }),
      })

      const result = (await collectRes.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        details?: unknown
        data?: { reference: string; status: string }
      }

      if (!collectRes.ok) {
        const msg = result?.error || `Payment initiation failed (${collectRes.status})`
        if (result?.details) console.warn('Payment error details:', result.details)
        throw new Error(msg)
      }
      if (!result?.success || !result?.data?.reference) {
        throw new Error(result?.error || 'Payment initiation failed')
      }

      const ref = result.data.reference
      // reuse watcher logic to start polling/subscription for the returned reference
      await startWatchingReference(ref)
    } catch (err) {
      console.error('Payment error:', err)
      setPollingMessage('')
      setPaymentReference(null)
      setProcessing(false)
      alert((err as Error).message || 'Payment failed. Please try again.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startWatchingReference is stable enough for UX; expanding deps rebinds every render
  }, [orderId, order, phoneNumber, navigate, ticketPricingReady, totalAmount, ticketEmail, items, ticketCalculations])

  if (isLoading) return <PageSkeleton type="payment" />
  if (error || !order) {
    // If there's no order but we have a payment reference (donation flow), render the donation watcher UI below
    if (!refFromQuery) return <div className="p-6">Order not found</div>
  }

  // Donation-only flow: no order but reference provided
  if (!order && refFromQuery) {
    const paymentAmount = donationPayment?.amount ?? null
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Complete Donation</h1>
            <p className="text-gray-600 font-light text-sm">Confirm the donation using your phone. Payment reference: <span className="font-mono">{refFromQuery}</span></p>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 p-6 text-center">
            <div className="text-sm text-gray-700 mb-4">{paymentAmount ? `Amount: ${paymentAmount}` : 'Amount will be charged to your phone'}</div>
            <div className="text-sm text-gray-600 mb-4">{pollingMessage || 'Waiting for confirmation on your phone...'}</div>

            {paymentSuccess && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black opacity-40"></div>
                <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 z-10">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Donation successful</h2>
                  <p className="text-sm text-gray-700 mb-4">Thank you for your donation. A receipt will be sent if an email was provided.</p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentSuccess(false)
                        navigate('/')
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!paymentSuccess && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md" disabled>
                  Processing…
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-2xl">
        {/* Back arrow at the top */}
        <div className="w-full flex items-start mb-2">
          <button type="button" onClick={() => navigate(-1)} className="p-2 bg-white hover:bg-gray-50 text-gray-900 rounded border border-gray-300 font-light text-sm transition-colors flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Complete Payment</h1>
          <p className="text-gray-600 font-light text-sm">Choose a payment method and finish your order</p>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          {/* Compact Progress Steps (minimal on mobile) */}
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-center gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">✓</div>
                <div className="hidden md:block font-light">Tickets</div>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">✓</div>
                <div className="hidden md:block font-light text-blue-600">Details</div>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <div className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center font-semibold">3</div>
                <div className="hidden md:block font-light">Payment</div>
              </div>
            </div>
          </div>
          <div className="px-4 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-700">Order ID <span className="font-mono text-xs text-gray-900 ml-2">{order.reference || `#${order.id.slice(0,8)}`}</span></div>
              </div>
            </div>

            <div className="mt-3"> 
              <div className="bg-white rounded-lg p-3 space-y-2 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Tickets</div>
                  <div>
                    <button type="button" onClick={() => setShowEdit(s => !s)} className="text-sm text-blue-600">{showEdit ? 'Done' : 'Edit'}</button>
                  </div>
                </div>

                <div className="space-y-2 mb-1">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-gray-700">{item.ticket_type?.title || 'Ticket'}</div>
                        <div className="text-xs text-gray-500">× {item.quantity}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {showEdit ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => updateTicketQuantity(item.ticket_type_id, (item.quantity || 0) - 1)}
                              className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-medium"
                              disabled={(item.quantity || 0) <= 0}
                            >
                              -
                            </button>
                            <div className="text-sm font-medium min-w-[24px] text-center">{item.quantity}</div>
                            <button
                              onClick={async () => updateTicketQuantity(item.ticket_type_id, (item.quantity || 0) + 1)}
                              className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-medium"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm font-medium">{formatCurrencyWithConversion(item.unit_price * item.quantity, order.currency)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2">
          {!ticketPricingReady && items.some((it: any) => Number(it.quantity ?? 0) > 0) && (
            <p className="text-xs text-amber-700 mb-2">Loading platform fees from your vendor tier…</p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Service Fee</span>
            <span className="text-sm font-medium text-gray-900">{formatCurrencyWithConversion(effectiveServiceFees, order.currency)}</span>

                        {/* Detailed breakdown per ticket type when available */}
                        {items.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            {items.map((it: any) => {
                              const tt = (data?.allTicketTypes || []).find((t: any) => t.id === it.ticket_type_id)
                              const calc = ticketCalculations[it.ticket_type_id]
                              const qty = Number(it.quantity || 0)
                              if (!tt) return null
                              const label = tt.title || tt.id
                              if (!calc) {
                                return (
                                  <div key={it.ticket_type_id} className="flex justify-between mb-1">
                                    <div>{label} × {qty}</div>
                                    <div>{formatCurrencyWithConversion(0, order.currency)}</div>
                                  </div>
                                )
                              }

                              const unitPlatform = Number(calc.platform_fee || 0)
                              const totalPlatform = unitPlatform * qty

                              return (
                                <div key={it.ticket_type_id} className="mb-1">
                                  <div className="flex justify-between">
                                    <div>{label} × {qty} — platform fee</div>
                                    <div>{formatCurrencyWithConversion(totalPlatform, order.currency)}</div>
                                  </div>
                                  {calc.fee_payer === 'shared' && (
                                    <div className="mt-1 ml-3 text-xs text-gray-500">
                                      <div>Tourist pays {formatCurrencyWithConversion(Number(calc.tourist_fee || 0) * qty, order.currency)}</div>
                                      <div>Vendor pays {formatCurrencyWithConversion(Number(calc.vendor_fee || 0) * qty, order.currency)}</div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                {/* Success Dialog */}
                {paymentSuccess && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-40"></div>
                    <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 z-10">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment successful</h2>
                      <p className="text-sm text-gray-700 mb-4">
                        Your receipt is ready. We&apos;ve also sent your ticket(s) to your email—check your inbox. Click OK to view your receipt.
                      </p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentSuccess(false)
                            navigate(`/tickets/${orderId}`)
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                  </div>

                  {/* Total shown below service fee for clarity */}
                  <div className="mt-3 flex justify-between items-center border-t pt-3">
                    <span className="text-gray-700 text-sm font-medium">Total</span>
                    <span className="text-lg font-semibold text-gray-900">{formatCurrencyWithConversion(totalAmount, order.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-light text-gray-900 mb-4">Select Payment Method</h3>
            
            <div className="space-y-3">
              {/* Mobile Money Option (compact) */}
              <div className={`flex items-center justify-between p-2 rounded border ${paymentMethod === 'mobile_money' ? 'border-blue-500' : 'border-gray-200'}`}>
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mobile_money"
                    checked={paymentMethod === 'mobile_money'}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value)
                      setCardNoticeVisible(false)
                    }}
                    className="w-4 h-4"
                  />
                  <div className="text-sm font-medium">Mobile Money</div>
                </label>
                <div className="text-sm text-gray-400">→</div>
              </div>

              {/* Mobile Money inputs (compact) */}
              {paymentMethod === 'mobile_money' && (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Select provider to continue</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setMobileProvider('MTN')} className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${mobileProvider === 'MTN' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <rect width="18" height="14" rx="2" fill="#FFD200" />
                          <text x="9" y="10" fill="#000" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">MTN</text>
                        </svg>
                        <span className="text-sm font-medium">MTN</span>
                      </button>
                      <button type="button" onClick={() => setMobileProvider('Airtel')} className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${mobileProvider === 'Airtel' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <rect width="18" height="14" rx="2" fill="#E60000" />
                          <text x="9" y="10" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">A</text>
                        </svg>
                        <span className="text-sm font-medium">Airtel</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0712345678 or +256712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none text-sm"
                  />
                </div>
              )}

              {/* Credit/Debit Card - now visible on mobile as requested */}
              <div className="opacity-90">
                <div className="p-2 border border-gray-200 rounded text-sm text-gray-700">Credit/Debit Card (coming soon)</div>

                <div className="mt-3 flex items-center gap-1">
                  {/* Visa (stylized) */}
                  <div className="flex items-center gap-1 px-1 py-0.5 border rounded bg-white">
                    <svg width="20" height="12" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <rect width="28" height="18" rx="3" fill="#1A66FF" />
                      <text x="14" y="12" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">VISA</text>
                    </svg>
                  </div>

                  <div className="flex items-center gap-1 px-1 py-0.5 border rounded bg-white">
                    <svg width="20" height="12" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <rect width="28" height="18" rx="3" fill="#fff" />
                      <circle cx="11" cy="9" r="4" fill="#FF5F00" />
                      <circle cx="17" cy="9" r="4" fill="#EB001B" />
                    </svg>
                  </div>

                  <div className="flex items-center gap-1 px-1 py-0.5 border rounded bg-white">
                    <svg width="20" height="12" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <rect width="28" height="18" rx="3" fill="#2E77BC" />
                      <text x="14" y="12" fill="#fff" fontSize="5" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">AMEX</text>
                    </svg>
                  </div>

                  <div className="flex items-center gap-1 px-1 py-0.5 border rounded bg-white">
                    <svg width="20" height="12" viewBox="0 0 28 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <rect width="28" height="18" rx="3" fill="#F76C1B" />
                      <text x="14" y="12" fill="#fff" fontSize="5" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">DISC</text>
                    </svg>
                  </div>

                  {/* MTN and Airtel icons intentionally removed from card icons row; they remain on the mobile provider buttons above */}
                </div>
              </div>
            </div>

            {cardNoticeVisible && paymentMethod === 'card' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-light">
                  Card payments are not available yet. Please select Mobile Money to proceed.
                </p>
              </div>
            )}
            {/* Removed the explicit phone confirmation notification and reference from the UI.
                The internal payment reference is still recorded for debugging, but it's not
                displayed to the user during processing to avoid cluttering the payment UI. */}
          </div>

          {/* Email for Tickets */}
          <div className="px-6 py-6 border-b">
            <label className="block text-sm font-light text-gray-900 mb-2">Email to receive tickets</label>
            <input
              type="email"
              value={ticketEmail}
              onChange={(e) => setTicketEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 font-light text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t bg-gray-50 flex gap-2">
            <button
              type="button"
              onClick={handlePayment}
              disabled={
                processing ||
                paymentMethod === 'card' ||
                !ticketPricingReady ||
                (paymentMethod === 'mobile_money' && (!mobileProvider || !phoneNumber.trim()))
              }
              style={{
                backgroundColor:
                  processing ||
                  paymentMethod === 'card' ||
                  !ticketPricingReady ||
                  !mobileProvider ||
                  !phoneNumber.trim()
                    ? '#d1d5db'
                    : '#3B82F6',
              }}
              className="flex-1 text-white font-light text-sm py-2 px-4 rounded-lg transition-all hover:shadow-lg disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  {/* Larger spinner on mobile, slightly smaller on md+ screens */}
                  <svg className="animate-spin h-10 w-10 md:h-4 md:w-4 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span className="text-white text-sm">{pollingMessage || 'Processing...'}</span>
                </span>
              ) : (
                'Pay with Mobile Money'
              )}
            </button>
          </div>
        </div>

        {/* Security Info removed as requested */}
      </div>
    </div>
  )
}