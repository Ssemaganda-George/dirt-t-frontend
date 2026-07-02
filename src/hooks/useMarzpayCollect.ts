import { useCallback, useEffect, useRef, useState } from 'react'
import {
  initiateMarzpayCollect,
  isMobileUiMethod,
  normalizeMarzpayPhone,
  redirectMarzpayIfNeeded,
  toMarzpayMethod,
  type MarzpayUiMethod,
} from '../lib/marzpayApi'
import { getOptionalUserId } from '../services/AuthService'
import { watchMarzpayPayment, type MarzpayWatchHandles, type MarzpayWatchOptions } from './watchMarzpayPayment'

export type MarzpayCollectPayParams = {
  amount: number
  description: string
  method: MarzpayUiMethod | string
  phone?: string
  booking_id?: string
  order_id?: string
  metadata?: Record<string, unknown>
  user_id?: string
}

type UseMarzpayCollectOptions = {
  channelPrefix: string
  onCompleted: (reference: string) => void
  onFailed: (reference?: string) => void
  pollIntervalMs?: number
  timeoutMs?: number
  burstChecks?: MarzpayWatchOptions['burstChecks']
  backoffDelaysMs?: MarzpayWatchOptions['backoffDelaysMs']
}

export function useMarzpayCollect(options: UseMarzpayCollectOptions) {
  const { channelPrefix, onCompleted, onFailed, pollIntervalMs, timeoutMs, burstChecks, backoffDelaysMs } = options
  const [processing, setProcessing] = useState(false)
  const [pollingMessage, setPollingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const watchRef = useRef<MarzpayWatchHandles | null>(null)
  const completedRef = useRef(false)

  const cleanup = useCallback(() => {
    watchRef.current?.cleanup()
    watchRef.current = null
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const reset = useCallback(() => {
    cleanup()
    completedRef.current = false
    setProcessing(false)
    setPollingMessage('')
    setError(null)
  }, [cleanup])

  const pay = useCallback(
    async (params: MarzpayCollectPayParams) => {
      const method = toMarzpayMethod(params.method)
      const isCard = method === 'card'

      if (!isCard && isMobileUiMethod(params.method)) {
        const phone = params.phone ? normalizeMarzpayPhone(params.phone) : ''
        if (!phone || phone.length < 10) {
          setError('Please enter a valid mobile money phone number (e.g. 0712345678).')
          return
        }
      }

      setError(null)
      setProcessing(true)
      setPollingMessage(isCard ? 'Redirecting to secure checkout…' : 'Initiating payment…')
      completedRef.current = false
      cleanup()

      try {
        const userId = params.user_id ?? (await getOptionalUserId())
        const phone = !isCard && params.phone ? normalizeMarzpayPhone(params.phone) : undefined

        const result = await initiateMarzpayCollect({
          amount: Math.round(params.amount),
          method,
          ...(phone ? { phone_number: phone } : {}),
          description: params.description,
          user_id: userId ?? undefined,
          booking_id: params.booking_id,
          order_id: params.order_id,
          metadata: params.metadata,
        })

        if (redirectMarzpayIfNeeded(result)) return

        setPollingMessage('Check your phone for the USSD prompt…')
        watchRef.current = watchMarzpayPayment(result.reference, {
          channelPrefix,
          pollIntervalMs,
          timeoutMs,
          burstChecks,
          backoffDelaysMs,
          onCompleted: () => {
            if (completedRef.current) return
            completedRef.current = true
            cleanup()
            setPollingMessage('')
            setProcessing(false)
            onCompleted(result.reference)
          },
          onFailed: () => {
            cleanup()
            setPollingMessage('')
            setProcessing(false)
            setError('Payment was not completed or was declined. Please try again.')
            onFailed(result.reference)
          },
        })
      } catch (err) {
        cleanup()
        setPollingMessage('')
        setProcessing(false)
        setError((err as Error).message || 'Payment failed. Please try again.')
        throw err
      }
    },
    [channelPrefix, cleanup, onCompleted, onFailed, pollIntervalMs, timeoutMs, burstChecks, backoffDelaysMs]
  )

  return {
    pay,
    processing,
    pollingMessage,
    setPollingMessage,
    error,
    setError,
    reset,
    cleanup,
  }
}
