import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import * as QRCode from 'qrcode'

export default function TicketReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [qrMap, setQrMap] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const load = async () => {
      if (!orderId) return
      setLoading(true)
      try {
        const { data } = await supabase.from('tickets').select('*, ticket_types(*)').eq('order_id', orderId)
        const tix = data || []
        setTickets(tix)

        // generate QR data URLs
        const map: { [key: string]: string } = {}
        for (const t of tix) {
          try {
            const url = await QRCode.toDataURL(t.qr_data || t.code || `${t.id}`)
            map[t.id] = url
          } catch (err) {
            console.error('Failed to generate QR for ticket', t.id, err)
          }
        }
        setQrMap(map)
      } catch (err) {
        console.error('Failed to load tickets:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [orderId])

  if (loading) return <div className="p-6">Loading tickets…</div>
  if (!tickets || tickets.length === 0) return <div className="p-6">No tickets found for this order.</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Your Tickets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickets.map(t => (
          <div key={t.id} className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">{t.ticket_types?.title || 'Ticket'}</div>
                <div className="text-sm text-gray-500">Code: {t.code}</div>
              </div>
              <div>
                {qrMap[t.id] ? (
                  <img src={qrMap[t.id]} alt={`QR ${t.code}`} className="w-28 h-28 object-contain" />
                ) : (
                  <div className="w-28 h-28 bg-gray-100 flex items-center justify-center">No QR</div>
                )}
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center">
              <div className="text-sm text-gray-600">Status: {t.status}</div>
              {qrMap[t.id] && (
                <a href={qrMap[t.id]} download={`ticket-${t.code}.png`} className="text-blue-600 underline">Download</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
