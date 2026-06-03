/** Progressive USSD status copy while waiting for MarzPay confirmation. */
export const MARZPAY_USSD_STATUS_MESSAGES: [number, string][] = [
  [8000, 'Enter your PIN on the USSD prompt to confirm payment.'],
  [20000, 'Still waiting… Airtel payments can take up to 60 seconds.'],
  [40000, 'Almost there — waiting for network confirmation.'],
  [65000, 'Taking longer than usual. If no prompt appeared, you can retry.'],
]

export const MARZPAY_INITIAL_POLL_MESSAGE =
  'Check your phone — a USSD prompt should appear shortly.'

/** Exponential backoff poll schedule for order/checkout (sparse safety net). */
export const MARZPAY_BACKOFF_DELAYS_MS = [500, 1000, 2000, 4000, 8000, 16000, 32000]

export const MARZPAY_ORDER_POLL_TIMEOUT_MS = 90_000

export function scheduleMarzpayStatusMessages(
  shouldContinue: () => boolean,
  onMessage: (message: string) => void,
  messages: [number, string][] = MARZPAY_USSD_STATUS_MESSAGES
): () => void {
  const timers = messages.map(([delay, msg]) =>
    setTimeout(() => {
      if (shouldContinue()) onMessage(msg)
    }, delay)
  )
  return () => timers.forEach(clearTimeout)
}
