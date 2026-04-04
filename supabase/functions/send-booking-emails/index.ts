// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ENABLE_BOOKING_PDF = Deno.env.get('ENABLE_BOOKING_PDF') === 'true'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

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
}

function jsonError(code: string, message: string, status: number, details?: string) {
  return new Response(
    JSON.stringify({ success: false, code, error: message, details }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  )
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return 'To be confirmed'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
  } catch { return dateStr }
}

function fmtShortDate(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

// ─── TOURIST CONFIRMATION EMAIL ───────────────────────────────────────────────

function buildTouristEmailHtml(p: {
  booking: BookingData
  touristName: string
  vendorName: string
  serviceName: string
  serviceLocation: string
  frontendUrl: string
}): string {
  const { booking, touristName, vendorName, serviceName, serviceLocation, frontendUrl } = p
  const payColor = booking.payment_status === 'paid' ? '#2D6A4F' : '#C9873A'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Booking Confirmed — DirtTrails</title>
</head>
<body style="margin:0;padding:0;background:#F0EBE1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0EBE1;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;box-shadow:0 8px 48px rgba(27,58,45,.14);">

  <!-- HEADER -->
  <tr><td style="background:#1B3A2D;padding:36px 44px;text-align:center;">
    <p style="margin:0 0 10px;color:#C9873A;font-size:9px;letter-spacing:5px;text-transform:uppercase;font-family:Arial,sans-serif;border-top:1px solid rgba(201,135,58,.4);border-bottom:1px solid rgba(201,135,58,.4);padding:6px 32px;display:inline-block;">EAST AFRICA'S ADVENTURE PLATFORM</p>
    <h1 style="margin:10px 0 4px;color:#FAF6EE;font-size:30px;letter-spacing:10px;font-weight:700;font-family:Georgia,serif;text-transform:uppercase;">DIRT TRAILS</h1>
    <p style="margin:0;color:#8FAF9B;font-size:9px;letter-spacing:5px;text-transform:uppercase;font-family:Arial,sans-serif;">BOOKING RECEIPT</p>
  </td></tr>

  <!-- STATUS BAND -->
  <tr><td style="background:#C9873A;padding:13px 44px;text-align:center;">
    <p style="margin:0;color:#1B3A2D;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">&#10003; &nbsp; YOUR BOOKING IS CONFIRMED</p>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:#fff;padding:40px 44px;">
    <h2 style="margin:0 0 8px;color:#1B3A2D;font-size:21px;font-family:Georgia,serif;font-weight:normal;line-height:1.4;">Your adventure is set, <em>${touristName}</em>.</h2>
    <p style="margin:0 0 36px;color:#6B6560;font-size:14px;line-height:1.8;font-family:Arial,sans-serif;">Thank you for booking with DirtTrails. Your experience has been confirmed — details below.</p>

    <!-- REF BOX -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF6EE;border-left:3px solid #C9873A;margin-bottom:36px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0 0 4px;color:#8FAF9B;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">Booking Reference</p>
        <p style="margin:0;color:#1B3A2D;font-size:16px;font-weight:700;letter-spacing:3px;font-family:'Courier New',Courier,monospace;">${booking.id.toUpperCase()}</p>
      </td>
      <td style="padding:16px 20px;text-align:right;border-left:1px solid #E8E0D0;">
        <p style="margin:0 0 4px;color:#8FAF9B;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">Booked On</p>
        <p style="margin:0;color:#1C1917;font-size:12px;font-weight:600;font-family:Arial,sans-serif;">${fmtShortDate(booking.booking_date)}</p>
      </td>
    </tr>
    </table>

    <!-- SERVICE SECTION -->
    <p style="margin:0 0 12px;color:#8FAF9B;font-size:9px;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #EEE9DF;padding-bottom:8px;font-family:Arial,sans-serif;">Service Details</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding:7px 0;width:36%;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Service</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${serviceName}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Provider</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${vendorName}</td>
      </tr>
      ${serviceLocation ? `<tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Location</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${serviceLocation}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Experience Date</td>
        <td style="padding:7px 0;color:#1B3A2D;font-size:13px;font-weight:700;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${fmtDate(booking.service_date)}</td>
      </tr>
      ${booking.booking_time ? `<tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Time</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${booking.booking_time}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;">Guests</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;">${booking.guests} guest${booking.guests !== 1 ? 's' : ''}</td>
      </tr>
    </table>

    <!-- PAYMENT SECTION -->
    <p style="margin:0 0 12px;color:#8FAF9B;font-size:9px;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #EEE9DF;padding-bottom:8px;font-family:Arial,sans-serif;">Payment Summary</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF6EE;margin-bottom:36px;">
    <tr><td style="padding:20px 22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="color:#6B6560;font-size:13px;font-family:Arial,sans-serif;">Total Amount</td>
          <td style="text-align:right;color:#1B3A2D;font-size:22px;font-weight:700;font-family:'Courier New',Courier,monospace;">${booking.currency} ${booking.total_amount.toLocaleString()}</td>
        </tr>
        <tr><td colspan="2" style="height:1px;background:#D8D0C0;padding:0;"></td></tr>
        <tr>
          <td style="padding-top:10px;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">Payment Status</td>
          <td style="padding-top:10px;text-align:right;font-size:12px;font-weight:700;font-family:Arial,sans-serif;color:${payColor};">${booking.payment_status.toUpperCase()}</td>
        </tr>
      </table>
    </td></tr>
    </table>

    ${booking.special_requests ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFBF4;border:1px solid #E8D5B0;margin-bottom:36px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 6px;color:#8FAF9B;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">Your Special Requests</p>
      <p style="margin:0;color:#1C1917;font-size:13px;line-height:1.7;font-style:italic;font-family:Georgia,serif;">&ldquo;${booking.special_requests}&rdquo;</p>
    </td></tr>
    </table>` : ''}

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
    <tr><td style="text-align:center;">
      <a href="${frontendUrl}/bookings/${booking.id}" style="display:inline-block;background:#1B3A2D;color:#FAF6EE;text-decoration:none;padding:15px 40px;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">View My Booking &rarr;</a>
    </td></tr>
    </table>

    <p style="margin:0;color:#ABA49C;font-size:12px;text-align:center;font-family:Arial,sans-serif;line-height:1.6;">A PDF receipt is attached for your records.<br>Present it at the time of your experience.</p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#1B3A2D;padding:28px 44px;text-align:center;">
    <p style="margin:0 0 8px;color:#C9873A;font-size:9px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;">DIRTTRAILS ADVENTURES</p>
    <p style="margin:0;color:#5D8070;font-size:12px;font-family:Arial,sans-serif;line-height:1.7;">Questions? Contact your service provider or visit our platform.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── VENDOR NOTIFICATION EMAIL ────────────────────────────────────────────────

function buildVendorEmailHtml(p: {
  booking: BookingData
  touristName: string
  touristEmail: string
  touristPhone: string
  serviceName: string
  serviceLocation: string
  frontendUrl: string
}): string {
  const { booking, touristName, touristEmail, touristPhone, serviceName, serviceLocation, frontendUrl } = p

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>New Booking — DirtTrails</title>
</head>
<body style="margin:0;padding:0;background:#F0EBE1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0EBE1;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;box-shadow:0 8px 48px rgba(27,58,45,.14);">

  <tr><td style="background:#1B3A2D;padding:32px 44px;text-align:center;">
    <h1 style="margin:0 0 4px;color:#FAF6EE;font-size:26px;letter-spacing:8px;font-weight:700;font-family:Georgia,serif;text-transform:uppercase;">DIRT TRAILS</h1>
    <p style="margin:0;color:#8FAF9B;font-size:9px;letter-spacing:5px;text-transform:uppercase;font-family:Arial,sans-serif;">VENDOR NOTIFICATION</p>
  </td></tr>

  <tr><td style="background:#2D6A4F;padding:13px 44px;text-align:center;">
    <p style="margin:0;color:#FAF6EE;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">&#9733; &nbsp; NEW BOOKING RECEIVED</p>
  </td></tr>

  <tr><td style="background:#fff;padding:40px 44px;">
    <h2 style="margin:0 0 8px;color:#1B3A2D;font-size:20px;font-family:Georgia,serif;font-weight:normal;line-height:1.4;">New booking for <em>${serviceName}</em>.</h2>
    <p style="margin:0 0 36px;color:#6B6560;font-size:14px;line-height:1.8;font-family:Arial,sans-serif;">A guest has confirmed a booking through DirtTrails. Please prepare accordingly.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF6EE;border-left:3px solid #2D6A4F;margin-bottom:36px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 4px;color:#8FAF9B;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">Booking Reference</p>
      <p style="margin:0;color:#1B3A2D;font-size:16px;font-weight:700;letter-spacing:3px;font-family:'Courier New',Courier,monospace;">${booking.id.toUpperCase()}</p>
    </td></tr>
    </table>

    <p style="margin:0 0 12px;color:#8FAF9B;font-size:9px;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #EEE9DF;padding-bottom:8px;font-family:Arial,sans-serif;">Guest Information</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding:7px 0;width:36%;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Guest Name</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${touristName}</td>
      </tr>
      ${touristEmail ? `<tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Email</td>
        <td style="padding:7px 0;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;"><a href="mailto:${touristEmail}" style="color:#1B3A2D;text-decoration:none;">${touristEmail}</a></td>
      </tr>` : ''}
      ${touristPhone ? `<tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Phone</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${touristPhone}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Party Size</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${booking.guests} guest${booking.guests !== 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;">Experience Date</td>
        <td style="padding:7px 0;color:#1B3A2D;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">${fmtDate(booking.service_date)}</td>
      </tr>
    </table>

    ${booking.special_requests ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFBF4;border:1px solid #E8D5B0;margin-bottom:32px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 6px;color:#8FAF9B;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">Guest's Special Requests</p>
      <p style="margin:0;color:#1C1917;font-size:13px;line-height:1.7;font-style:italic;font-family:Georgia,serif;">&ldquo;${booking.special_requests}&rdquo;</p>
    </td></tr>
    </table>` : ''}

    <p style="margin:0 0 12px;color:#8FAF9B;font-size:9px;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #EEE9DF;padding-bottom:8px;font-family:Arial,sans-serif;">Payment</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0F7F4;border-left:3px solid #2D6A4F;margin-bottom:36px;">
    <tr><td style="padding:16px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="color:#6B6560;font-size:13px;font-family:Arial,sans-serif;">Amount</td>
          <td style="text-align:right;color:#1B3A2D;font-size:20px;font-weight:700;font-family:'Courier New',Courier,monospace;">${booking.currency} ${booking.total_amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding-top:8px;color:#6B6560;font-size:12px;font-family:Arial,sans-serif;">Status</td>
          <td style="padding-top:8px;text-align:right;color:#2D6A4F;font-size:12px;font-weight:700;font-family:Arial,sans-serif;">${booking.payment_status.toUpperCase()}</td>
        </tr>
      </table>
    </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="text-align:center;">
      <a href="${frontendUrl}/vendor/bookings/${booking.id}" style="display:inline-block;background:#1B3A2D;color:#FAF6EE;text-decoration:none;padding:15px 40px;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">Manage Booking &rarr;</a>
    </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#1B3A2D;padding:28px 44px;text-align:center;">
    <p style="margin:0 0 8px;color:#C9873A;font-size:9px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;">DIRTTRAILS ADVENTURES</p>
    <p style="margin:0;color:#5D8070;font-size:12px;font-family:Arial,sans-serif;line-height:1.7;">Log in to your dashboard to manage this booking.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── PDF RECEIPT ──────────────────────────────────────────────────────────────

async function buildReceiptPdfBase64(p: {
  booking: BookingData
  touristName: string
  touristEmail: string
  touristPhone: string
  vendorName: string
  serviceName: string
  serviceLocation: string
  frontendUrl: string
}): Promise<string | null> {
  const { booking, touristName, touristEmail, touristPhone, vendorName, serviceName, serviceLocation, frontendUrl } = p
  try {
    const [{ encodeBase64 }, { PDFDocument, StandardFonts, rgb }, QRCode] = await Promise.all([
      import("https://deno.land/std@0.168.0/encoding/base64.ts"),
      import('https://esm.sh/pdf-lib@1.17.1'),
      import('https://esm.sh/qrcode@1.5.3'),
    ])

    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)
    const page = doc.addPage([595, 842])
    const W = 595, H = 842

    const green   = rgb(0.106, 0.227, 0.176)
    const amber   = rgb(0.788, 0.529, 0.227)
    const ivory   = rgb(0.980, 0.965, 0.933)
    const dark    = rgb(0.110, 0.098, 0.090)
    const sage    = rgb(0.561, 0.686, 0.608)
    const cream   = rgb(0.949, 0.933, 0.898)
    const white   = rgb(1, 1, 1)
    const midGreen= rgb(0.176, 0.416, 0.310)

    // HEADER BAND
    page.drawRectangle({ x: 0, y: H - 68, width: W, height: 68, color: green })
    page.drawLine({ start: { x: 44, y: H - 12 }, end: { x: W - 44, y: H - 12 }, thickness: 0.5, color: amber, opacity: 0.6 })
    page.drawLine({ start: { x: 44, y: H - 56 }, end: { x: W - 44, y: H - 56 }, thickness: 0.5, color: amber, opacity: 0.6 })
    const titleW = bold.widthOfTextAtSize('DIRT TRAILS', 22)
    page.drawText('DIRT TRAILS', { x: (W - titleW) / 2, y: H - 44, size: 22, font: bold, color: ivory })
    const tagW = font.widthOfTextAtSize('ADVENTURE BOOKING RECEIPT', 7.5)
    page.drawText('ADVENTURE BOOKING RECEIPT', { x: (W - tagW) / 2, y: H - 58, size: 7.5, font, color: amber })

    // STATUS BAND
    page.drawRectangle({ x: 0, y: H - 92, width: W, height: 24, color: amber })
    const statusW = bold.widthOfTextAtSize('BOOKING CONFIRMED', 9.5)
    page.drawText('BOOKING CONFIRMED', { x: (W - statusW) / 2, y: H - 86, size: 9.5, font: bold, color: green })

    // REFERENCE BOX
    page.drawRectangle({ x: 40, y: H - 158, width: W - 80, height: 54, color: cream })
    page.drawRectangle({ x: 40, y: H - 158, width: 3, height: 54, color: amber })
    page.drawText('BOOKING REFERENCE', { x: 54, y: H - 110, size: 7, font, color: sage })
    const refText = booking.id.toUpperCase()
    page.drawText(refText.length > 36 ? refText.slice(0, 36) : refText, { x: 54, y: H - 128, size: 8.5, font: bold, color: dark })
    const dateLabel = fmtShortDate(booking.booking_date)
    const dateLW = font.widthOfTextAtSize('DATE BOOKED', 7)
    page.drawText('DATE BOOKED', { x: W - 44 - dateLW, y: H - 110, size: 7, font, color: sage })
    const dateLW2 = bold.widthOfTextAtSize(dateLabel, 8.5)
    page.drawText(dateLabel, { x: W - 44 - dateLW2, y: H - 128, size: 8.5, font: bold, color: dark })

    // Helper: draw a labelled row
    let curY = H - 176
    const row = (label: string, value: string, indent = 40) => {
      page.drawText(label, { x: indent, y: curY, size: 8.5, font, color: sage })
      const maxV = 260
      let v = value
      while (v.length > 4 && font.widthOfTextAtSize(v, 8.5) > maxV) v = v.slice(0, -1)
      if (v !== value) v += '…'
      page.drawText(v, { x: 190, y: curY, size: 8.5, font: bold, color: dark })
      curY -= 16
    }

    const sectionHead = (label: string) => {
      curY -= 6
      page.drawLine({ start: { x: 40, y: curY + 5 }, end: { x: W - 40, y: curY + 5 }, thickness: 0.3, color: cream })
      page.drawText(label, { x: 40, y: curY - 2, size: 7, font, color: sage })
      curY -= 16
    }

    sectionHead('GUEST')
    row('Name', touristName)
    if (touristEmail) row('Email', touristEmail)
    if (touristPhone) row('Phone', touristPhone)

    sectionHead('SERVICE DETAILS')
    row('Service', serviceName)
    row('Provider', vendorName)
    if (serviceLocation) row('Location', serviceLocation)
    row('Experience Date', fmtDate(booking.service_date))
    if (booking.booking_time) row('Time', booking.booking_time)
    row('Guests', `${booking.guests} guest${booking.guests !== 1 ? 's' : ''}`)

    sectionHead('PAYMENT SUMMARY')
    curY -= 4
    page.drawRectangle({ x: 40, y: curY - 58, width: W - 80, height: 72, color: cream })
    page.drawText('TOTAL AMOUNT', { x: 54, y: curY - 4, size: 7.5, font, color: sage })
    const amtStr = `${booking.currency} ${booking.total_amount.toLocaleString()}`
    page.drawText(amtStr, { x: 54, y: curY - 22, size: 18, font: bold, color: green })
    const sW = font.widthOfTextAtSize('STATUS', 7.5)
    const stW = bold.widthOfTextAtSize(booking.payment_status.toUpperCase(), 11)
    page.drawText('STATUS', { x: W - 60 - sW, y: curY - 4, size: 7.5, font, color: sage })
    const stColor = booking.payment_status === 'paid' ? midGreen : amber
    page.drawText(booking.payment_status.toUpperCase(), { x: W - 60 - stW, y: curY - 22, size: 11, font: bold, color: stColor })
    curY -= 72

    // SPECIAL REQUESTS
    if (booking.special_requests) {
      curY -= 12
      page.drawText('SPECIAL REQUESTS', { x: 40, y: curY, size: 7, font, color: sage })
      curY -= 14
      const sr = `"${booking.special_requests.slice(0, 90)}${booking.special_requests.length > 90 ? '…' : ''}"`
      page.drawText(sr, { x: 40, y: curY, size: 8.5, font, color: dark })
    }

    // QR CODE (bottom right)
    try {
      const q = (QRCode as any).default ?? QRCode
      const dataUrl = await q.toDataURL(`${frontendUrl}/bookings/${booking.id}`, { width: 130 })
      const b64 = dataUrl.split(',')[1]
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const qrImg = await doc.embedPng(bytes)
      page.drawRectangle({ x: W - 44 - 104, y: 72, width: 104, height: 104, color: white })
      page.drawImage(qrImg, { x: W - 44 - 100, y: 76, width: 96, height: 96 })
      const scanW = font.widthOfTextAtSize('Scan to view booking', 7)
      page.drawText('Scan to view booking', { x: W - 44 - 100 + (96 - scanW) / 2, y: 64, size: 7, font, color: sage })
    } catch { /* QR optional */ }

    // FOOTER BAND
    page.drawRectangle({ x: 0, y: 0, width: W, height: 52, color: green })
    page.drawLine({ start: { x: 44, y: 46 }, end: { x: W - 44, y: 46 }, thickness: 0.4, color: amber, opacity: 0.5 })
    page.drawLine({ start: { x: 44, y: 10 }, end: { x: W - 44, y: 10 }, thickness: 0.4, color: amber, opacity: 0.5 })
    const ftxt = 'DIRTTRAILS ADVENTURES  ·  Keep this receipt for your records'
    const ftxtW = font.widthOfTextAtSize(ftxt, 8)
    page.drawText(ftxt, { x: (W - ftxtW) / 2, y: 22, size: 8, font, color: ivory })

    const pdfBytes = await doc.save()
    return encodeBase64(pdfBytes)
  } catch (e) {
    console.warn('PDF generation skipped:', e)
    return null
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!RESEND_API_KEY || !FROM_EMAIL || !FRONTEND_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError('CONFIG_ERROR', 'Missing env vars', 500)
    }

    let body
    try { body = await req.json() }
    catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }) }

    const { booking_id } = body
    if (!booking_id) return new Response(JSON.stringify({ error: 'booking_id required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: booking, error } = await supabase.from('bookings').select('*').eq('id', booking_id).single()
    if (error || !booking) return jsonError('BOOKING_ERROR', 'Booking not found', 500)

    // Fetch service name + location
    const { data: svc } = await supabase.from('services').select('title, location').eq('id', booking.service_id).maybeSingle()
    const serviceName = svc?.title || 'Service'
    const serviceLocation = svc?.location || ''

    let touristEmail = booking.guest_email || null
    let touristName  = booking.guest_name  || 'Guest'
    let touristPhone = booking.guest_phone || ''

    if (booking.tourist_id && !booking.is_guest_booking) {
      const { data, error: tErr } = await supabase.from('profiles').select('email, full_name, phone').eq('id', booking.tourist_id).maybeSingle()
      if (tErr) console.warn('Tourist profile lookup failed:', tErr.message)
      else if (data) {
        touristEmail = data.email  || touristEmail
        touristName  = data.full_name || touristName
        touristPhone = data.phone  || touristPhone
      }
    }

    const { data: vendor } = await supabase.from('vendors').select('business_email, business_name').eq('id', booking.vendor_id).maybeSingle()
    const vendorEmail = vendor?.business_email
    const vendorName  = vendor?.business_name || 'Vendor'

    const pdfBase64 = ENABLE_BOOKING_PDF
      ? await buildReceiptPdfBase64({ booking, touristName, touristEmail: touristEmail || '', touristPhone, vendorName, serviceName, serviceLocation, frontendUrl: FRONTEND_URL })
      : null

    const sentTo: Record<string, string> = {}
    const emailErrors: string[] = []

    if (touristEmail) {
      try {
        await sendEmail({
          to: touristEmail,
          subject: `Booking Confirmed — ${serviceName} | DirtTrails`,
          html: buildTouristEmailHtml({ booking, touristName, vendorName, serviceName, serviceLocation, frontendUrl: FRONTEND_URL }),
          attachments: pdfBase64 ? [{ filename: `DirtTrails-Receipt-${booking.id.slice(0, 8).toUpperCase()}.pdf`, content: pdfBase64 }] : [],
        })
        sentTo.tourist = touristEmail
      } catch (e: any) { emailErrors.push(`tourist:${touristEmail} -> ${e?.message || String(e)}`) }
    }

    if (vendorEmail) {
      try {
        await sendEmail({
          to: vendorEmail,
          subject: `New Booking: ${serviceName} — ${booking.guests} guest${booking.guests !== 1 ? 's' : ''} | DirtTrails`,
          html: buildVendorEmailHtml({ booking, touristName, touristEmail: touristEmail || '', touristPhone, serviceName, serviceLocation, frontendUrl: FRONTEND_URL }),
        })
        sentTo.vendor = vendorEmail
      } catch (e: any) { emailErrors.push(`vendor:${vendorEmail} -> ${e?.message || String(e)}`) }
    }

    if (!Object.keys(sentTo).length) return jsonError('EMAIL_DELIVERY_FAILED', 'No emails sent', 500, emailErrors.join(' | '))

    return new Response(JSON.stringify({ success: true, sent_to: sentTo, errors: emailErrors.length ? emailErrors : undefined }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (err: any) {
    return jsonError('SERVER_ERROR', 'Something failed', 500, err.message)
  }
})

// ─── EMAIL SENDER ─────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, attachments = [] }: {
  to: string; subject: string; html: string; attachments?: { filename: string; content: string }[]
}) {
  const from = FROM_EMAIL && FROM_EMAIL.includes('<') ? FROM_EMAIL : `DirtTrails <${FROM_EMAIL}>`
  const body: any = { from, to: [to], subject, html }
  if (attachments.length) body.attachments = attachments

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
