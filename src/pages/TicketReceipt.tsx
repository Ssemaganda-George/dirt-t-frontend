import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../lib/utils'
import * as QRCode from 'qrcode'
import html2pdf from 'html2pdf.js'

// ─── DESIGN TOKENS (match the ticket PDF exactly) ─────────────────────────────
const T = {
  green:  '#1B3A2D',
  amber:  '#C9873A',
  ivory:  '#FAF6EE',
  dark:   '#1C1917',
  sage:   '#8FAF9B',
  cream:  '#F2EDE4',
  white:  '#FFFFFF',
}

export default function TicketReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [qrMap, setQrMap]       = useState<Record<string, string>>({})
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!orderId) return
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('tickets')
          .select(`
            *,
            ticket_types(*),
            services(
              id, slug, title, description, location,
              event_location, event_datetime, images,
              vendors(business_name, business_phone, business_email)
            ),
            orders(currency, created_at, user_id, guest_name, guest_email, guest_phone)
          `)
          .eq('order_id', orderId)

        const tix = data || []

        // Fetch profiles for logged-in buyers
        let profilesMap: Record<string, { full_name: string; email: string }> = {}
        const userIds = [...new Set(tix.map((t: any) => t.orders?.user_id).filter(Boolean))] as string[]
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          if (profiles) {
            profilesMap = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = { full_name: p.full_name, email: p.email }
              return acc
            }, {})
          }
        }

        const ticketsWithProfiles = tix.map((ticket: any) => {
          let buyer = null
          if (ticket.orders?.user_id && profilesMap[ticket.orders.user_id]) {
            buyer = profilesMap[ticket.orders.user_id]
          } else if (ticket.orders?.guest_name || ticket.orders?.guest_email) {
            buyer = {
              full_name: ticket.orders.guest_name || 'Guest',
              email:     ticket.orders.guest_email || '',
            }
          }
          return { ...ticket, buyer_profile: buyer }
        })

        setTickets(ticketsWithProfiles)

        // Generate QR data URLs
        const map: Record<string, string> = {}
        for (const t of tix) {
          try {
            const code    = t.code || t.qr_data || t.id
            const slug    = t.services?.slug
            const qrData  = slug
              ? `https://bookings.dirt-trails.com/service/${slug}?ticket=${code}`
              : code
            map[t.id] = await QRCode.toDataURL(qrData, { width: 160 })
          } catch { /* ignore QR failures */ }
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
    setDownloading(true)
    for (let i = 0; i < tickets.length; i++) {
      const t  = tickets[i]
      const el = document.querySelector(`[data-ticket-id="${t.id}"]`) as HTMLElement
      if (!el) { console.error('Element not found:', t.id); continue }

      const prev = { overflow: el.style.overflow, width: el.style.width, maxWidth: el.style.maxWidth }
      el.style.overflow = 'visible'
      el.style.width    = '650px'
      el.style.maxWidth = '650px'

      try {
        await html2pdf().set({
          margin:    0,
          filename:  `DirtTrails-Ticket-${(t.code || t.id).toUpperCase()}.pdf`,
          image:     { type: 'jpeg', quality: 1.0 },
          html2canvas: {
            scale: 3,
            useCORS: true,
            backgroundColor: T.white,
            width: 650,
            height: el.scrollHeight,
            windowWidth: 650,
          },
          jsPDF: { unit: 'px', format: [650, el.scrollHeight + 2], orientation: 'landscape' },
        }).from(el).save()
        if (i < tickets.length - 1) await new Promise(r => setTimeout(r, 800))
      } catch (err) {
        console.error('PDF error for', t.code, err)
      } finally {
        el.style.overflow = prev.overflow
        el.style.width    = prev.width
        el.style.maxWidth = prev.maxWidth
      }
    }
    setDownloading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.sage, fontFamily: 'Arial, sans-serif', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '12px' }}>
        Loading tickets…
      </p>
    </div>
  )

  if (!tickets.length) return (
    <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.dark, fontFamily: 'Arial, sans-serif' }}>No tickets found for this order.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '32px 16px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 3px', color: T.green, fontSize: '22px', fontFamily: 'Georgia, serif', fontWeight: 700, letterSpacing: '6px', textTransform: 'uppercase' }}>
              DIRT TRAILS
            </h1>
            <p style={{ margin: 0, color: T.sage, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase' }}>
              {tickets.length} TICKET{tickets.length !== 1 ? 'S' : ''} · ORDER {orderId?.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={downloadAllTickets}
            disabled={downloading}
            style={{
              background: downloading ? T.sage : T.green,
              color: T.ivory,
              border: 'none',
              padding: '11px 24px',
              fontSize: '10px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 700,
              cursor: downloading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {downloading ? 'Generating…' : tickets.length > 1 ? 'Download All' : 'Download PDF'}
          </button>
        </div>

        {/* ── TICKET LIST ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tickets.map(t => {
            const service  = t.services    || {}
            const ttype    = t.ticket_types || {}
            const order    = t.orders       || {}
            const code     = (t.code || t.qr_data || t.id || '').toUpperCase()
            const currency = order.currency || 'UGX'

            const eventDate = service.event_datetime
              ? new Date(service.event_datetime).toLocaleDateString('en-GB', {
                  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                })
              : null
            const eventTime = service.event_datetime
              ? new Date(service.event_datetime).toLocaleTimeString('en-GB', {
                  hour: '2-digit', minute: '2-digit',
                })
              : null
            const venue = service.event_location || service.location || ''

            return (
              /*
               * This element is captured by html2pdf at 650px width.
               * Layout mirrors the A5-landscape ticket PDF from send-order-emails exactly:
               * - 7px left green stripe
               * - Green header band (46px)
               * - Amber "VALID TICKET" stripe (13px)
               * - Content: event details (left) + QR panel (right, 150px)
               */
              <div
                key={t.id}
                data-ticket-id={t.id}
                style={{
                  width: '100%',
                  maxWidth: '650px',
                  background: T.ivory,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '0 6px 32px rgba(27,58,45,0.14)',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                }}
              >
                {/* LEFT GREEN STRIPE + HEADER + STATUS as stacked rows */}
                <div style={{ display: 'flex' }}>

                  {/* Persistent left accent stripe */}
                  <div style={{ width: '7px', flexShrink: 0, background: T.green }} />

                  <div style={{ flex: 1 }}>

                    {/* ── HEADER BAND ── */}
                    <div style={{
                      background: T.green,
                      padding: '0 16px',
                      height: '46px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ color: T.ivory, fontSize: '14px', fontWeight: 700, letterSpacing: '4px', lineHeight: 1.2 }}>
                          DIRT TRAILS
                        </div>
                        <div style={{ color: T.amber, fontSize: '7px', letterSpacing: '3px', textTransform: 'uppercase' }}>
                          EVENT TICKET
                        </div>
                      </div>
                      {ttype.title && (
                        <div style={{
                          color: T.amber,
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '2px',
                          textTransform: 'uppercase',
                          border: '1px solid rgba(201,135,58,0.5)',
                          padding: '3px 10px',
                        }}>
                          {ttype.title.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* ── AMBER STATUS STRIPE ── */}
                    <div style={{
                      background: T.amber,
                      height: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 16px',
                    }}>
                      <span style={{
                        color: T.green,
                        fontSize: '7px',
                        fontWeight: 700,
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                      }}>
                        ✓ &nbsp;VALID TICKET
                      </span>
                    </div>

                    {/* ── CONTENT ROW ── */}
                    <div style={{ display: 'flex', minHeight: '148px' }}>

                      {/* Left: Event details */}
                      <div style={{ flex: 1, padding: '14px 16px 12px', display: 'flex', flexDirection: 'column', gap: '0' }}>

                        {/* Event title */}
                        <div style={{
                          color: T.dark,
                          fontSize: '13px',
                          fontWeight: 700,
                          marginBottom: '10px',
                          lineHeight: 1.3,
                          letterSpacing: '0.3px',
                        }}>
                          {service.title || 'Event'}
                        </div>

                        {/* Organiser */}
                        {service.vendors?.business_name && (
                          <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: T.sage, fontSize: '6.5px', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>BY</span>
                            <span style={{ color: T.dark, fontSize: '8.5px', fontWeight: 700 }}>{service.vendors.business_name}</span>
                          </div>
                        )}

                        {/* Date */}
                        {eventDate && (
                          <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: T.sage, fontSize: '6.5px', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>DATE &amp; TIME</span>
                            <span style={{ color: T.dark, fontSize: '8.5px', fontWeight: 700 }}>{eventDate}{eventTime ? ` · ${eventTime}` : ''}</span>
                          </div>
                        )}

                        {/* Venue */}
                        {venue && (
                          <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: T.sage, fontSize: '6.5px', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>VENUE</span>
                            <span style={{ color: T.dark, fontSize: '8.5px', fontWeight: 700 }}>{venue.length > 50 ? venue.slice(0, 50) + '…' : venue}</span>
                          </div>
                        )}

                        {/* Buyer */}
                        {t.buyer_profile?.full_name && (
                          <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: T.sage, fontSize: '6.5px', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>TICKET HOLDER</span>
                            <span style={{ color: T.dark, fontSize: '8.5px', fontWeight: 700 }}>{t.buyer_profile.full_name}</span>
                          </div>
                        )}

                        {/* Price + Ref at bottom */}
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                          <div>
                            {ttype.price != null && (
                              <div style={{ color: T.green, fontSize: '13px', fontWeight: 700, fontFamily: '"Courier New", Courier, monospace' }}>
                                {formatCurrency(Number(ttype.price), currency)}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: T.sage, fontSize: '6.5px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>REF</div>
                            <div style={{ color: T.dark, fontSize: '7px', fontFamily: '"Courier New", Courier, monospace', fontWeight: 700 }}>{code.slice(0, 16)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Perforated divider */}
                      <div style={{
                        width: '16px',
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        background: T.ivory,
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: '50%',
                          width: '1px',
                          backgroundImage: `repeating-linear-gradient(to bottom, ${T.cream} 0px, ${T.cream} 5px, transparent 5px, transparent 10px)`,
                        }} />
                        {/* Top semicircle cut */}
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: T.cream,
                        }} />
                        {/* Bottom semicircle cut */}
                        <div style={{
                          position: 'absolute',
                          bottom: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: T.cream,
                        }} />
                      </div>

                      {/* Right: QR panel */}
                      <div style={{
                        width: '148px',
                        flexShrink: 0,
                        background: T.cream,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '14px 12px 12px',
                        gap: '8px',
                      }}>
                        {qrMap[t.id] ? (
                          <img
                            src={qrMap[t.id]}
                            alt={`QR ${code}`}
                            style={{ width: '108px', height: '108px', display: 'block' }}
                          />
                        ) : (
                          <div style={{
                            width: '108px',
                            height: '108px',
                            background: T.white,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span style={{ color: T.sage, fontSize: '8px', fontFamily: 'Arial, sans-serif' }}>QR</span>
                          </div>
                        )}
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ margin: '0 0 3px', color: T.sage, fontSize: '6.5px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                            SCAN TO VERIFY
                          </p>
                          <p style={{ margin: 0, color: T.dark, fontSize: '6px', fontFamily: '"Courier New", Courier, monospace', wordBreak: 'break-all' }}>
                            {code.slice(0, 14)}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── FOOTER NOTE ── */}
        <div style={{
          marginTop: '32px',
          background: T.green,
          padding: '24px 32px',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 6px', color: T.amber, fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' }}>
            DIRTTRAILS ADVENTURES
          </p>
          <p style={{ margin: 0, color: T.sage, fontSize: '12px', lineHeight: 1.7 }}>
            Enjoy the event! Present your QR code at the entrance.
          </p>
        </div>
      </div>
    </div>
  )
}
