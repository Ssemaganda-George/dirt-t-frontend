// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// import { encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts"
// import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
// import QRCode from 'https://esm.sh/qrcode@1.5.3'

// ENV
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const ENABLE_BOOKING_PDF = Deno.env.get('ENABLE_BOOKING_PDF') === 'true'

// ✅ CORS
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

// ERROR HELPER
function jsonError(code: string, message: string, status: number, details?: string) {
  return new Response(
    JSON.stringify({ success: false, code, error: message, details }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
}

async function buildReceiptPdfBase64(
  booking: BookingData,
  touristName: string,
  vendorName: string,
  frontendUrl: string
): Promise<string | null> {
  try {
    const [{ encodeBase64 }, { PDFDocument, StandardFonts }, QRCode] = await Promise.all([
      import("https://deno.land/std@0.168.0/encoding/base64.ts"),
      import('https://esm.sh/pdf-lib@1.17.1'),
      import('https://esm.sh/qrcode@1.5.3'),
    ])

    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
    const page = doc.addPage([600, 400])

    page.drawText('DirtTrails Booking Receipt', { x: 30, y: 360, size: 18, font: fontBold })
    page.drawText(`Booking ID: ${booking.id}`, { x: 30, y: 330, size: 10, font })
    page.drawText(`Guest: ${touristName}`, { x: 30, y: 310, size: 10, font })
    page.drawText(`Vendor: ${vendorName}`, { x: 30, y: 290, size: 10, font })
    page.drawText(`Amount: ${booking.currency} ${booking.total_amount}`, { x: 30, y: 270, size: 10, font })

    try {
      const q = (QRCode as any).default ?? QRCode
      const dataUrl = await q.toDataURL(`${frontendUrl}/bookings/${booking.id}`)
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const qrImage = await doc.embedPng(bytes)
      page.drawImage(qrImage, { x: 450, y: 50, width: 100, height: 100 })
    } catch {
      // QR failures should not break email sending
    }

    const pdfBytes = await doc.save()
    return encodeBase64(pdfBytes)
  } catch (e) {
    console.warn('PDF generation skipped:', e)
    return null
  }
}

// MAIN FUNCTION
serve(async (req) => {

  // ✅ FIXED PREFLIGHT
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY || !FROM_EMAIL || !FRONTEND_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError('CONFIG_ERROR', 'Missing env vars', 500)
    }

    // PARSE BODY
    let body
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const { booking_id } = body

    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'booking_id required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // FETCH BOOKING
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (error || !booking) {
      return jsonError('BOOKING_ERROR', 'Booking not found', 500)
    }

    let touristEmail = booking.guest_email || null
    let touristName = booking.guest_name || 'Guest'

    // For logged-in users, prefer profile data but keep guest-email fallback.
    if (booking.tourist_id && !booking.is_guest_booking) {
      const { data, error: touristError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', booking.tourist_id)
        .maybeSingle()

      if (touristError) {
        console.warn('Tourist profile lookup failed:', touristError.message)
      } else if (data) {
        touristEmail = data.email || touristEmail
        touristName = data.full_name || touristName
      }
    }

    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_email, business_name')
      .eq('id', booking.vendor_id)
      .maybeSingle()

    const vendorEmail = vendor?.business_email
    const vendorName = vendor?.business_name || 'Vendor'

    // Optional lazy PDF path: avoids boot-time failures from heavy imports.
    const pdfBase64 = ENABLE_BOOKING_PDF
      ? await buildReceiptPdfBase64(booking, touristName, vendorName, FRONTEND_URL)
      : null

    // EMAILS
    const sentTo: Record<string, string> = {}
    const emailErrors: string[] = []

    if (touristEmail) {
      try {
        await sendEmail({
          to: touristEmail,
          subject: 'Booking Confirmed',
          html: `<p>Your booking is confirmed</p>`,
          attachments: pdfBase64 ? [{ filename: 'receipt.pdf', content: pdfBase64 }] : [],
        })
        sentTo.tourist = touristEmail
      } catch (e: any) {
        emailErrors.push(`tourist:${touristEmail} -> ${e?.message || String(e)}`)
      }
    }

    if (vendorEmail) {
      try {
        await sendEmail({
          to: vendorEmail,
          subject: 'New Booking',
          html: `<p>You have a new booking</p>`,
        })
        sentTo.vendor = vendorEmail
      } catch (e: any) {
        emailErrors.push(`vendor:${vendorEmail} -> ${e?.message || String(e)}`)
      }
    }

    const hasAnySuccess = Object.keys(sentTo).length > 0
    if (!hasAnySuccess) {
      return jsonError('EMAIL_DELIVERY_FAILED', 'No booking emails were sent', 500, emailErrors.join(' | '))
    }

    return new Response(JSON.stringify({
      success: true,
      sent_to: sentTo,
      errors: emailErrors.length > 0 ? emailErrors : undefined,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })

  } catch (err: any) {
    return jsonError('SERVER_ERROR', 'Something failed', 500, err.message)
  }
})

// EMAIL
async function sendEmail({ to, subject, html, attachments = [] }) {

  const body: any = {
    from: `DirtTrails <${FROM_EMAIL}>`,
    to: [to],
    subject,
    html,
  }

  if (attachments.length) body.attachments = attachments

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }

  return res.json()
}