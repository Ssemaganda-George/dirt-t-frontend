import { useState } from 'react'
import { CheckCircle, CreditCard } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { formatCurrencyWithConversion } from '../lib/utils'
import { customerTotalFromAggregatePricingCalc, type PaymentCalculation } from '../lib/pricingService'
import { calculateDays, calculateHours } from '../lib/transportUtils'
import SimilarServicesCarousel from './SimilarServicesCarousel'

interface ReceiptService {
  id: string
  title: string
  location: string
  currency: string
  category_id?: string
  service_categories: { name: string }
  vendors?: {
    business_name: string
    business_email: string
    business_phone: string
  } | null
}

interface ReceiptBookingData {
  contactName: string
  contactEmail: string
  contactPhone: string
  countryCode: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  pickupLocation: string
  dropoffLocation: string
  driverOption: string
  paymentMethod: string
  mobileProvider: string
  passengers: number
  specialRequests: string
}

interface TransportBookingReceiptProps {
  service: ReceiptService
  bookingData: ReceiptBookingData
  bookingResult: any
  totalPrice: number
  pricingCalc: PaymentCalculation | null
  transportCustomerPaysTotal: number
  onMessageProvider: () => void
  messageProviderLabel: string
  onNavigateHome: () => void
}

// NOTE: Keep this receipt manually in sync with
// supabase/functions/send-booking-emails/index.ts (tourist receipt design).
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

