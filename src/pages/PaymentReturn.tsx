import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useMarzpayPaymentWatch } from '../hooks/useMarzpayPaymentWatch'

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reference = searchParams.get('reference')?.trim() || ''
  const bookingId = searchParams.get('booking_id')?.trim() || ''
  const orderId = searchParams.get('order_id')?.trim() || ''
  const [message, setMessage] = useState('Confirming your payment…')
  const [error, setError] = useState<string | null>(null)
  const { startWatch, stopWatch } = useMarzpayPaymentWatch({
    channelPrefix: 'payment_return',
    timeoutMs: 180_000,
  })

  useEffect(() => {
    if (!reference) {
      setError('Missing payment reference. Please return to checkout and try again.')
      return
    }

    startWatch(reference, {
      initialMessage: 'Confirming your payment…',
      onPollingMessage: setMessage,
      onCompleted: () => {
        stopWatch()
        if (orderId) {
          navigate(`/checkout/${orderId}/payment?reference=${encodeURIComponent(reference)}`, { replace: true })
          return
        }
        if (bookingId) {
          navigate(`/booking/${bookingId}`, { replace: true })
          return
        }
        navigate('/wallet', { replace: true })
      },
      onFailed: () => {
        stopWatch()
        setError('Payment was not completed or was declined. Please try again.')
      },
    })

    return () => stopWatch()
  }, [reference, bookingId, orderId, navigate, startWatch, stopWatch])

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900">Secure payment</h1>
            {error ? (
              <>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="mt-4 text-sm font-medium text-emerald-700 hover:underline"
                >
                  Go back
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                {reference && (
                  <p className="mt-3 text-xs text-gray-500 font-mono break-all">Ref: {reference}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
