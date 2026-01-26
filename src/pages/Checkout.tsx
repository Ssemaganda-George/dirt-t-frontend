import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { confirmOrderAndIssueTickets } from '../lib/database'

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [buyer, setBuyer] = useState({ name: '', email: '', phone: '' })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!orderId) return
      setLoading(true)
      try {
        const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
        setOrder(o)
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

  const handleMockPay = async () => {
    if (!orderId || !order) return
    setProcessing(true)
    try {
      // Build payment object for confirmOrderAndIssueTickets
      const payment = {
        vendor_id: order.vendor_id,
        tourist_id: order.user_id || undefined,
        amount: order.total_amount,
        currency: order.currency,
        payment_method: 'mock',
        reference: `MOCK_${orderId}_${Date.now()}`
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
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Checkout</h2>

      <div className="bg-white p-4 rounded shadow mb-4">
        <h3 className="font-medium">Order Summary</h3>
        <div className="mt-2 space-y-2">
          {items.map(it => (
            <div key={it.id} className="flex justify-between">
              <div>{it.ticket_type_id}</div>
              <div>{it.quantity} × {it.unit_price}</div>
            </div>
          ))}
          <div className="flex justify-between font-bold mt-2">
            <div>Total</div>
            <div>{order.total_amount} {order.currency}</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-4">
        <h3 className="font-medium">Buyer Information</h3>
        <div className="grid grid-cols-1 gap-3 mt-3">
          <input className="border px-3 py-2 rounded" placeholder="Full name" value={buyer.name} onChange={(e) => setBuyer(s => ({ ...s, name: e.target.value }))} />
          <input className="border px-3 py-2 rounded" placeholder="Email" value={buyer.email} onChange={(e) => setBuyer(s => ({ ...s, email: e.target.value }))} />
          <input className="border px-3 py-2 rounded" placeholder="Phone" value={buyer.phone} onChange={(e) => setBuyer(s => ({ ...s, phone: e.target.value }))} />
        </div>
      </div>

      <div className="flex space-x-3">
        <button onClick={handleMockPay} disabled={processing} className="bg-green-600 text-white px-4 py-2 rounded">{processing ? 'Processing…' : 'Mock Pay & Issue Tickets'}</button>
        <button onClick={() => navigate(-1)} className="bg-gray-100 px-4 py-2 rounded">Back</button>
      </div>
    </div>
  )
}
