import { CheckCircle, Printer } from 'lucide-react'
import { Booking } from '../types'
import { formatCurrencyWithConversion } from '../lib/utils'
import SimilarServicesCarousel from './SimilarServicesCarousel'

// ─── DESIGN TOKENS (identical to send-booking-emails PDF) ─────────────────────
const T = {
  green:   '#1B3A2D',
  amber:   '#C9873A',
  ivory:   '#FAF6EE',
  dark:    '#1C1917',
  sage:    '#8FAF9B',
  cream:   '#F2EDE4',
  paid:    '#2D6A4F',
  pending: '#C9873A',
}

interface BookingReceiptProps {
  booking: Booking
  showActions?: boolean
  onClose?: () => void
}

// Section header: thin rule + sage label — matches PDF sectionHead()
const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{ marginBottom: '12px', marginTop: '4px' }}>
    <div style={{ height: '1px', background: T.cream, marginBottom: '6px' }} />
    <p style={{
      margin: 0,
      fontSize: '7px',
      letterSpacing: '3px',
      textTransform: 'uppercase' as const,
      color: T.sage,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 600,
    }}>
      {children}
    </p>
  </div>
)

// Data row: sage label left, dark bold value right — matches PDF row()
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
    <span style={{ color: T.sage, fontSize: '8.5px', flexShrink: 0, width: '42%', fontFamily: 'Arial, sans-serif' }}>
      {label}
    </span>
    <span style={{
      color: T.dark,
      fontSize: '8.5px',
      fontWeight: 700,
      textAlign: 'right' as const,
      wordBreak: 'break-word' as const,
      maxWidth: '56%',
      fontFamily: 'Arial, sans-serif',
    }}>
      {value}
    </span>
  </div>
)