const SH = ({ children }: { children: React.ReactNode }) => (
  <div style={{ marginBottom: '12px', marginTop: '4px' }}>
    <div style={{ height: '1px', background: '#EEE9DF', marginBottom: '8px' }} />
    <p style={{ margin: 0, fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase' as const, color: T.sage, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>{children}</p>
  </div>
)

const RR = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7px' }}>
    <span style={{ color: T.sage, fontSize: '12px', flexShrink: 0, width: '38%', fontFamily: 'Arial, sans-serif' }}>{label}</span>
    <span style={{ color: T.dark, fontSize: '13px', fontWeight: 600, textAlign: 'right' as const, wordBreak: 'break-word' as const, maxWidth: '58%', fontFamily: 'Arial, sans-serif' }}>{value}</span>
  </div>
)

export default function TransportBookingReceipt({
  service,
  bookingData,
  bookingResult,
  totalPrice,
  pricingCalc,
  transportCustomerPaysTotal,
  onMessageProvider,
  messageProviderLabel,
  onNavigateHome,
}: TransportBookingReceiptProps) {
  const [referenceCopied, setReferenceCopied] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const downloadReceiptPDF = (result: any) => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const left = 40
      let y = 48

      const vendorName = service.vendors?.business_name || 'DIRT TRAILS'
      const receiptShort = (result.id || '').toString().replace(/-/g, '').slice(0, 8).toUpperCase()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text(vendorName, left, y)
      y += 20
      doc.setFontSize(13)
      doc.setFont('helvetica', 'normal')
      doc.text('Adventure Booking Receipt', left, y)
      y += 20

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`Receipt #: ${receiptShort}`, left, y)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date().toLocaleDateString(), pageWidth - left, y, { align: 'right' })
      y += 18

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('BOOKING CONFIRMED', left, y)
      y += 18

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('CUSTOMER INFORMATION', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.text(`Name: ${bookingData.contactName || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Email: ${bookingData.contactEmail || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Phone: ${bookingData.countryCode || ''}${bookingData.contactPhone || ''}`, left + 8, y)
      y += 18

      doc.setFont('helvetica', 'bold')
      doc.text('SERVICE DETAILS', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.text(`Activity: ${service.title}`, left + 8, y)
      y += 12
      doc.text(`Location: ${service.location || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Category: ${service.service_categories?.name || 'N/A'}`, left + 8, y)
      y += 12
      const dateText = bookingData.startDate ? new Date(bookingData.startDate).toLocaleDateString() : 'N/A'
      doc.text(`Date: ${dateText}`, left + 8, y)
      y += 12
      const durationHours = Math.max(0, Math.floor(calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)))
      doc.text(`Duration: ${durationHours} hours`, left + 8, y)
      y += 12
      doc.text(`Participants: ${bookingData.passengers || 1}`, left + 8, y)
      y += 18

      doc.setFont('helvetica', 'bold')
      doc.text('SERVICE PROVIDER', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.text(`Provider: ${service.vendors?.business_name || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Contact: ${service.vendors?.business_phone || 'N/A'}`, left + 8, y)
      y += 18

      doc.setFont('helvetica', 'bold')
      doc.text('TRIP DETAILS', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      const pickupTxt = `${bookingData.startDate || 'N/A'}${bookingData.startTime ? ' at ' + bookingData.startTime : ''}`
      const dropTxt = `${bookingData.endDate || 'N/A'}${bookingData.endTime ? ' at ' + bookingData.endTime : ''}`
      doc.text(`Pick-up: ${pickupTxt}`, left + 8, y)
      y += 12
      doc.text(`Drop-off: ${dropTxt}`, left + 8, y)
      y += 12
      const durDaysPDF = bookingData.startDate && bookingData.endDate ? calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime) : null
      const durHrsPDF = bookingData.startDate && bookingData.endDate ? Math.max(0, Math.floor(calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime))) : null
      doc.text(`Duration: ${durDaysPDF !== null ? `${durDaysPDF} days` : 'N/A'} ${durHrsPDF !== null ? `(${durHrsPDF} hrs)` : ''}`, left + 8, y)
      y += 12
      doc.text(`Pick-up Location: ${bookingData.pickupLocation || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Drop-off Location: ${bookingData.dropoffLocation || 'N/A'}`, left + 8, y)
      y += 12
      doc.text(`Driver Option: ${bookingData.driverOption === 'with-driver' ? 'With Driver' : 'Without Driver'}`, left + 8, y)
      y += 12
      doc.text(`Special Requests: ${bookingData.specialRequests || 'None'}`, left + 8, y)
      y += 16

      doc.setFont('helvetica', 'bold')
      doc.text('PAYMENT SUMMARY', left, y)
      y += 14
      doc.setFont('helvetica', 'normal')
      doc.text(`Unit Price: ${formatCurrencyWithConversion(totalPrice, service.currency)}`, left + 8, y)
      y += 12
      doc.text(`Quantity: ${bookingData.passengers || 1}`, left + 8, y)
      y += 12
      doc.setFont('helvetica', 'bold')
      doc.text(
        `TOTAL: ${formatCurrencyWithConversion(customerTotalFromAggregatePricingCalc(pricingCalc, totalPrice), service.currency)}`,
        left + 8,
        y,
      )
      y += 20

      doc.setFont('helvetica', 'normal')
      doc.text('Thank you for choosing Dirt Trails!', left, y)
      y += 18
      doc.setFontSize(10)
      doc.text(`Booking Reference: ${result.id || ''}`, left, y)

      doc.save(`receipt-${result.id || 'booking'}.pdf`)
    } catch (e) {
      console.error('Failed to generate PDF receipt:', e)
      setDownloadError('Failed to download PDF receipt. Please try again.')
    }
  }

  const payColor = (bookingResult?.payment_status || 'pending') === 'paid' ? T.paid : T.pending
  const fullPhone = (bookingData.countryCode || '') + (bookingData.contactPhone || '')
  const durDays = bookingData.startDate && bookingData.endDate
    ? calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
    : null
  const durHrs = durDays !== null
    ? Math.max(0, Math.floor(calculateHours(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)))
    : null
  const durationStr = durDays !== null ? `${durDays} day${durDays !== 1 ? 's' : ''} (${durHrs} hrs)` : 'N/A'

  return (
    <>
      <div style={{ maxWidth: '560px', margin: '0 auto', fontFamily: 'Arial, Helvetica, sans-serif', padding: '24px 16px' }}>

        {/* ── TOP SCALLOPED EDGE ── */}
        <div style={{
          height: '14px',
          background: T.ivory,
          backgroundImage: `radial-gradient(circle at 10px 14px, #E8E0D0 10px, transparent 11px)`,
          backgroundSize: '20px 14px',
          backgroundRepeat: 'repeat-x',
          borderLeft: '1px solid #D4C9B8',
          borderRight: '1px solid #D4C9B8',
        }} />

        {/* ── RECEIPT BODY ── */}
        <div style={{
          background: T.ivory,
          border: '1px solid #D4C9B8',
          borderTop: 'none',
          borderBottom: 'none',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 48px rgba(27,58,45,.14)',
        }}>

          {/* Faint CONFIRMED watermark */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: '64px', fontWeight: 900, letterSpacing: '4px', color: T.green, opacity: 0.03, transform: 'rotate(-22deg)', whiteSpace: 'nowrap', userSelect: 'none' as const, fontFamily: 'Georgia, serif', textTransform: 'uppercase' as const }}>
              CONFIRMED
            </span>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* ── HEADER ── */}
            <div style={{ background: T.green, padding: '32px 44px', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', borderTop: `1px solid rgba(201,135,58,0.55)`, borderBottom: `1px solid rgba(201,135,58,0.55)`, padding: '7px 28px' }}>
                <h1 style={{ margin: '0 0 4px', color: T.ivory, fontSize: '26px', letterSpacing: '8px', fontFamily: 'Georgia, serif', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1.1 }}>
                  DIRT TRAILS
                </h1>
                <p style={{ margin: 0, color: T.amber, fontSize: '9px', letterSpacing: '5px', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
                  ADVENTURE BOOKING RECEIPT
                </p>
              </div>
            </div>

            {/* ── STATUS STRIPE ── */}
            <div style={{ background: T.amber, padding: '13px 44px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                <CheckCircle size={11} color={T.green} />
                <span style={{ color: T.green, fontSize: '11px', letterSpacing: '4px', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
                  BOOKING CONFIRMED
                </span>
              </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={{ padding: '32px 44px' }}>

              {/* Reference box */}
              <div style={{ background: T.cream, borderLeft: `3px solid ${T.amber}`, padding: '16px 20px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase' as const, color: T.sage, fontFamily: 'Arial, sans-serif' }}>BOOKING REFERENCE</p>
                  <p style={{ margin: 0, fontFamily: '"Courier New", Courier, monospace', fontSize: '13px', fontWeight: 700, letterSpacing: '2px', color: T.green, wordBreak: 'break-all' as const }}>
                    {(bookingResult?.id || '').toUpperCase() || 'N/A'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '12px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase' as const, color: T.sage, fontFamily: 'Arial, sans-serif' }}>DATE BOOKED</p>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: T.dark, fontFamily: 'Arial, sans-serif' }}>
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <SH>Guest</SH>
              <RR label="Name"  value={bookingData.contactName  || 'N/A'} />
              <RR label="Email" value={bookingData.contactEmail || '—'} />
              <RR label="Phone" value={fullPhone || '—'} />

              <SH>Service Details</SH>
              <RR label="Service"  value={service.title} />
              <RR label="Provider" value={service.vendors?.business_name || 'N/A'} />
              <RR label="Location" value={service.location || 'N/A'} />
              <RR label="Experience Date" value={bookingData.startDate || 'N/A'} />
              <RR label="Guests"   value={`${bookingData.passengers || 1} guest${(bookingData.passengers || 1) !== 1 ? 's' : ''}`} />

              <SH>Service Provider</SH>
              <RR label="Business" value={service.vendors?.business_name  || 'N/A'} />
              <RR label="Email"    value={service.vendors?.business_email || 'N/A'} />
              {service.vendors?.business_phone && <RR label="Phone" value={service.vendors.business_phone} />}

              <SH>Trip Details</SH>
              <RR label="Pick-up"  value={`${bookingData.startDate || 'N/A'}${bookingData.startTime ? ` at ${bookingData.startTime}` : ''}`} />
              <RR label="Drop-off" value={`${bookingData.endDate   || 'N/A'}${bookingData.endTime   ? ` at ${bookingData.endTime}`   : ''}`} />
              <RR label="Duration" value={durationStr} />
              {bookingData.pickupLocation  && <RR label="Pick-up Loc"  value={bookingData.pickupLocation} />}
              {bookingData.dropoffLocation && <RR label="Drop-off Loc" value={bookingData.dropoffLocation} />}
              <RR label="Driver" value={bookingData.driverOption === 'with-driver' ? 'With Driver' : 'Without Driver'} />
              {bookingData.paymentMethod === 'mobile' && bookingData.mobileProvider && (
                <RR label="Payment Provider" value={bookingData.mobileProvider} />
              )}

              <SH>Payment Summary</SH>
              <RR label="Subtotal (trip)" value={formatCurrencyWithConversion(totalPrice, service.currency)} />
              {pricingCalc && typeof pricingCalc.platform_fee === 'number' && pricingCalc.platform_fee > 0 && (
                <RR
                  label="Platform fee (tier)"
                  value={formatCurrencyWithConversion(pricingCalc.platform_fee, service.currency)}
                />
              )}
              <RR label="Quantity" value={String(bookingData.passengers || 1)} />

              <div style={{ background: '#F0F7F4', borderLeft: '3px solid #2D6A4F', padding: '16px 20px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase' as const, color: '#6B6560', fontFamily: 'Arial, sans-serif' }}>TOTAL AMOUNT</p>
                  <p style={{ margin: 0, fontFamily: '"Courier New", Courier, monospace', fontSize: '20px', fontWeight: 700, color: T.green }}>
                    {formatCurrencyWithConversion(transportCustomerPaysTotal, service.currency)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase' as const, color: '#6B6560', fontFamily: 'Arial, sans-serif' }}>STATUS</p>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: payColor, fontFamily: 'Arial, sans-serif' }}>
                    {(bookingResult?.payment_status || 'pending').toUpperCase()}
                  </p>
                </div>
              </div>

              {bookingData.specialRequests && (
                <div style={{ marginTop: '12px' }}>
                  <SH>Special Requests</SH>
                  <p style={{ margin: 0, color: T.dark, fontSize: '13px', fontStyle: 'italic', fontFamily: 'Georgia, serif', lineHeight: 1.6 }}>
                    "{bookingData.specialRequests}"
                  </p>
                </div>
              )}

            </div>

            {/* ── GREEN FOOTER BAND ── */}
            <div style={{ background: T.green, padding: '28px 44px', textAlign: 'center' }}>
              <div style={{ borderTop: `1px solid rgba(201,135,58,0.4)`, paddingTop: '10px', paddingBottom: '10px' }}>
                <div style={{ borderBottom: `1px solid rgba(201,135,58,0.4)`, paddingBottom: '10px' }}>
                  <p style={{ margin: '0 0 8px', color: T.amber, fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' as const, fontFamily: 'Arial, sans-serif' }}>
                    DIRTTRAILS ADVENTURES
                  </p>
                  <p style={{ margin: 0, color: '#5D8070', fontSize: '12px', fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
                    Questions? Contact your service provider or visit our platform.
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
          backgroundImage: `radial-gradient(circle at 10px 0px, #E8E0D0 10px, transparent 11px)`,
          backgroundSize: '20px 14px',
          backgroundRepeat: 'repeat-x',
          borderLeft: '1px solid #D4C9B8',
          borderRight: '1px solid #D4C9B8',
          borderBottom: '1px solid #D4C9B8',
        }} />

        {/* ── ACTION BUTTONS ── */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            onClick={onMessageProvider}
            style={{ flex: 1, background: T.green, color: T.ivory, border: 'none', padding: '12px 8px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'Arial, sans-serif', fontWeight: 700, cursor: 'pointer' }}
          >
            {messageProviderLabel}
          </button>
          <button
            onClick={() => downloadReceiptPDF(bookingResult || {})}
            style={{ background: 'transparent', color: T.green, border: `1.5px solid ${T.green}`, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Download receipt PDF"
          >
            <CreditCard size={14} color={T.green} />
          </button>
          <button
            onClick={onNavigateHome}
            style={{ flex: 1, background: 'transparent', color: T.green, border: `1.5px solid ${T.green}`, padding: '12px 8px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase' as const, fontFamily: 'Arial, sans-serif', fontWeight: 700, cursor: 'pointer' }}
          >
            Home
          </button>
        </div>
        {downloadError && <p className="text-sm text-red-600 mt-2 text-center">{downloadError}</p>}

        {/* ── QUICK ACTIONS (reference + PDF + message) ── */}
        {bookingResult?.id && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm flex items-center gap-3">
              <span className="font-semibold">Reference:</span>
              <span className="break-all">{bookingResult.id}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(bookingResult.id)
                    setReferenceCopied(true)
                    setTimeout(() => setReferenceCopied(false), 2000)
                  } catch { /* ignore */ }
                }}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm"
              >
                {referenceCopied ? 'Copied!' : 'Copy reference'}
              </button>
            </div>
          </div>
        )}

        {/* ── SIMILAR SERVICES ── */}
        {service.category_id && (
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ textAlign: 'center', fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' as const, color: T.green, fontFamily: 'Arial, sans-serif', marginBottom: '14px', fontWeight: 700 }}>
              You may also like
            </h3>
            <SimilarServicesCarousel
              categoryId={service.category_id}
              excludeServiceId={service.id}
              limit={8}
            />
          </div>
        )}

      </div>
    </>
  )
}
