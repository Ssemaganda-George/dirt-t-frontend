// This file is a Supabase Edge Function that runs on Deno. The project's TypeScript
// language server (configured for the React app) may not understand Deno imports.
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

/** Fetch tickets for order; retry once after delay if webhook may not have run yet */
async function fetchTicketsForOrder(supabase: any, orderId: string): Promise<any[]> {
  const select = `
    *,
    ticket_types(id, title, price),
    services(id, slug, title, event_location, location, event_datetime, vendors(business_name)),
    orders(currency, guest_name, guest_email, user_id)
  `
  let { data: tickets, error } = await supabase
    .from('tickets')
    .select(select)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) {
    console.warn('send-order-emails: fetch tickets error', error.message)
    return []
  }
  if (tickets && tickets.length > 0) return tickets

  // Tickets may be created by webhook shortly after payment; wait and retry once
  await new Promise(r => setTimeout(r, 2500))
  const retry = await supabase
    .from('tickets')
    .select(select)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (retry.error) return []
  return retry.data || []
}

/** Generate QR code as PNG bytes for PDF embedding */
async function qrToPngBytes(url: string, size = 160): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(url, { type: 'image/png', width: size, margin: 1 })
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Build a single PDF containing one page per ticket */
async function buildTicketsPdf(
  tickets: any[],
  frontendUrl: string
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const black = rgb(0.1, 0.1, 0.1)
  const gray = rgb(0.4, 0.4, 0.4)

  for (const t of tickets) {
    const page = doc.addPage([400, 260])
    const service = t.services || {}
    const vendor = service.vendors || {}
    const ticketType = t.ticket_types || {}
    const order = t.orders || {}
    const code = t.code || t.qr_data || t.id
    const slug = service.slug
    const qrUrl = slug
      ? `${frontendUrl}/service/${slug}?ticket=${code}`
      : code

    let y = page.getHeight() - 28
    page.drawText('Your Ticket', { x: 24, y, font: fontBold, size: 14, color: black })
    y -= 18

    page.drawText(service.title || 'Event', { x: 24, y, font: fontBold, size: 12, color: black })
    y -= 14
    page.drawText(ticketType.title || 'Ticket', { x: 24, y, font: font, size: 10, color: gray })
    y -= 12

    const eventDate = service.event_datetime
    if (eventDate) {
      const d = new Date(eventDate)
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      page.drawText(`Date: ${dateStr}`, { x: 24, y, font: font, size: 9, color: black })
      y -= 11
    }
    const loc = service.event_location || service.location || 'Venue TBA'
    page.drawText(`At: ${loc.substring(0, 45)}${loc.length > 45 ? '…' : ''}`, { x: 24, y, font: font, size: 9, color: black })
    y -= 11
    page.drawText(`Organised by: ${(vendor.business_name || 'DirtTrails').substring(0, 35)}`, { x: 24, y, font: font, size: 9, color: gray })
    y -= 14

    const ownerName = order.guest_name || 'Guest'
    const ownerEmail = order.guest_email || ''
    page.drawText(`Owner: ${ownerName.substring(0, 30)}`, { x: 24, y, font: font, size: 9, color: black })
    y -= 11
    if (ownerEmail) {
      page.drawText(`Email: ${ownerEmail.substring(0, 38)}`, { x: 24, y, font: font, size: 8, color: gray })
      y -= 11
    }
    const priceStr = `${order.currency || 'UGX'} ${(ticketType.price ?? 0).toLocaleString()}`
    page.drawText(`Price: ${priceStr}`, { x: 24, y, font: font, size: 9, color: black })
    y -= 11
    page.drawText(`Code: ${code}`, { x: 24, y, font: font, size: 9, color: black })
    y -= 14

    try {
      const qrBytes = await qrToPngBytes(qrUrl, 120)
      const qrImage = await doc.embedPng(qrBytes)
      page.drawImage(qrImage, { x: page.getWidth() - 24 - 100, y: 30, width: 100, height: 100 })
    } catch (qrErr) {
      console.warn('QR embed failed for ticket', t.id, qrErr)
    }
    page.drawText('Scan for entry', {
      x: page.getWidth() - 24 - 70,
      y: 22,
      font: font,
      size: 8,
      color: gray,
    })
  }

  return doc.save()
}