export default function BookingReceipt({ booking, showActions = false, onClose }: BookingReceiptProps) {
  const fmt = (amount: number, currency: string) => formatCurrencyWithConversion(amount, currency)

  const customerName  = booking.is_guest_booking
    ? (booking.guest_name  || 'Guest')
    : (booking.tourist_profile?.full_name || 'Not available')
  const customerEmail = booking.is_guest_booking
    ? (booking.guest_email || '—')
    : (booking.tourist_profile?.phone || '—')
  const customerPhone = booking.is_guest_booking
    ? (booking.guest_phone || '—')
    : (booking.tourist_profile?.phone || '—')

  const vendor     = (booking.service as any)?.vendors
  const payColor   = booking.payment_status === 'paid' ? T.paid : T.pending
  const serviceDate = booking.service_date
    ? new Date(booking.service_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : 'To be confirmed'

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* ── TOP SCALLOPED EDGE ── */}
      <div style={{
        height: '14px',
        background: T.ivory,
        backgroundImage: `radial-gradient(circle at 10px 14px, ${T.cream} 10px, transparent 11px)`,
        backgroundSize: '20px 14px',
        backgroundRepeat: 'repeat-x',
        borderLeft: `1px solid #D4C9B8`,
        borderRight: `1px solid #D4C9B8`,
      }} />

      {/* ── RECEIPT BODY ── */}
      <div style={{
        background: T.ivory,
        border: '1px solid #D4C9B8',
        borderTop: 'none',
        borderBottom: 'none',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 28px rgba(27,58,45,0.10)',
      }}>

        {/* Faint CONFIRMED watermark */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
        }}>
          <span style={{
            fontSize: '64px', fontWeight: 900, letterSpacing: '4px',
            color: T.green, opacity: 0.03,
            transform: 'rotate(-22deg)', whiteSpace: 'nowrap',
            userSelect: 'none' as const, fontFamily: 'Georgia, serif',
            textTransform: 'uppercase' as const,
          }}>
            CONFIRMED
          </span>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* ── HEADER ── matches PDF: amber rules, "DIRT TRAILS" centered ── */}
          <div style={{ background: T.green, padding: '28px 24px', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              borderTop: `1px solid rgba(201,135,58,0.55)`,
              borderBottom: `1px solid rgba(201,135,58,0.55)`,
              padding: '7px 28px',
            }}>
              <h1 style={{
                margin: '0 0 4px', color: T.ivory,
                fontSize: '22px', letterSpacing: '10px',
                fontFamily: 'Georgia, serif', textTransform: 'uppercase',
                fontWeight: 700, lineHeight: 1.1,
              }}>
                DIRT TRAILS
              </h1>
              <p style={{
                margin: 0, color: T.amber,
                fontSize: '7.5px', letterSpacing: '5px',
                textTransform: 'uppercase', fontFamily: 'Arial, sans-serif',
              }}>
                ADVENTURE BOOKING RECEIPT
              </p>
            </div>
          </div>

          {/* ── STATUS STRIPE ── amber, matches PDF ── */}
          <div style={{ background: T.amber, padding: '10px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
              <CheckCircle size={11} color={T.green} />
              <span style={{
                color: T.green, fontSize: '9.5px', letterSpacing: '4px',
                fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif',
              }}>
                BOOKING CONFIRMED
              </span>
            </div>
          </div>

          {/* ── RECEIPT CONTENT ── */}
          <div style={{ padding: '16px 20px' }}>

            {/* Reference box: cream bg + amber left border — matches PDF */}
            <div style={{
              background: T.cream,
              borderLeft: `3px solid ${T.amber}`,
              padding: '13px 15px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: T.sage, fontFamily: 'Arial, sans-serif' }}>
                  BOOKING REFERENCE
                </p>
                <p style={{
                  margin: 0, fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: T.green,
                  wordBreak: 'break-all',
                }}>
                  {booking.id?.toUpperCase() || 'N/A'}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '12px' }}>
                <p style={{ margin: '0 0 3px', fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: T.sage, fontFamily: 'Arial, sans-serif' }}>
                  DATE BOOKED
                </p>
                <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: T.dark, fontFamily: 'Arial, sans-serif' }}>
                  {booking.booking_date
                    ? new Date(booking.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>

            {/* ── GUEST ── */}
            <SectionHead>Guest</SectionHead>
            <Row label="Name"  value={customerName} />
            <Row label="Email" value={customerEmail} />
            <Row label="Phone" value={customerPhone} />

            {/* ── SERVICE DETAILS ── */}
            <SectionHead>Service Details</SectionHead>
            <Row label="Service"         value={booking.service?.title    || 'N/A'} />
            <Row label="Provider"        value={vendor?.business_name     || 'N/A'} />
            <Row label="Location"        value={booking.service?.location || 'N/A'} />

            {booking.service?.service_categories?.name === 'transport' && (
              <>
                {booking.service?.price_within_town != null && (
                  <Row label="Within Town" value={fmt(Number(booking.service.price_within_town), booking.service?.currency || 'UGX')} />
                )}
                {booking.service?.price_upcountry != null && (
                  <Row label="Upcountry" value={fmt(Number(booking.service.price_upcountry), booking.service?.currency || 'UGX')} />
                )}
              </>
            )}

            <Row label="Experience Date" value={serviceDate} />
            {booking.service?.duration_hours != null && (
              <Row label="Duration" value={`${booking.service.duration_hours} hrs`} />
            )}
            <Row label="Guests" value={`${booking.guests || 1} guest${(booking.guests || 1) !== 1 ? 's' : ''}`} />

            {/* ── SERVICE PROVIDER ── */}
            <SectionHead>Service Provider</SectionHead>
            <Row label="Business" value={vendor?.business_name  || 'N/A'} />
            <Row label="Contact"  value={vendor?.business_email || 'N/A'} />
            {vendor?.business_address && (
              <Row label="Address" value={vendor.business_address} />
            )}

            {/* ── PAYMENT SUMMARY ── cream box with large amount + status — matches PDF ── */}
            <SectionHead>Payment Summary</SectionHead>
            <Row label="Unit Price" value={booking.service ? fmt(booking.service.price, booking.service.currency) : 'N/A'} />
            <Row label="Quantity"   value={String(booking.guests || 1)} />

            <div style={{
              background: T.cream,
              padding: '16px 16px',
              marginTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '7.5px', letterSpacing: '2px', textTransform: 'uppercase', color: T.sage, fontFamily: 'Arial, sans-serif' }}>
                  TOTAL AMOUNT
                </p>
                <p style={{
                  margin: 0, fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '20px', fontWeight: 700, color: T.green,
                }}>
                  {fmt(booking.total_amount || 0, booking.currency || 'UGX')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 4px', fontSize: '7.5px', letterSpacing: '2px', textTransform: 'uppercase', color: T.sage, fontFamily: 'Arial, sans-serif' }}>
                  STATUS
                </p>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: payColor, fontFamily: 'Arial, sans-serif' }}>
                  {booking.payment_status?.toUpperCase() || 'PENDING'}
                </p>
              </div>
            </div>

          </div>

          {/* ── GREEN FOOTER BAND ── matches PDF footer exactly ── */}
          <div style={{ background: T.green, padding: '18px 24px', position: 'relative' }}>
            <div style={{ borderTop: `1px solid rgba(201,135,58,0.4)`, paddingTop: '10px', paddingBottom: '10px' }}>
              <div style={{ borderBottom: `1px solid rgba(201,135,58,0.4)`, paddingBottom: '10px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: T.ivory, fontSize: '8px', letterSpacing: '2px', fontFamily: 'Arial, sans-serif' }}>
                  DIRTTRAILS ADVENTURES &nbsp;·&nbsp; Keep this receipt for your records
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── BOTTOM SCALLOPED EDGE ── */}
      <div style={{
        height: '14px',
        background: T.ivory,
        backgroundImage: `radial-gradient(circle at 10px 0px, ${T.cream} 10px, transparent 11px)`,
        backgroundSize: '20px 14px',
        backgroundRepeat: 'repeat-x',
        borderLeft: '1px solid #D4C9B8',
        borderRight: '1px solid #D4C9B8',
        borderBottom: '1px solid #D4C9B8',
      }} />

      {/* ── ACTION BUTTONS ── */}
      {showActions && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={() => window.open(`/service/${booking.service?.slug || booking.service?.id}/inquiry`, '_blank')}
            style={{
              flex: 1, background: T.green, color: T.ivory, border: 'none',
              padding: '12px 8px', fontSize: '10px', letterSpacing: '2px',
              textTransform: 'uppercase', fontFamily: 'Arial, sans-serif',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Message Provider
          </button>
          <button
            onClick={() => window.print()}
            style={{
              background: 'transparent', color: T.green,
              border: `1.5px solid ${T.green}`, padding: '12px 14px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            }}
            title="Print receipt"
          >
            <Printer size={14} color={T.green} />
          </button>
          <button
            onClick={() => window.open('/', '_blank')}
            style={{
              flex: 1, background: 'transparent', color: T.green,
              border: `1.5px solid ${T.green}`, padding: '12px 8px',
              fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase',
              fontFamily: 'Arial, sans-serif', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Home
          </button>
        </div>
      )}

      {/* ── SIMILAR SERVICES ── */}
      {showActions && booking.service?.category_id && (
        <div style={{ marginTop: '28px' }}>
          <h3 style={{
            textAlign: 'center', fontSize: '9px', letterSpacing: '4px',
            textTransform: 'uppercase', color: T.green, fontFamily: 'Arial, sans-serif',
            marginBottom: '14px', fontWeight: 700,
          }}>
            You may also like
          </h3>
          <SimilarServicesCarousel
            categoryId={booking.service.category_id}
            excludeServiceId={booking.service.id}
            limit={8}
          />
        </div>
      )}

      {/* ── CLOSE BUTTON (modal usage) ── */}
      {onClose && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <button
            onClick={onClose}
            style={{
              background: T.green, color: T.ivory, border: 'none',
              padding: '12px 36px', fontSize: '10px', letterSpacing: '3px',
              textTransform: 'uppercase', fontFamily: 'Arial, sans-serif',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
