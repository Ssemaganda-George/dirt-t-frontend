import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../lib/utils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

async function getPaymentStatus(reference: string): Promise<{ status: string; order_id?: string }> {
  const res = await fetch(
    `${supabaseUrl}/functions/v1/marzpay-payment-status?reference=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${supabaseAnonKey}` } }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || 'Failed to get payment status')
  }
  return res.json()
}

export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('mobile_money')
  const [mobileProvider, setMobileProvider] = useState('')
  const [cardNoticeVisible, setCardNoticeVisible] = useState(false)
  const [ticketEmail, setTicketEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [paymentReference, setPaymentReference] = useState<string | null>(null)
  const [pollingMessage, setPollingMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!orderId) return
      setLoading(true)
      try {
        const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
        setOrder(o)
        if (o?.guest_phone) {
          const p = String(o.guest_phone).replace(/^\+256/, '')
          setPhoneNumber(p.startsWith('0') ? p : p)
        }

        const { data: its } = await supabase.from('order_items').select('*').eq('order_id', orderId)
        setItems(its || [])
      } catch (err) {
        console.error('Failed to load order:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId])

  const handlePayment = useCallback(async () => {
    if (!orderId || !order) return
    const totalWithFee = Number(order.total_amount) + Math.max(1000, Math.round(Number(order.total_amount) * 0.01))
    const rawPhone = (phoneNumber || order?.guest_phone || '').trim().replace(/^\+256/, '')
    const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`

    if (!phone || phone.length < 10) {
      alert('Please enter a valid mobile money phone number (e.g. 0712345678 or +256712345678).')
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
      setPaymentReference(ref)
      setPollingMessage('Confirm the payment on your phone. Waiting for confirmation…')

      const pollInterval = 2500
      const maxAttempts = 120
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, pollInterval))
        const statusRes = await getPaymentStatus(ref)
        if (statusRes.status === 'completed') {
          setPollingMessage('Payment confirmed! Redirecting…')
          navigate(`/tickets/${orderId}`)
          return
        }
        if (statusRes.status === 'failed') {
          setPollingMessage('')
          setPaymentReference(null)
          setProcessing(false)
          alert('Payment was not completed or was declined. Please try again.')
          return
        }
      }

      setPollingMessage('')
      setPaymentReference(null)
      setProcessing(false)
      alert('Payment is taking longer than expected. You can check your tickets page later if the payment went through.')
    } catch (err) {
      console.error('Payment error:', err)
      setPollingMessage('')
      setPaymentReference(null)
      setProcessing(false)
      alert((err as Error).message || 'Payment failed. Please try again.')
    }
  }, [orderId, order, phoneNumber, navigate])

  if (loading) return <div className="p-6">Loading order…</div>
  if (!order) return <div className="p-6">Order not found</div>

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Complete Payment</h1>
          <p className="text-gray-600 font-light text-sm">Choose your preferred payment method and complete your order</p>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          {/* Progress Steps */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">✓</div>
                <div className="text-sm">
                  <p className="font-light text-gray-900">Tickets</p>
                </div>
              </div>
              <div className="w-12 h-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">✓</div>
                <div className="text-sm">
                  <p className="font-light text-gray-900">Details</p>
                </div>
              </div>
              <div className="w-12 h-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-semibold">3</div>
                <div className="text-sm">
                  <p className="font-light text-gray-900">Payment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="px-6 py-6 border-b">
            <h3 className="text-lg font-light text-gray-900 mb-4">Order Summary</h3>
            
            <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Order ID</span>
                <span className="font-light text-gray-900 font-mono text-sm">{order.reference || `#${order.id.slice(0,8)}`}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="space-y-2 mb-3">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.ticket_type?.title || 'Ticket'} × {item.quantity}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(item.unit_price * item.quantity, order.currency)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-gray-600 text-sm font-light">Service Fee</span>
                  <span className="text-sm font-light text-gray-900">{formatCurrency(Math.max(1000, Math.round(order.total_amount * 0.01)), order.currency)}</span>
                </div>
              </div>

              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-gray-900 font-light">Total Amount</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(order.total_amount + Math.max(1000, Math.round(order.total_amount * 0.01)), order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="px-6 py-6">
            <h3 className="text-lg font-light text-gray-900 mb-4">Select Payment Method</h3>
            
            <div className="space-y-4">
              {/* Mobile Money Option */}
              <label className="block">
                <div className="relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all" 
                     style={{ borderColor: paymentMethod === 'mobile_money' ? '#3B82F6' : '#e5e7eb' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mobile_money"
                    checked={paymentMethod === 'mobile_money'}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value)
                      setCardNoticeVisible(false)
                    }}
                    className="mr-3 w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="font-light text-gray-900">Mobile Money</div>
                  </div>
                  <div className="text-lg text-gray-400">→</div>
                </div>
              </label>

              {/* Mobile Money: Provider + Phone */}
              {paymentMethod === 'mobile_money' && (
                <div className="ml-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <div>
                    <label className="block text-sm font-light text-gray-900 mb-2">Mobile Money phone number *</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0712345678 or +256712345678"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 font-light text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1 font-light">UG only: 07xx or 03xx (10 digits)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-light text-gray-900 mb-3">Select Provider</label>
                    <div className="space-y-2">
                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors" style={{ borderColor: mobileProvider === 'MTN' ? '#3B82F6' : '#e5e7eb' }}>
                        <input
                          type="radio"
                          name="provider"
                          value="MTN"
                          checked={mobileProvider === 'MTN'}
                          onChange={(e) => setMobileProvider(e.target.value)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-light text-gray-900">MTN Mobile Money</div>
                        </div>
                      </label>

                      <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors" style={{ borderColor: mobileProvider === 'Airtel' ? '#3B82F6' : '#e5e7eb' }}>
                        <input
                          type="radio"
                          name="provider"
                          value="Airtel"
                          checked={mobileProvider === 'Airtel'}
                          onChange={(e) => setMobileProvider(e.target.value)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-light text-gray-900">Airtel Money</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Credit Card Option (Disabled) */}
              <label className="block opacity-50 pointer-events-none">
                <div className="relative flex items-center p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    disabled
                    className="mr-3 w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-light text-gray-900">Credit/Debit Card</div>
                  </div>
                  <div className="text-lg text-gray-400">→</div>
                </div>
              </label>
            </div>

            {cardNoticeVisible && paymentMethod === 'card' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-light">
                  Card payments are not available yet. Please select Mobile Money to proceed.
                </p>
              </div>
            )}
            {paymentReference && pollingMessage && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-light">{pollingMessage}</p>
                <p className="text-xs text-blue-600 mt-2 font-mono">Ref: {paymentReference}</p>
              </div>
            )}
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
              onClick={() => navigate(`/checkout/${orderId}`)}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 font-light text-sm rounded-lg transition-colors border border-gray-300"
            >
              Back
            </button>
            <button
              onClick={handlePayment}
              disabled={
                processing ||
                paymentMethod === 'card' ||
                (paymentMethod === 'mobile_money' && (!mobileProvider || !phoneNumber.trim()))
              }
              style={{
                backgroundColor:
                  processing ||
                  paymentMethod === 'card' ||
                  !mobileProvider ||
                  !phoneNumber.trim()
                    ? '#d1d5db'
                    : '#3B82F6',
              }}
              className="flex-1 text-white font-light text-sm py-2 px-4 rounded-lg transition-all hover:shadow-lg disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {pollingMessage || 'Processing...'}
                </span>
              ) : (
                'Pay with Mobile Money'
              )}
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="text-center text-sm text-gray-600">
          <p className="font-light">Your payment information is secure and encrypted</p>
        </div>
      </div>
    </div>
  )
}