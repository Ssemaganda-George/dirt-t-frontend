import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../lib/utils'
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
        const { data } = await supabase.from('tickets').select(`
          *,
          ticket_types(*),
          services(
            id,
            title,
            description,
            location,
            event_location,
            images,
            vendors(business_name, business_phone, business_email)
          ),
          orders(currency, created_at)
        `).eq('order_id', orderId)
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

  const downloadAllTickets = async () => {
    // Create a simple HTML page with all tickets for printing/downloading
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const ticketHtml = tickets.map(t => `
      <div style="border: 2px solid #e5e7eb; border-radius: 8px; margin: 10px 0; overflow: hidden; max-width: 800px;">
        <!-- Ticket Header -->
        <div style="background: linear-gradient(to right, #61B82C, #4a8f23); color: white; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎫</div>
              <div>
                <h3 style="font-weight: bold; font-size: 16px; margin: 0;">${t.services?.title || 'Event'}</h3>
                <p style="color: rgba(255,255,255,0.9); margin: 2px 0 0 0; font-size: 12px;">${t.ticket_types?.title || 'Ticket'}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.8);">Ticket Code</div>
              <div style="font-family: monospace; font-weight: bold; font-size: 14px;">${t.code}</div>
            </div>
          </div>
        </div>

        <!-- Main ticket content - Horizontal Layout -->
        <div style="display: flex;">
          <!-- Left side - QR and basic info -->
          <div style="flex: 1; padding: 16px; border-right: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="text-align: center;">
                ${qrMap[t.id] ? `<img src="${qrMap[t.id]}" style="width: 80px; height: 80px; border: 1px solid #d1d5db; border-radius: 4px;" />` : '<div style="width: 80px; height: 80px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280;">No QR</div>'}
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 4px;">
                  <span style="color: #6b7280;">📍</span>
                  <span style="color: #4b5563;">${t.services?.event_location || t.services?.location || 'Venue TBA'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 4px;">
                  <span style="color: #6b7280;">👥</span>
                  <span style="color: #4b5563;">${t.services?.vendors?.business_name || 'Service Provider'}</span>
                </div>
                <div style="font-size: 10px; color: #6b7280;">
                  Issued: ${new Date(t.issued_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <!-- Right side - Details -->
          <div style="flex: 1; padding: 16px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Price: </span>
                <span style="font-weight: 600;">${formatCurrency(t.ticket_types?.price || 0, t.orders?.currency || 'UGX')}</span>
              </div>
              <div style="font-size: 12px; margin-bottom: 8px;">
                <span style="color: #6b7280;">Status: </span>
                <span style="font-weight: 600; color: ${t.status === 'issued' ? '#059669' : t.status === 'used' ? '#2563eb' : '#6b7280'};">${t.status?.charAt(0).toUpperCase() + t.status?.slice(1)}</span>
              </div>
              <div style="font-size: 10px; color: #6b7280;">
                Valid for entry • Present at venue
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All Tickets - ${tickets[0]?.services?.title || 'Event'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div style="max-width: 900px; margin: 0 auto;">
            <h1 style="text-align: center; color: #61B82C; margin-bottom: 20px;">Your Tickets</h1>
            ${ticketHtml}
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    // Auto-print after a short delay to ensure images load
    setTimeout(() => {
      printWindow.print()
    }, 1000)
  }

  if (loading) return <div className="p-6">Loading tickets…</div>
  if (!tickets || tickets.length === 0) return <div className="p-6">No tickets found for this order.</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Your Tickets</h2>
        {tickets.length > 1 && (
          <button
            onClick={downloadAllTickets}
            style={{ backgroundColor: '#61B82C' }}
            className="text-white px-4 py-2 rounded-lg hover:opacity-90 text-sm font-medium flex items-center gap-2"
          >
            📄 Download All Tickets
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4">
        {tickets.map(t => (
          <div
            key={t.id}
            className="bg-white border-2 border-gray-200 rounded-lg shadow-md overflow-hidden max-w-4xl mx-auto"
          >
            {/* Ticket Header - Horizontal Layout */}
            <div className="bg-gradient-to-r from-[#61B82C] to-[#4a8f23] text-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {t.services?.images?.[0] ? (
                    <img
                      src={t.services.images[0]}
                      alt={t.services.title}
                      className="w-12 h-12 object-cover rounded border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center text-white font-bold">
                      🎫
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base">{t.services?.title || 'Event'}</h3>
                    <p className="text-white/90 text-xs">{t.ticket_types?.title || 'Ticket'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/80">Ticket Code</div>
                  <div className="font-mono font-bold text-sm">{t.code}</div>
                </div>
              </div>
            </div>

            {/* Main ticket content - Horizontal Layout */}
            <div className="flex">
              {/* Left side - QR and basic info */}
              <div className="flex-1 p-4 border-r border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    {qrMap[t.id] ? (
                      <img src={qrMap[t.id]} alt={`QR ${t.code}`} className="w-20 h-20 object-contain border border-gray-200 rounded" />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No QR</div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">{t.services?.event_location || t.services?.location || 'Venue TBA'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">{t.services?.vendors?.business_name || 'Service Provider'}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Issued: {new Date(t.issued_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Details */}
              <div className="flex-1 p-4 flex items-center">
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-gray-500">Price: </span>
                    <span className="font-semibold">{formatCurrency(t.ticket_types?.price || 0, t.orders?.currency || 'UGX')}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Status: </span>
                    <span className={`font-semibold ${
                      t.status === 'issued' ? 'text-green-600' :
                      t.status === 'used' ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {t.status?.charAt(0).toUpperCase() + t.status?.slice(1)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Valid for entry • Present at venue
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
