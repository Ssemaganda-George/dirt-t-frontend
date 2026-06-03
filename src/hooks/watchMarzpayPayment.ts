import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { fetchMarzpayPaymentStatus } from '../lib/marzpayApi'

export type MarzpayWatchOptions = {
  /** Prefix for the Realtime channel name (must be unique per UI surface). */
  channelPrefix: string
  onCompleted: () => void
  onFailed: () => void
  pollIntervalMs?: number
  timeoutMs?: number
  /** Optional rapid polls right after collect (e.g. transport booking). */
  burstChecks?: { count: number; intervalMs: number }
}

export type MarzpayWatchHandles = {
  cleanup: () => void
}

/**
 * Subscribe to payment row updates and poll MarzPay status until completed, failed, or timeout.
 * Use in booking/checkout flows after collect returns a reference.
 */
export function watchMarzpayPayment(
  reference: string,
  options: MarzpayWatchOptions
): MarzpayWatchHandles {
  const {
    channelPrefix,
    onCompleted,
    onFailed,
    pollIntervalMs = 4000,
    timeoutMs = 120_000,
    burstChecks,
  } = options

  let settled = false
  let channel: RealtimeChannel | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null

  const settle = (outcome: 'completed' | 'failed') => {
    if (settled) return
    settled = true
    channel?.unsubscribe()
    channel = null
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
    if (outcome === 'completed') onCompleted()
    else onFailed()
  }

  const checkOnce = async () => {
    const status = await fetchMarzpayPaymentStatus(reference)
    if (status === 'completed') settle('completed')
    else if (status === 'failed') settle('failed')
  }

  channel = supabase
    .channel(`${channelPrefix}_${reference}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments',
        filter: `reference=eq.${reference}`,
      },
      (payload) => {
        const row = payload.new as { status: string }
        if (row.status === 'completed') settle('completed')
        else if (row.status === 'failed') settle('failed')
      }
    )
    .subscribe()

  const startPolling = async () => {
    await checkOnce()
    if (settled) return
    if (burstChecks) {
      for (let i = 0; i < burstChecks.count; i++) {
        if (settled) return
        await new Promise<void>(r => setTimeout(r, burstChecks.intervalMs))
        await checkOnce()
        if (settled) return
      }
    }
    if (settled) return
    pollTimer = setInterval(() => {
      void checkOnce()
    }, pollIntervalMs)
  }

  void startPolling()

  timeoutTimer = setTimeout(() => {
    if (settled) return
    settled = true
    channel?.unsubscribe()
    channel = null
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }, timeoutMs)

  return {
    cleanup: () => {
      if (!settled) {
        settled = true
        channel?.unsubscribe()
        channel = null
        if (pollTimer) clearInterval(pollTimer)
        if (timeoutTimer) clearTimeout(timeoutTimer)
      }
    },
  }
}
