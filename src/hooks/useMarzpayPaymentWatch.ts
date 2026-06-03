import { useCallback, useEffect, useRef } from 'react'
import {
  MARZPAY_BACKOFF_DELAYS_MS,
  MARZPAY_INITIAL_POLL_MESSAGE,
  MARZPAY_ORDER_POLL_TIMEOUT_MS,
  scheduleMarzpayStatusMessages,
} from '../lib/marzpayPollMessages'
import { watchMarzpayPayment, type MarzpayWatchHandles } from './watchMarzpayPayment'

export type MarzpayWatchConfig = {
  channelPrefix?: string
  pollIntervalMs?: number
  timeoutMs?: number
  backoffDelaysMs?: number[]
  burstChecks?: { count: number; intervalMs: number }
}

export type StartMarzpayWatchHandlers = {
  onCompleted: () => void
  onFailed: () => void
  onPollingMessage?: (message: string) => void
  initialMessage?: string
}

/**
 * React hook wrapper around watchMarzpayPayment + USSD status messages.
 * Use for checkout/orders; booking pages can call watchMarzpayPayment directly.
 */
export function useMarzpayPaymentWatch(config?: MarzpayWatchConfig) {
  const watchRef = useRef<MarzpayWatchHandles | null>(null)
  const clearMessagesRef = useRef<(() => void) | null>(null)
  const settledRef = useRef(false)

  const stopWatch = useCallback(() => {
    settledRef.current = true
    watchRef.current?.cleanup()
    watchRef.current = null
    clearMessagesRef.current?.()
    clearMessagesRef.current = null
  }, [])

  useEffect(() => () => stopWatch(), [stopWatch])

  const startWatch = useCallback(
    (reference: string, handlers: StartMarzpayWatchHandlers) => {
      settledRef.current = false
      watchRef.current?.cleanup()
      clearMessagesRef.current?.()
      clearMessagesRef.current = null
      settledRef.current = false

      const isActive = () => !settledRef.current

      if (handlers.onPollingMessage) {
        handlers.onPollingMessage(handlers.initialMessage ?? MARZPAY_INITIAL_POLL_MESSAGE)
        clearMessagesRef.current = scheduleMarzpayStatusMessages(isActive, handlers.onPollingMessage)
      }

      const finish = (outcome: 'completed' | 'failed') => {
        if (settledRef.current) return
        settledRef.current = true
        clearMessagesRef.current?.()
        clearMessagesRef.current = null
        watchRef.current?.cleanup()
        watchRef.current = null
        if (outcome === 'completed') handlers.onCompleted()
        else handlers.onFailed()
      }

      watchRef.current = watchMarzpayPayment(reference, {
        channelPrefix: config?.channelPrefix ?? 'payment',
        pollIntervalMs: config?.pollIntervalMs,
        timeoutMs: config?.timeoutMs ?? MARZPAY_ORDER_POLL_TIMEOUT_MS,
        backoffDelaysMs: config?.backoffDelaysMs,
        burstChecks: config?.burstChecks,
        onCompleted: () => finish('completed'),
        onFailed: () => finish('failed'),
      })
    },
    [config]
  )

  return { startWatch, stopWatch }
}

/** Defaults for order / ticket checkout flows. */
export const orderMarzpayWatchConfig: MarzpayWatchConfig = {
  channelPrefix: 'payment_order',
  backoffDelaysMs: MARZPAY_BACKOFF_DELAYS_MS,
  timeoutMs: MARZPAY_ORDER_POLL_TIMEOUT_MS,
}
