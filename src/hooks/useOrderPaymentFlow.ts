import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { initiateMarzpayCollect } from '../lib/marzpayApi'
import { getOptionalUserId } from '../services/AuthService'
import { orderMarzpayWatchConfig, useMarzpayPaymentWatch } from './useMarzpayPaymentWatch'

export function useOrderPaymentFlow(orderId: string | undefined) {
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [pollingMessage, setPollingMessage] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const { startWatch, stopWatch } = useMarzpayPaymentWatch(orderMarzpayWatchConfig)

  const startWatchingReference = useCallback(
    async (ref: string) => {
      startWatch(ref, {
        onPollingMessage: setPollingMessage,
        onCompleted: () => {
          setProcessing(false)
          setPollingMessage('')
          setPaymentSuccess(true)
        },
        onFailed: () => {
          setPollingMessage('')
          setProcessing(false)
          setPaymentError('Payment was not completed or was declined. Please try again.')
        },
      })
    },
    [startWatch]
  )

  const payOrder = useCallback(
    async (params: {
      order: any
      items: any[]
      ticketCalculations: Record<string, any>
      totalAmount: number
      ticketPricingReady: boolean
      phone: string
      guestEmail: string
      guestName: string
    }) => {
      const { order, items, ticketCalculations, totalAmount, ticketPricingReady, phone, guestEmail, guestName } =
        params
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
          if (!pricingReferenceId && calc.pricing_reference_id) {
            pricingReferenceId = String(calc.pricing_reference_id)
          }
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
        const reference = await initiateMarzpayCollect({
          amount: totalWithFee,
          phone_number: phone,
          order_id: orderId,
          description: `Order #${order.reference || orderId.slice(0, 8)} payment`,
          user_id: await getOptionalUserId(),
        })
        await startWatchingReference(reference)
      } catch (err) {
        stopWatch()
        setProcessing(false)
        setPollingMessage('')
        setPaymentError((err as Error).message || 'Payment failed. Please try again.')
      }
    },
    [orderId, startWatchingReference, stopWatch]
  )

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
