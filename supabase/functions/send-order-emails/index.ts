// This file is a Supabase Edge Function that runs on Deno. The project's TypeScript
// language server (configured for the React app) may not understand Deno imports.
// Disable TS checking for this file to avoid editor/TS diagnostics here.
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')
const FRONTEND_URL = Deno.env.get('FRONTEND_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

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

    // Fetch order and items
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

    // Optionally fetch ticket type details
    const ticketTypeIds = items.map((it: any) => it.ticket_type_id).filter(Boolean)
    let ticketTypes: any[] = []
    if (ticketTypeIds.length > 0) {
      const { data: tts } = await supabase.from('ticket_types').select('*').in('id', ticketTypeIds)
      ticketTypes = tts || []
    }
    const ttMap: any = {}
    ticketTypes.forEach((t: any) => { ttMap[t.id] = t })

    // Fetch service info if available
    let service: any = null
    const firstTicket = ticketTypes[0]
    if (firstTicket && firstTicket.service_id) {
      const { data: s } = await supabase.from('services').select('id, title, description, currency').eq('id', firstTicket.service_id).maybeSingle()
      service = s || null
    }

    // Build tickets HTML
    const itemsHtml = items.map((it: any) => {
      const tt = ttMap[it.ticket_type_id]
      const title = tt?.title || 'Ticket'
      const qty = it.quantity || 1
      const price = it.unit_price || 0
      return `<li><strong>${title}</strong> — Qty: ${qty} — ${orderRes.currency || ''} ${price}</li>`
    }).join('')

    const orderTotal = `${orderRes.currency || ''} ${Number(orderRes.total_amount || 0).toLocaleString()}`

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
          <p>You can view your order at <a href="${FRONTEND_URL}/orders/${orderRes.id}">${FRONTEND_URL}/orders/${orderRes.id}</a></p>
          <p>This email was sent automatically by DirtTrails.</p>
        </div>
      </body>
      </html>
    `

    // send via Resend
    const fromEmail = FROM_EMAIL.includes('<') ? FROM_EMAIL : `DirtTrails <${FROM_EMAIL}>`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient_email],
        subject: `Your tickets for order ${orderRes.reference || orderRes.id}`,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Resend error sending order email:', errText)
      throw new Error(`Resend API error: ${res.status} ${errText}`)
    }

    const result = await res.json()
    console.log('Order email sent', result)

    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

  } catch (err: any) {
    console.error('Error in send-order-emails:', err)
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
})
