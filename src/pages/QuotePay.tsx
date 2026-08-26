import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import MarzpayPaymentFields from '../components/payment/MarzpayPaymentFields'
import { useMarzpayCollect } from '../hooks/useMarzpayCollect'
import {
  getMarzpayMobileValidationErrors,
  isMobileUiMethod,
  type MarzpayPaymentFieldsValue,
} from '../lib/marzpayApi'
import { isQuoteCollectOpen, thisCollectUgx } from '../lib/quotePayLink'
import { getQuotePayPage, type QuotePayPage } from '../repositories/QuoteRepository'

const NOT_AVAILABLE = 'This payment link is not available.'
const ALREADY_PAID = 'Already paid. Check your email.'
const DEPOSIT_RECEIVED = 'Deposit received. DirtTrails will send the balance link.'
const PAYMENT_RECEIVED = 'Payment received. Confirmation is on its way to your email.'

function isLinkExpired(quote: QuotePayPage): boolean {
  if (quote.status === 'expired' || quote.status === 'cancelled') return true
  if (quote.valid_until && new Date(quote.valid_until).getTime() < Date.now()) return true
  return false
}

function MessageCard({ message }: { message: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
        <p className="text-sm font-semibold text-gray-500 mb-3">DirtTrails</p>
        <p className="text-gray-900 font-medium">{message}</p>
      </div>
    </div>
  )
}

export default function QuotePay() {
  const { token } = useParams<{ token: string }>()
  const [quote, setQuote] = useState<QuotePayPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [paidOk, setPaidOk] = useState(false)
  const [paymentFields, setPaymentFields] = useState<MarzpayPaymentFieldsValue>({
    method: 'mobile',
    phone: '',
    provider: '',
  })
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; mobileProvider?: string }>({})

  const {
    pay,
    processing,
    pollingMessage,
    error: paymentError,
    setError: setPaymentError,
  } = useMarzpayCollect({
    channelPrefix: 'quote_pay',
    onCompleted: () => setPaidOk(true),
    onFailed: () => {},
  })

  useEffect(() => {
    let cancelled = false
    setPaidOk(false)
    setQuote(null)
    setPaymentError(null)

    if (!token) {
      setUnavailable(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setUnavailable(false)

    getQuotePayPage(token)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setUnavailable(true)
          setQuote(null)
        } else {
          setQuote(data)
          setUnavailable(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnavailable(true)
          setQuote(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, setPaymentError])

  const handlePay = useCallback(async () => {
    if (!quote?.booking_id || processing) return
    if (isMobileUiMethod(paymentFields.method)) {
      const errs = getMarzpayMobileValidationErrors(paymentFields)
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
        return
      }
    }
    setFieldErrors({})
    try {
      await pay({
        amount: 0,
        booking_id: quote.booking_id,
        description: quote.invoice_no,
        method: paymentFields.method,
        phone: paymentFields.phone,
      })
    } catch {
      // useMarzpayCollect already set the error
    }
  }, [quote, processing, paymentFields, pay])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
        <LoadingSpinner />
      </div>
    )
  }

  if (unavailable || !quote) {
    return <MessageCard message={NOT_AVAILABLE} />
  }

  if (paidOk) {
    return <MessageCard message={PAYMENT_RECEIVED} />
  }

  if (quote.status === 'paid') {
    return <MessageCard message={ALREADY_PAID} />
  }

  if (quote.status === 'deposit_paid' && !quote.balance_enabled) {
    return <MessageCard message={DEPOSIT_RECEIVED} />
  }

  if (isLinkExpired(quote) || !isQuoteCollectOpen(quote) || !quote.booking_id) {
    return <MessageCard message={NOT_AVAILABLE} />
  }

  const collectUgx = thisCollectUgx(quote)
  const lines = Array.isArray(quote.line_items) ? quote.line_items : []

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-500">DirtTrails</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">{quote.invoice_no}</h1>
        <p className="mt-1 text-sm text-gray-600">{quote.guest_name}</p>

        <ul className="mt-6 space-y-2 border-t border-gray-100 pt-4">
          {lines.map((item, index) => (
            <li key={`${item.description}-${index}`} className="flex justify-between gap-4 text-sm text-gray-700">
              <span>
                {item.qty} × {item.description}
              </span>
              <span className="whitespace-nowrap">
                {item.amount.toLocaleString()} {quote.display_currency}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-sm font-semibold text-gray-900">
          <span>Agreed total</span>
          <span>
            {quote.agreed_total.toLocaleString()} {quote.display_currency}
          </span>
        </div>

        <p className="mt-4 text-lg font-semibold text-gray-900">Pay UGX {collectUgx.toLocaleString()}</p>

        <MarzpayPaymentFields
          name="quotePayMethod"
          value={paymentFields}
          onChange={(value) => {
            setPaymentFields(value)
            setFieldErrors({})
            setPaymentError(null)
          }}
          errors={fieldErrors}
          onClearError={(field) =>
            setFieldErrors((prev) => {
              const next = { ...prev }
              delete next[field]
              return next
            })
          }
          className="mt-4"
        />

        {paymentError && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{paymentError}</p>
        )}

        <button
          type="button"
          disabled={processing}
          onClick={() => {
            void handlePay()
          }}
          className="mt-5 w-full rounded-lg bg-[#61B82C] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4a8f23] disabled:opacity-50"
        >
          {processing ? pollingMessage || 'Processing…' : `Pay UGX ${collectUgx.toLocaleString()}`}
        </button>
      </div>
    </div>
  )
}
