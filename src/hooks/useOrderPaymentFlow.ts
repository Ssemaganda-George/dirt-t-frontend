import { useCallback, useState } from 'react'
import { prepareCheckoutOrder } from '../repositories/OrderRepository'
import { initiateMarzpayCollect, type MarzpayMethod } from '../lib/marzpayApi'
import { getOptionalUserId } from '../services/AuthService'
import { requestTermsAcceptance, recordTermsAcceptance } from '../lib/termsAcceptance'
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
      phone?: string
      guestEmail: string
      guestName: string
      method?: MarzpayMethod
    }) => {
      const {
        order,
        totalAmount,
        ticketPricingReady,
        phone,
        guestEmail,
        guestName,
        method = 'mobile_money',
      } = params
      if (!orderId || !order) return

      if (!await requestTermsAcceptance()) {
        setPaymentError('Please accept the Terms of Service to continue.')
        return
      }
      try {
        await recordTermsAcceptance('order', orderId)
      } catch (acceptanceError) {
        setPaymentError((acceptanceError as Error).message)
        return
      }

      setPaymentError(null)
      if (!ticketPricingReady) {
        setPaymentError('Pricing is still loading. Please wait a moment and try again.')
        return
      }
      if (method === 'mobile_money') {
        if (!phone || phone.length < 10) {
          setPaymentError('Please enter a valid mobile money phone number (e.g. 0712345678).')
          return
        }
      }

      let totalWithFee: number
      try {
        totalWithFee = await prepareCheckoutOrder(
          orderId,
          guestName.trim() || order.guest_name || '',
          guestEmail.trim() || order.guest_email || '',
          method === 'mobile_money' && phone ? phone : order.guest_phone || '',
        )
      } catch (prepareError) {
        setPaymentError((prepareError as Error).message || 'Could not prepare order for payment.')
        return
      }
      if (Math.abs(totalWithFee - Math.round(totalAmount)) > 1) {
        setPaymentError('Ticket price changed. Please refresh checkout and review the new total before paying.')
        return
      }

      setProcessing(true)
      setPollingMessage(method === 'card' ? 'Redirecting to secure checkout…' : '')
      try {
        const { reference, redirect_url } = await initiateMarzpayCollect({
          amount: totalWithFee,
          method,
          ...(method === 'mobile_money' && phone ? { phone_number: phone } : {}),
          order_id: orderId,
          description: `Order #${order.reference || orderId.slice(0, 8)} payment`,
          user_id: await getOptionalUserId(),
        })

        if (redirect_url) {
          window.location.assign(redirect_url)
          return
        }

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
