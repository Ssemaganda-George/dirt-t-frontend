import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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
            event_datetime,
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
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 10px 0; overflow: hidden; max-width: 800px;">
        <!-- Ticket Header -->
        <div style="background: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${t.services?.images?.[0] ? `<img src="${t.services.images[0]}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />` : '<div style="width: 48px; height: 48px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #9ca3af;">IMG</div>'}
              <div>
                <h3 style="font-weight: 400; font-size: 14px; margin: 0; color: #1f2937;">${t.services?.title || 'Event'}</h3>
                <p style="color: #6b7280; margin: 2px 0 0 0; font-size: 12px; font-weight: 400;">${t.ticket_types?.title || 'Ticket'}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: #6b7280; font-weight: 400;">Ticket Code</div>
              <div style="font-family: monospace; font-weight: 500; font-size: 13px; color: #1f2937;">${t.code}</div>
            </div>
          </div>
        </div>

        <!-- Main ticket content - Horizontal Layout -->
        <div style="display: flex;">
          <!-- Left side - QR and basic info -->
          <div style="flex: 1; padding: 16px; border-right: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="text-align: center;">
                ${qrMap[t.id] ? `<img src="${qrMap[t.id]}" style="width: 80px; height: 80px; border: 1px solid #e5e7eb; border-radius: 4px;" />` : '<div style="width: 80px; height: 80px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #9ca3af;">No QR</div>'}
              </div>
              <div style="flex: 1;">
                ${t.services?.event_datetime ? `
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 6px; font-weight: 400;">
                    <span style="color: #6b7280;">Date</span>
                    <span style="color: #374151;">${new Date(t.services.event_datetime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                ` : ''}
                <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 12px; margin-bottom: 6px; font-weight: 400;">
                  <span style="color: #6b7280;">Location</span>
                  <span style="color: #374151;">${t.services?.event_location || t.services?.location || 'Venue TBA'}</span>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 12px; margin-bottom: 6px; font-weight: 400;">
                  <span style="color: #6b7280;">Provider</span>
                  <span style="color: #374151;">${t.services?.vendors?.business_name || 'Service Provider'}</span>
                </div>
                <div style="font-size: 11px; color: #9ca3af; font-weight: 400;">
                  Issued: ${new Date(t.issued_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <!-- Right side - Details -->
          <div style="flex: 1; padding: 16px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 12px; margin-bottom: 4px; font-weight: 400;">
                <span style="color: #6b7280;">Price </span>
                <span style="font-weight: 500; color: #1f2937;">${formatCurrency(t.ticket_types?.price || 0, t.orders?.currency || 'UGX')}</span>
              </div>
              <div style="font-size: 12px; margin-bottom: 8px; font-weight: 400;">
                <span style="color: #6b7280;">Status </span>
                <span style="font-weight: 500; color: ${t.status === 'issued' ? '#10b981' : t.status === 'used' ? '#3b82f6' : '#6b7280'};">${t.status?.charAt(0).toUpperCase() + t.status?.slice(1)}</span>
              </div>
              <div style="font-size: 11px; color: #9ca3af; font-weight: 400;">
                Valid for entry
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
            <h1 style="text-align: center; color: #1f2937; margin-bottom: 20px; font-weight: 400;">Your Tickets</h1>
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-light text-gray-900">Your Tickets</h2>
          {tickets.length > 1 && (
            <button
              onClick={downloadAllTickets}
              style={{ backgroundColor: '#3B82F6' }}
              className="text-white px-4 py-2 rounded-lg hover:opacity-90 text-sm font-light flex items-center gap-2 transition-opacity"
            >
              Download All
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {tickets.map(t => (
            <div
              key={t.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Ticket Header */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {t.services?.images?.[0] ? (
                      <img
                        src={t.services.images[0]}
                        alt={t.services.title}
                        className="w-12 h-12 object-cover rounded border border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs font-light">
                        IMG
                      </div>
                    )}
                    <div>
                      <h3 className="font-light text-base text-gray-900">{t.services?.title || 'Event'}</h3>
                      <p className="text-gray-600 text-xs font-light">{t.ticket_types?.title || 'Ticket'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-light">Ticket Code</div>
                    <div className="font-mono font-light text-sm text-gray-900">{t.code}</div>
                  </div>
                </div>
              </div>

              {/* Main ticket content */}
              <div className="flex flex-col md:flex-row">
                {/* Left side - QR and basic info */}
                <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-gray-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {qrMap[t.id] ? (
                        <img src={qrMap[t.id]} alt={`QR ${t.code}`} className="w-20 h-20 border border-gray-200 rounded" />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-light">No QR</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      {t.services?.event_datetime && (
                        <div className="text-xs">
                          <span className="text-gray-500 font-light">Date</span>
                          <p className="text-gray-900 font-light text-sm mt-1">
                            {new Date(t.services.event_datetime).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                      <div className="text-xs">
                        <span className="text-gray-500 font-light">Location</span>
                        <p className="text-gray-900 font-light text-sm mt-1">{t.services?.event_location || t.services?.location || 'Venue TBA'}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-500 font-light">Provider</span>
                        <p className="text-gray-900 font-light text-sm mt-1">{t.services?.vendors?.business_name || 'Service Provider'}</p>
                      </div>
                      <div className="text-xs text-gray-500 font-light pt-2">
                        Issued: {new Date(t.issued_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Details */}
                <div className="flex-1 p-4 flex items-center justify-between md:justify-start md:flex-col md:space-y-3">
                  <div className="flex-1">
                    <div className="text-xs">
                      <span className="text-gray-500 font-light">Price</span>
                      <p className="text-gray-900 font-light text-sm mt-1">{formatCurrency(t.ticket_types?.price || 0, t.orders?.currency || 'UGX')}</p>
                    </div>
                  </div>
                  <div className="flex-1 md:flex-none">
                    <div className="text-xs">
                      <span className="text-gray-500 font-light">Status</span>
                      <p className={`font-light text-sm mt-1 ${
                        t.status === 'issued' ? 'text-green-600' :
                        t.status === 'used' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {t.status?.charAt(0).toUpperCase() + t.status?.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-light md:pt-2">
                    Valid for entry
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
