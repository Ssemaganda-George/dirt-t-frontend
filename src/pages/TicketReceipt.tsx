import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../lib/utils'
import * as QRCode from 'qrcode'
import html2pdf from 'html2pdf.js'

// Helper function to calculate dynamic font size based on email length
const getEmailFontSize = (email: string) => {
  const length = email?.length || 0
  if (length <= 20) return '11px' // Normal size for short emails
  if (length <= 30) return '10px' // Slightly smaller for medium emails
  if (length <= 40) return '9px'  // Smaller for longer emails
  return '8px' // Smallest for very long emails
}

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
            slug,
            title,
            description,
            location,
            event_location,
            event_datetime,
            images,
            vendors(business_name, business_phone, business_email)
          ),
          orders(currency, created_at, user_id, guest_name, guest_email, guest_phone)
        `).eq('order_id', orderId)
        const tix = data || []

        // Fetch profiles for ticket buyers
        let profilesMap: Record<string, { full_name: string; email: string }> = {}
        if (tix && tix.length > 0) {
          const userIds = [...new Set(tix.map(t => t.orders?.user_id).filter(Boolean))]
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', userIds)

            if (!profilesError && profilesData) {
              profilesMap = profilesData.reduce((acc, profile) => {
                acc[profile.id] = { full_name: profile.full_name, email: profile.email }
                return acc
              }, {} as Record<string, { full_name: string; email: string }>)
            }
          }
        }

        // Attach profile or guest information to tickets
        const ticketsWithProfiles = tix.map(ticket => {
          let buyerInfo = null
          
          // First try to get logged-in user profile
          if (ticket.orders?.user_id && profilesMap[ticket.orders.user_id]) {
            buyerInfo = profilesMap[ticket.orders.user_id]
          }
          // If no profile, try guest information
          else if (ticket.orders?.guest_name || ticket.orders?.guest_email) {
            buyerInfo = {
              full_name: ticket.orders.guest_name || 'N/A',
              email: ticket.orders.guest_email || 'N/A'
            }
          }
          
          return {
            ...ticket,
            buyer_profile: buyerInfo
          }
        })

        setTickets(ticketsWithProfiles)

        // generate QR data URLs
        const map: { [key: string]: string } = {}
        for (const t of tix) {
          try {
            const ticketCode = t.code || t.qr_data || t.id
            const serviceSlug = t.services?.slug
            const qrData = serviceSlug
              ? `https://bookings.dirt-trails.com/service/${serviceSlug}?ticket=${ticketCode}`
              : ticketCode
            const url = await QRCode.toDataURL(qrData)
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

  const testPdfGeneration = async () => {
    console.log('Testing PDF generation...')
    console.log('html2pdf available:', typeof html2pdf)

    if (typeof html2pdf === 'undefined') {
      alert('html2pdf library not loaded')
      return
    }

    try {
      // Create a simple test element
      const testElement = document.createElement('div')
      testElement.innerHTML = '<h1>Test PDF</h1><p>This is a test PDF generation.</p>'
      testElement.style.padding = '20px'
      testElement.style.backgroundColor = 'white'
      document.body.appendChild(testElement)

      const options = {
        margin: 0.5,
        filename: 'test.pdf',
        image: { type: 'jpeg' as const, quality: 0.95 },
        html2canvas: { scale: 1 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
      }

      await html2pdf().set(options).from(testElement).save()
      document.body.removeChild(testElement)
      console.log('Test PDF generated successfully')
      alert('Test PDF generated successfully!')
    } catch (error) {
      console.error('Test PDF failed:', error)
      alert('Test PDF failed: ' + error)
    }
  }

  const downloadAllTickets = async () => {

    if (typeof html2pdf === 'undefined') {
      console.error('html2pdf is not available')
      alert('PDF library not loaded. Please refresh the page and try again.')
      return
    }

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i]
      console.log('Processing ticket:', ticket.code, ticket.id)

      const ticketElement = document.querySelector(`[data-ticket-id="${ticket.id}"]`) as HTMLElement
      console.log('Found ticket element:', ticketElement)

      if (ticketElement) {
        // Declare variables outside try block for error handling
        let originalOverflow = ''
        let originalMaxHeight = ''
        let originalWidth = ''
        let originalMaxWidth = ''
        let truncatedElements: NodeListOf<Element> = ticketElement.querySelectorAll('.nonexistent-class')
        let originalClasses: string[] = []

        try {
          console.log('Starting PDF generation for ticket:', ticket.code)

          // Temporarily modify styles for better capture
          originalOverflow = ticketElement.style.overflow
          originalMaxHeight = ticketElement.style.maxHeight
          originalWidth = ticketElement.style.width
          originalMaxWidth = ticketElement.style.maxWidth

          ticketElement.style.overflow = 'visible'
          ticketElement.style.maxHeight = 'none'
          ticketElement.style.width = '650px' // Force width to fit A4
          ticketElement.style.maxWidth = '650px'

          // Remove truncation classes temporarily
          truncatedElements = ticketElement.querySelectorAll('.truncate, .line-clamp-1, .line-clamp-2')
          originalClasses = []
          truncatedElements.forEach((el, index) => {
            originalClasses[index] = el.className
            el.className = el.className.replace(/\b(truncate|line-clamp-\d+)\b/g, '')
          })

          // Wait for images to load
          await new Promise(resolve => setTimeout(resolve, 500))

          // Configure PDF options - high quality for clear, clean output
          const options = {
            margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number], // top, right, bottom, left margins
            filename: `ticket-${ticket.code}.pdf`,
            image: { type: 'jpeg' as const, quality: 1.0 }, // Maximum quality
            html2canvas: {
              scale: 2.5, // Higher scale for crisp, clear rendering
              useCORS: true,
              allowTaint: false,
              backgroundColor: '#ffffff',
              logging: false, // Disable logging for cleaner output
              letterRendering: true,
              width: 650, // Fixed width to fit A4 (8.27in - 1in margins = ~6.27in at 96 DPI)
              height: ticketElement.scrollHeight, // Use scroll height for full content
              scrollX: 0,
              scrollY: 0,
              windowWidth: 650,
              windowHeight: ticketElement.scrollHeight,
              imageTimeout: 0,
              removeContainer: true,
              foreignObjectRendering: true // Better rendering for complex elements
            },
            jsPDF: {
              unit: 'in',
              format: 'a4',
              orientation: 'portrait' as const,
              compress: false // Disable compression for better quality
            }
          }

          console.log('PDF options configured, calling html2pdf')

          // Generate and download PDF
          await html2pdf().set(options).from(ticketElement).save()

          console.log('PDF generated successfully for ticket:', ticket.code)

          // Restore original styles and classes
          ticketElement.style.overflow = originalOverflow
          ticketElement.style.maxHeight = originalMaxHeight
          ticketElement.style.width = originalWidth
          ticketElement.style.maxWidth = originalMaxWidth
          truncatedElements.forEach((el, index) => {
            el.className = originalClasses[index]
          })

          // Add delay between downloads to prevent browser issues
          if (i < tickets.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

        } catch (error) {
          console.error('Error generating PDF for ticket:', ticket.code, error)

          // Restore original styles and classes on error
          ticketElement.style.overflow = originalOverflow
          ticketElement.style.maxHeight = originalMaxHeight
          ticketElement.style.width = originalWidth
          ticketElement.style.maxWidth = originalMaxWidth
          truncatedElements.forEach((el, index) => {
            el.className = originalClasses[index]
          })

          // Show user-friendly error message
          alert(`Failed to download ticket ${ticket.code}. Please try again.`)
        }
      } else {
        console.error('Ticket element not found for ticket:', ticket.code, ticket.id)
        alert(`Ticket element not found for ${ticket.code}. Please refresh the page.`)
      }
    }

    console.log('Download process completed')
  }

  if (loading) return <div className="p-4">Loading tickets…</div>
  if (!tickets || tickets.length === 0) return <div className="p-4">No tickets found for this order.</div>

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-light text-gray-900">Your Tickets</h2>
          <div className="flex gap-2">
            <button
              onClick={testPdfGeneration}
              className="bg-gray-500 text-white px-3 py-1.5 rounded text-xs font-light hover:opacity-90 transition-opacity"
            >
              Test PDF
            </button>
            <button
              onClick={downloadAllTickets}
              style={{ backgroundColor: '#3B82F6' }}
              className="text-white px-3 py-1.5 rounded text-xs font-light flex items-center gap-1 hover:opacity-90 transition-opacity"
            >
              {tickets.length > 1 ? 'Download All' : 'Download Ticket'}
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {tickets.map(t => (
            <div
              key={t.id}
              data-ticket-id={t.id}
              className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden md:overflow-x-visible overflow-x-auto"
            >
              {/* Ticket Header */}
              <div className="border-b border-gray-200 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.services?.images?.[0] ? (
                      <img
                        src={t.services.images[0]}
                        alt={t.services.title}
                        className="w-8 h-8 object-cover rounded border border-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs font-light flex-shrink-0">
                        IMG
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-light text-sm text-gray-900 truncate">{t.services?.title || 'Event'}</h3>
                      <p className="text-gray-600 text-xs font-light truncate">{t.ticket_types?.title || 'Ticket'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-500 font-light">Code</div>
                    <div className="font-mono font-light text-xs text-gray-900">{t.code}</div>
                  </div>
                </div>
              </div>

              {/* Main ticket content - 4 Column Layout */}
              <div className="grid grid-cols-4 gap-2.5 p-2.5 divide-x divide-gray-200 min-w-[600px] md:min-w-0">
                {/* Column 1 - Event Details */}
                <div className="space-y-1 pr-2.5">
                  {t.services?.event_datetime && (
                    <div>
                      <span className="text-xs text-gray-500 font-light">Happening on</span>
                      <p className="text-gray-900 font-light text-xs">
                        {new Date(t.services.event_datetime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-500 font-light">At </span>
                    <p className="text-gray-900 font-light text-xs line-clamp-2">{t.services?.event_location || t.services?.location || 'Venue TBA'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-light">Organised by : </span>
                    <p className="text-gray-900 font-light text-xs line-clamp-1">{t.services?.vendors?.business_name || 'Service Provider'}</p>
                  </div>
                </div>

                {/* Column 2 - Buyer Info */}
                <div className="space-y-1 px-2.5">
                  {t.buyer_profile ? (
                    <>
                      <div>
                        <span className="text-xs text-gray-500 font-light">Owner</span>
                        <p className="text-gray-900 font-light text-xs line-clamp-1">{t.buyer_profile.full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-light">Email</span>
                        <p 
                          className="text-gray-900 font-light line-clamp-1" 
                          style={{ fontSize: getEmailFontSize(t.buyer_profile?.email || 'N/A') }}
                        >
                          {t.buyer_profile.email || 'N/A'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <span className="text-xs text-gray-500 font-light">Owner</span>
                      <p className="text-gray-900 font-light text-xs">N/A</p>
                    </div>
                  )}
                </div>

                {/* Column 3 - Ticket Details */}
                <div className="space-y-1 px-2.5">
                  <div>
                    <span className="text-xs text-gray-500 font-light">Price</span>
                    <p className="text-gray-900 font-light text-xs">{formatCurrency(t.ticket_types?.price || 0, t.orders?.currency || 'UGX')}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-light">Status</span>
                    <p className={`font-light text-xs ${
                      t.status === 'issued' ? 'text-green-600' :
                      t.status === 'used' ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {t.status?.charAt(0).toUpperCase() + t.status?.slice(1)}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 font-light">
                    Issued: {new Date(t.issued_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Column 4 - QR Code */}
                <div className="flex flex-col items-center justify-center pl-2.5">
                  <div className="flex-shrink-0 mb-1">
                    {qrMap[t.id] ? (
                      <img src={qrMap[t.id]} alt={`QR ${t.code}`} className="w-16 h-16 border border-gray-200 rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400 font-light">No QR</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-light text-center">Scan for Entry</div>
                  <div className="text-[10px] text-gray-400 font-light text-center mt-1.5 md:mt-3">
                    Powered by : <br />
                    <a 
                      href="https://bookings.dirt-trails.com" 
                      className="text-blue-500 hover:text-blue-700 font-normal" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      bookings.dirt-trails.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Thank you note and platform link */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center border border-gray-200">
          <div className="text-sm font-medium text-gray-900 mb-2">Thank you for choosing{' '}
            <a
              href="https://dirttrails.com"
              className="text-blue-600 hover:text-blue-800 font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              DirtTrails!
            </a>{' '}</div>
          <div className="text-xs text-gray-600 mb-3">We hope you have an amazing experience at {tickets[0]?.services?.title || 'the event'}. See You!</div>
        </div>
      </div>
    </div>
  )
}
