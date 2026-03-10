// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
import QRCode from 'https://esm.sh/qrcode@1.5.3'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface BookingData {
  id: string
  service_id: string
  tourist_id?: string
  vendor_id: string
  booking_date: string
  service_date?: string
  booking_time?: string
  guests: number
  total_amount: number
  currency: string
  status: string
  payment_status: string
  special_requests?: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  is_guest_booking?: boolean
  pickup_location?: string
  dropoff_location?: string
  return_trip?: boolean
  start_time?: string
  end_time?: string
  end_date?: string
}

/** Generate QR code as PNG bytes */
async function qrToPngBytes(url: string, size = 120): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(url, { type: 'image/png', width: size, margin: 1 })
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Build professional PDF booking receipt */
async function buildBookingReceiptPdf(
  booking: BookingData & { services?: any },
  touristName: string,
  vendorName: string,
  frontendUrl: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageW = 595  // A4 width in pts
  const pageH = 420
  const page = doc.addPage([pageW, pageH])

  const black = rgb(0.08, 0.08, 0.08)
  const gray = rgb(0.45, 0.45, 0.45)
  const blue = rgb(0.1, 0.34, 0.86)
  const lightBlue = rgb(0.93, 0.96, 1.0)
  const white = rgb(1, 1, 1)
  const green = rgb(0.06, 0.6, 0.35)
  const divider = rgb(0.85, 0.87, 0.9)

  // Header background
  page.drawRectangle({ x: 0, y: pageH - 72, width: pageW, height: 72, color: blue })
  page.drawText('DirtTrails', { x: 28, y: pageH - 30, font: fontBold, size: 18, color: white })
  page.drawText('BOOKING CONFIRMATION', { x: 28, y: pageH - 50, font: font, size: 10, color: rgb(0.8, 0.88, 1.0) })

  // Status badge
  const isPaid = booking.payment_status === 'paid' || booking.payment_status === 'completed'
  const statusColor = isPaid ? green : rgb(0.85, 0.45, 0.0)
  const statusText = isPaid ? '✓ PAID' : booking.payment_status.toUpperCase()
  page.drawRectangle({ x: pageW - 110, y: pageH - 56, width: 82, height: 24, color: isPaid ? rgb(0.9, 1.0, 0.94) : rgb(1.0, 0.95, 0.88), borderColor: statusColor, borderWidth: 1 })
  page.drawText(statusText, { x: pageW - 100, y: pageH - 48, font: fontBold, size: 10, color: statusColor })

  // Booking ID
  page.drawText(`Booking ID: ${booking.id}`, { x: 28, y: pageH - 90, font: font, size: 9, color: gray })

  // Left column content
  let y = pageH - 110
  const col1X = 28
  const col2X = 310

  // Service name
  const serviceName = booking.services?.title || 'Service'
  const category = booking.services?.service_categories?.name || ''
  page.drawText(serviceName.substring(0, 38), { x: col1X, y, font: fontBold, size: 13, color: black })
  y -= 16
  if (category) {
    page.drawText(category, { x: col1X, y, font: font, size: 9, color: gray })
    y -= 14
  }

  // Divider
  page.drawLine({ start: { x: col1X, y }, end: { x: pageW - 28, y }, thickness: 0.5, color: divider })
  y -= 14

  // Trip details grid
  const addField = (label: string, value: string, x: number, cy: number) => {
    page.drawText(label.toUpperCase(), { x, y: cy, font: font, size: 7, color: gray })
    page.drawText(value.substring(0, 32), { x, y: cy - 11, font: fontBold, size: 10, color: black })
  }

  const serviceDate = booking.service_date
    ? new Date(booking.service_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })

  const endDate = booking.end_date
    ? new Date(booking.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : ''

  addField('Guest Name', touristName, col1X, y)
  addField('Service Provider', vendorName, col2X, y)
  y -= 28

  addField('Date', serviceDate, col1X, y)
  if (endDate) addField('End Date', endDate, col2X, y)
  y -= 28

  const guestsLabel = booking.guests > 1 ? `${booking.guests} guests` : `${booking.guests} guest`
  addField('Guests', guestsLabel, col1X, y)
  if (booking.start_time || booking.booking_time) {
    addField('Time', booking.start_time || booking.booking_time || '', col2X, y)
  }
  y -= 28

  if (booking.pickup_location) {
    addField('Pickup', booking.pickup_location, col1X, y)
    if (booking.dropoff_location) addField('Drop-off', booking.dropoff_location, col2X, y)
    y -= 28
  }

  // Divider
  page.drawLine({ start: { x: col1X, y }, end: { x: pageW - 28, y }, thickness: 0.5, color: divider })
  y -= 16

  // Total amount
  const amountStr = `${booking.currency} ${booking.total_amount.toLocaleString()}`
  page.drawText('Total Amount:', { x: col1X, y, font: font, size: 11, color: gray })
  page.drawText(amountStr, { x: col1X + 110, y, font: fontBold, size: 13, color: blue })
  y -= 20

  if (booking.special_requests) {
    page.drawText('Special Requests:', { x: col1X, y, font: font, size: 8, color: gray })
    y -= 12
    page.drawText(booking.special_requests.substring(0, 70), { x: col1X, y, font: font, size: 9, color: black })
    y -= 16
  }

  // QR code (booking reference)
  try {
    const qrUrl = `${frontendUrl}/bookings/${booking.id}`
    const qrBytes = await qrToPngBytes(qrUrl, 100)
    const qrImage = await doc.embedPng(qrBytes)
    const qrSize = 90
    page.drawImage(qrImage, { x: pageW - 28 - qrSize, y: 40, width: qrSize, height: qrSize })
    page.drawText('Scan to view booking', { x: pageW - 28 - qrSize - 4, y: 32, font: font, size: 7, color: gray })
  } catch (e) {
    console.warn('QR generation failed:', e)
  }

  // Footer
  page.drawRectangle({ x: 0, y: 0, width: pageW, height: 28, color: lightBlue })
  page.drawText('Thank you for choosing DirtTrails! Present this receipt at your booking.', {
    x: 28, y: 10, font: font, size: 8, color: gray,
  })

  return doc.save()
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Validate environment variables
    if (!RESEND_API_KEY || !FROM_EMAIL || !FRONTEND_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables:', {
        RESEND_API_KEY: !!RESEND_API_KEY,
        FROM_EMAIL: !!FROM_EMAIL,
        FRONTEND_URL: !!FRONTEND_URL,
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
      })
      throw new Error('Missing required environment variables')
    }

    const authHeader = req.headers.get('authorization')
    console.log('Request received, auth header present:', !!authHeader)

    let requestBody
    try {
      requestBody = await req.json()
    } catch (e) {
      console.error('Failed to parse request body:', e)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const { booking_id } = requestBody

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services:service_id (
          id,
          title,
          description,
          price,
          currency,
          service_categories (
            name
          )
        )
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      throw new Error(`Failed to fetch booking: ${bookingError?.message}`)
    }

    const bookingData = booking as BookingData & {
      services?: {
        id: string
        title: string
        description?: string
        price: number
        currency: string
        service_categories?: { name: string }
      }
    }

    // Fetch tourist profile (if not guest booking)
    let touristEmail = bookingData.guest_email
    let touristName = bookingData.guest_name || 'Guest'

    if (bookingData.tourist_id && !bookingData.is_guest_booking) {
      const { data: touristProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', bookingData.tourist_id)
        .single()

      if (touristProfile) {
        touristEmail = touristProfile.email
        touristName = touristProfile.full_name || touristName
      }
    }

    // Fetch vendor business details
    const { data: vendorBusiness, error: vendorBusinessError } = await supabase
      .from('vendors')
      .select('business_name, business_email, user_id')
      .eq('id', bookingData.vendor_id)
      .single()

    if (vendorBusinessError || !vendorBusiness) {
      throw new Error(`Failed to fetch vendor business: ${vendorBusinessError?.message}`)
    }

    // Fetch vendor profile using user_id
    let vendorProfile: { email: string; full_name: string } | null = null
    if (vendorBusiness.user_id) {
      const { data: profile, error: vendorError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', vendorBusiness.user_id)
        .single()

      if (!vendorError) {
        vendorProfile = profile
      }
    }

    const vendorEmail = vendorBusiness.business_email || vendorProfile?.email || 'vendor@example.com'
    const vendorName = vendorBusiness.business_name || vendorProfile?.full_name || 'Vendor'

    // Fetch all admin emails
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'admin')

    const adminEmails = adminProfiles?.map(admin => admin.email) || []

    // Format booking details
    const serviceName = bookingData.services?.title || 'Service'
    const serviceCategory = bookingData.services?.service_categories?.name || 'General'
    const bookingDate = new Date(bookingData.booking_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const serviceDate = bookingData.service_date
      ? new Date(bookingData.service_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : bookingDate
    const amount = `${bookingData.currency} ${bookingData.total_amount.toLocaleString()}`

    // Generate PDF receipt
    let pdfBase64: string | null = null
    try {
      const pdfBytes = await buildBookingReceiptPdf(bookingData, touristName, vendorName, FRONTEND_URL)
      pdfBase64 = encodeBase64(pdfBytes)
      console.log('✅ PDF receipt generated successfully')
    } catch (pdfErr) {
      console.error('Failed to generate PDF receipt:', pdfErr)
      // Continue without PDF
    }

    // Build booking details HTML block (used in all emails)
    const bookingDetailsHtml = `
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f3f4f6;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;width:40%;">Booking ID</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;font-family:monospace;">${bookingData.id}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Service</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${serviceName} <span style="color:#6b7280;">(${serviceCategory})</span></td>
        </tr>
        <tr style="background:#f3f4f6;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Booking Date</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${bookingDate}</td>
        </tr>
        ${bookingData.service_date ? `
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Service Date</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${serviceDate}</td>
        </tr>` : ''}
        ${bookingData.end_date ? `
        <tr style="background:#f3f4f6;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">End Date</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${new Date(bookingData.end_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>` : ''}
        ${bookingData.booking_time || bookingData.start_time ? `
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Time</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${bookingData.start_time || bookingData.booking_time}${bookingData.end_time ? ` – ${bookingData.end_time}` : ''}</td>
        </tr>` : ''}
        <tr style="background:#f3f4f6;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Guests</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${bookingData.guests}</td>
        </tr>
        ${bookingData.pickup_location ? `
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Pickup</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${bookingData.pickup_location}</td>
        </tr>` : ''}
        ${bookingData.dropoff_location ? `
        <tr style="background:#f3f4f6;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Drop-off</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${bookingData.dropoff_location}</td>
        </tr>` : ''}
        ${bookingData.return_trip ? `
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Return Trip</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">Yes</td>
        </tr>` : ''}
        <tr style="background:#eff6ff;">
          <td style="padding:10px 12px;font-weight:700;color:#1d4ed8;font-size:14px;">Total Amount</td>
          <td style="padding:10px 12px;font-weight:700;color:#1d4ed8;font-size:14px;">${amount}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Payment Status</td>
          <td style="padding:8px 12px;font-size:13px;">
            <span style="background:${bookingData.payment_status === 'paid' ? '#dcfce7' : '#fef3c7'};color:${bookingData.payment_status === 'paid' ? '#166534' : '#92400e'};padding:2px 10px;border-radius:20px;font-weight:600;font-size:12px;">
              ${bookingData.payment_status.toUpperCase()}
            </span>
          </td>
        </tr>
        ${bookingData.special_requests ? `
        <tr style="background:#f3f4f6;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Special Requests</td>
          <td style="padding:8px 12px;color:#111827;font-size:13px;">${bookingData.special_requests}</td>
        </tr>` : ''}
      </table>
    `

    // Tourist email
    if (touristEmail) {
      console.log(`Sending booking confirmation email to tourist: ${touristEmail}`)
      const touristEmailBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9fafb;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1a56db,#1e40af);padding:32px 28px;">
              <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">DirtTrails</div>
              <div style="font-size:13px;color:#bfdbfe;margin-top:4px;">Explore Uganda's Adventure</div>
            </div>
            <!-- Hero Section -->
            <div style="background:#eff6ff;padding:24px 28px;border-bottom:1px solid #dbeafe;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:#22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;">✓</div>
                <div>
                  <div style="font-size:18px;font-weight:700;color:#1e3a5f;">Booking Confirmed!</div>
                  <div style="font-size:13px;color:#3b82f6;margin-top:2px;">Your adventure is booked</div>
                </div>
              </div>
            </div>
            <!-- Content -->
            <div style="padding:24px 28px;">
              <p style="color:#374151;font-size:15px;margin:0 0 8px;">Dear <strong>${touristName}</strong>,</p>
              <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Your booking for <strong>${serviceName}</strong> has been confirmed. Your PDF receipt is attached to this email — please keep it for your records.</p>
              ${bookingDetailsHtml}
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
                <div style="font-size:13px;font-weight:600;color:#15803d;margin-bottom:6px;">What's next?</div>
                <ul style="margin:0;padding-left:18px;color:#374151;font-size:13px;line-height:1.8;">
                  <li>Your PDF booking receipt is attached to this email</li>
                  <li>Present this receipt or your booking ID on the day</li>
                  <li>Contact the vendor if you have any questions</li>
                </ul>
              </div>
              <a href="${FRONTEND_URL}/bookings" style="display:inline-block;background:#1a56db;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px;">View My Bookings →</a>
            </div>
            <div style="padding:16px 28px;background:#f9fafb;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">
              This is an automated email from DirtTrails. Do not reply. &nbsp;|&nbsp; <a href="${FRONTEND_URL}" style="color:#6b7280;">Visit DirtTrails</a>
            </div>
          </div>
        </body>
        </html>
      `

      const attachments = pdfBase64
        ? [{ filename: `booking-receipt-${booking_id.slice(0, 8)}.pdf`, content: pdfBase64 }]
        : []

      await sendEmail({
        to: touristEmail,
        subject: `Booking Confirmed — ${serviceName} | DirtTrails`,
        html: touristEmailBody,
        attachments,
      })
      console.log(`✅ Tourist email sent to ${touristEmail}`)
    } else {
      console.warn('No tourist email found, skipping tourist email')
    }

    // Vendor email
    console.log(`Sending booking notification email to vendor: ${vendorEmail}`)
    const vendorEmailBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9fafb;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px;">
            <div style="font-size:20px;font-weight:800;color:#ffffff;">New Booking Received</div>
            <div style="font-size:13px;color:#bfdbfe;margin-top:4px;">DirtTrails Vendor Portal</div>
          </div>
          <div style="padding:24px 28px;">
            <p style="color:#374151;font-size:15px;margin:0 0 8px;">Dear <strong>${vendorName}</strong>,</p>
            <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">A new booking has been placed for your service.</p>
            ${bookingDetailsHtml}
            <p style="color:#374151;font-size:14px;font-weight:600;margin:20px 0 8px;">Customer Details</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr style="background:#f3f4f6;">
                <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;width:40%;">Name</td>
                <td style="padding:8px 12px;color:#111827;font-size:13px;">${touristName}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Email</td>
                <td style="padding:8px 12px;color:#111827;font-size:13px;">${touristEmail || 'N/A'}</td>
              </tr>
              ${bookingData.guest_phone ? `
              <tr style="background:#f3f4f6;">
                <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Phone</td>
                <td style="padding:8px 12px;color:#111827;font-size:13px;">${bookingData.guest_phone}</td>
              </tr>` : ''}
            </table>
            <a href="${FRONTEND_URL}/vendor/bookings" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:20px;">Manage Bookings →</a>
          </div>
          <div style="padding:16px 28px;background:#f9fafb;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">
            Automated notification from DirtTrails. Do not reply.
          </div>
        </div>
      </body>
      </html>
    `

    await sendEmail({
      to: vendorEmail,
      subject: `New Booking — ${serviceName} | DirtTrails`,
      html: vendorEmailBody,
    })
    console.log(`✅ Vendor email sent to ${vendorEmail}`)

    // Admin emails
    console.log(`Sending booking notification emails to ${adminEmails.length} admin(s)`)
    for (const adminEmail of adminEmails) {
      const adminEmailBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9fafb;">
          <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:28px;">
              <div style="font-size:20px;font-weight:800;color:#ffffff;">New Booking Alert</div>
              <div style="font-size:13px;color:#fde68a;margin-top:4px;">DirtTrails Admin Panel</div>
            </div>
            <div style="padding:24px 28px;">
              <p style="color:#374151;font-size:14px;margin:0 0 20px;">A new booking has been created on the platform.</p>
              ${bookingDetailsHtml}
              <p style="color:#374151;font-size:14px;font-weight:600;margin:20px 0 8px;">Customer &amp; Vendor</p>
              <table style="width:100%;border-collapse:collapse;">
                <tr style="background:#f3f4f6;">
                  <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;width:40%;">Customer</td>
                  <td style="padding:8px 12px;color:#111827;font-size:13px;">${touristName} &lt;${touristEmail || 'N/A'}&gt;</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-weight:600;color:#374151;font-size:13px;">Vendor</td>
                  <td style="padding:8px 12px;color:#111827;font-size:13px;">${vendorName} &lt;${vendorEmail}&gt;</td>
                </tr>
              </table>
              <a href="${FRONTEND_URL}/admin/bookings" style="display:inline-block;background:#d97706;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:20px;">View in Admin Panel →</a>
            </div>
            <div style="padding:16px 28px;background:#f9fafb;text-align:center;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;">
              Automated notification from DirtTrails. Do not reply.
            </div>
          </div>
        </body>
        </html>
      `

      await sendEmail({
        to: adminEmail,
        subject: `New Booking Alert — ${serviceName} | DirtTrails`,
        html: adminEmailBody,
      })
      console.log(`✅ Admin email sent to ${adminEmail}`)
    }

    console.log('✅ All booking emails sent successfully')
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Emails sent successfully',
        pdf_attached: !!pdfBase64,
        sent_to: {
          tourist: touristEmail,
          vendor: vendorEmail,
          admins: adminEmails
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )

  } catch (error: any) {
    console.error('❌ Error sending booking emails:', error)
    return new Response(
      JSON.stringify({
        error: error?.message || 'Failed to send booking emails',
        details: error?.toString() || String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})

async function sendEmail({
  to,
  subject,
  html,
  attachments = [],
}: {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: string }[]
}) {
  const fromEmail = FROM_EMAIL.includes('<') ? FROM_EMAIL : `DirtTrails <${FROM_EMAIL}>`

  const body: any = { from: fromEmail, to: [to], subject, html }
  if (attachments.length > 0) body.attachments = attachments

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Resend API error for ${to}:`, errorText)
    throw new Error(`Resend API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log(`Email sent successfully to ${to}:`, result.id)
  return result
}
