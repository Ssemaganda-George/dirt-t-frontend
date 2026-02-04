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
    <div className="min-h-screen flex items-start justify-center p-6 bg-gray-50">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Progress Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Payment</h2>
            <div>
              <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900">Close</button>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">1</div>
              <div className="text-sm text-gray-600">TICKETS</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">2</div>
              <div className="text-sm text-gray-600">DETAILS</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#61B82C] text-white flex items-center justify-center text-xs">3</div>
              <div className="text-sm font-medium text-[#61B82C]">PAYMENT</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-6">Order Summary</h3>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Order #{order.reference || `#${order.id.slice(0,8)}`}</span>
              </div>
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.ticket_type?.title || 'Ticket'} x {item.quantity}</span>
                    <span>{formatCurrency(item.unit_price * item.quantity, order.currency)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(order.total_amount + Math.max(1000, Math.round(order.total_amount * 0.01)), order.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-yellow-800 mb-2">Payment Method</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value)
                        setCardNoticeVisible(true)
                      }}
                      className="mr-2"
                    />
                    Credit/Debit Card
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile_money"
                      checked={paymentMethod === 'mobile_money'}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value)
                        setCardNoticeVisible(false)
                      }}
                      className="mr-2"
                    />
                    Mobile Money
                  </label>
                </div>
                {cardNoticeVisible && paymentMethod === 'card' && (
                  <p className="text-sm text-red-600">
                    Credit/Debit Card payments are not active yet. Please select Mobile Money.
                  </p>
                )}
                {paymentMethod === 'mobile_money' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61B82C] focus:border-transparent"
                      value={mobileProvider}
                      onChange={(e) => setMobileProvider(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select Provider</option>
                      <option value="MTN">MTN Mobile Money</option>
                      <option value="Airtel">Airtel Money</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/checkout/${orderId}`)}
                className="flex-1 bg-gray-100 px-4 py-3 rounded hover:bg-gray-200"
              >
                Back to Checkout
              </button>
              <button
                onClick={handlePayment}
                disabled={processing || (paymentMethod === 'card') || (paymentMethod === 'mobile_money' && !mobileProvider)}
                style={{ backgroundColor: '#61B82C' }}
                className="flex-1 text-white px-4 py-3 rounded hover:opacity-90 disabled:opacity-60"
              >
                {processing ? 'Processing…' : 'Complete Payment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}