serve(async (req) => {
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
    if (!RESEND_API_KEY || !FROM_EMAIL || !FRONTEND_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables for send-order-emails')
      throw new Error('Missing required environment variables')
    }

    let body
    try {
      body = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }

    const { order_id, recipient_email } = body
    if (!order_id || !recipient_email) {
      return new Response(JSON.stringify({ error: 'order_id and recipient_email are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: orderRes, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .maybeSingle()

    if (orderErr || !orderRes) {
      throw new Error(`Failed to fetch order: ${orderErr?.message || 'not found'}`)
    }

    const { data: itemsRes, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order_id)

    if (itemsErr) {
      throw new Error(`Failed to fetch order items: ${itemsErr.message}`)
    }

    const items = itemsRes || []
    const ticketTypeIds = items.map((it: any) => it.ticket_type_id).filter(Boolean)
    let ticketTypes: any[] = []
    if (ticketTypeIds.length > 0) {
      const { data: tts } = await supabase.from('ticket_types').select('*').in('id', ticketTypeIds)
      ticketTypes = tts || []
    }
    const ttMap: any = {}
    ticketTypes.forEach((t: any) => { ttMap[t.id] = t })

    const itemsHtml = items.map((it: any) => {
      const tt = ttMap[it.ticket_type_id]
      const title = tt?.title || 'Ticket'
      const qty = it.quantity || 1
      const price = it.unit_price || 0
      return `<li><strong>${title}</strong> — Qty: ${qty} — ${orderRes.currency || ''} ${price}</li>`
    }).join('')
    const orderTotal = `${orderRes.currency || ''} ${Number(orderRes.total_amount || 0).toLocaleString()}`

    // Fetch issued tickets (with retry for webhook timing)
    const tickets = await fetchTicketsForOrder(supabase, order_id)
    let attachments: { filename: string; content: string }[] = []

    if (tickets.length > 0) {
      try {
        const pdfBytes = await buildTicketsPdf(tickets, FRONTEND_URL)
        const base64Pdf = encodeBase64(pdfBytes)
        attachments.push({ filename: 'your-tickets.pdf', content: base64Pdf })
      } catch (pdfErr: any) {
        console.error('send-order-emails: PDF generation failed', pdfErr?.message || pdfErr)
      }
    }

    const hasAttachment = attachments.length > 0
    const linkParagraph = hasAttachment
      ? '<p>Your tickets are attached to this email as a PDF.</p>'
      : `<p>You can view your order at <a href="${FRONTEND_URL}/orders/${orderRes.id}">${FRONTEND_URL}/orders/${orderRes.id}</a></p>`

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>body{font-family:Arial,Helvetica,sans-serif;color:#222} .container{max-width:600px;margin:0 auto;padding:20px}</style>
      </head>
      <body>
        <div class="container">
          <h2>Your Tickets</h2>
          <p>Thank you for your order. Below are your tickets for order <strong>${orderRes.reference || orderRes.id}</strong>.</p>
          <ul>
            ${itemsHtml}
          </ul>
          <p><strong>Total:</strong> ${orderTotal}</p>
          ${linkParagraph}
          <p>This email was sent automatically by DirtTrails.</p>
        </div>
      </body>
      </html>
    `

    const fromEmail = FROM_EMAIL.includes('<') ? FROM_EMAIL : `DirtTrails <${FROM_EMAIL}>`
    const payload: any = {
      from: fromEmail,
      to: [recipient_email],
      subject: `Your tickets for order ${orderRes.reference || orderRes.id}`,
      html,
    }
    if (attachments.length > 0) payload.attachments = attachments

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Resend error sending order email:', errText)
      throw new Error(`Resend API error: ${res.status} ${errText}`)
    }

    const result = await res.json()
    console.log('Order email sent', result.id, hasAttachment ? '(with PDF)' : '')

    return new Response(JSON.stringify({ success: true, id: result.id, attachment: hasAttachment }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

  } catch (err: any) {
    console.error('Error in send-order-emails:', err)
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
})
