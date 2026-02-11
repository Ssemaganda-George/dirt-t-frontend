import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { confirmOrderAndIssueTickets } from '../lib/database'
import { formatCurrency } from '../lib/utils'

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

  useEffect(() => {
    const load = async () => {
      if (!orderId) return
      setLoading(true)
      try {
        const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
        setOrder(o)

        // Load order items
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

  const handlePayment = async () => {
    if (!orderId || !order) return
    setProcessing(true)
    try {
      // Update order with buyer information (assuming it's already saved from checkout)
      const payment = {
        vendor_id: order.vendor_id,
        tourist_id: order.user_id || undefined,
        amount: order.total_amount,
        currency: order.currency,
        payment_method: paymentMethod,
        reference: `PAY_${orderId}_${Date.now()}`
      }

      await confirmOrderAndIssueTickets(orderId, payment)
      // After issuance, go to receipt/tickets page
      navigate(`/tickets/${orderId}`)
    } catch (err) {
      console.error('Payment/issuance failed:', err)
      alert('Payment failed or ticket issuance failed. See console for details.')
    } finally {
      setProcessing(false)
    }
  }

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

              {/* Mobile Money Provider Selection */}
              {paymentMethod === 'mobile_money' && (
                <div className="ml-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
              disabled={processing || (paymentMethod === 'card') || (paymentMethod === 'mobile_money' && !mobileProvider)}
              style={{ backgroundColor: processing || !mobileProvider || paymentMethod === 'card' ? '#d1d5db' : '#3B82F6' }}
              className="flex-1 text-white font-light text-sm py-2 px-4 rounded-lg transition-all hover:shadow-lg disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Processing...
                </span>
              ) : (
                'Complete Payment'
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