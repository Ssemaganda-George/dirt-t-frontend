// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1"
import QRCode from "https://esm.sh/qrcode@1.5.3"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")
const FRONTEND_URL = Deno.env.get("FRONTEND_URL")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

/* ---------------- BASE64 FIX ---------------- */

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/* ---------------- HELPERS ---------------- */

async function fetchTicketsForOrder(supabase: any, orderId: string): Promise<any[]> {
  const select = `
    *,
    ticket_types(id, title, price),
    services(id, slug, title, event_location, location, event_datetime, vendors(business_name)),
    orders(currency, guest_name, guest_email, user_id)
  `

  let { data: tickets } = await supabase
    .from("tickets")
    .select(select)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  if (tickets && tickets.length > 0) return tickets

  await new Promise((r) => setTimeout(r, 2500))

  const retry = await supabase
    .from("tickets")
    .select(select)
    .eq("order_id", orderId)

  return retry.data || []
}

/* ---------------- QR GENERATION ---------------- */

async function qrToPngBytes(url: string, size = 160): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(url, { type: "image/png", width: size })

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "")
  const binary = atob(base64)

  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

/* ---------------- PDF GENERATION ---------------- */

async function buildTicketsPdf(tickets: any[], frontendUrl: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const black = rgb(0.06, 0.06, 0.06)

  for (const t of tickets) {
    const page = doc.addPage([595, 220])

    const service = t.services || {}
    const ticketType = t.ticket_types || {}
    const code = t.code || t.id

    const slug = service.slug
    const qrUrl = slug ? `${frontendUrl}/service/${slug}?ticket=${code}` : code

    page.drawText(service.title || "Event", {
      x: 20,
      y: 190,
      font: fontBold,
      size: 14,
      color: black,
    })

    page.drawText(ticketType.title || "Ticket", {
      x: 20,
      y: 170,
      font,
      size: 10,
      color: black,
    })

    const qrBytes = await qrToPngBytes(qrUrl)
    const qrImage = await doc.embedPng(qrBytes)

    page.drawImage(qrImage, {
      x: 450,
      y: 90,
      width: 70,
      height: 70,
    })

    page.drawText(code, {
      x: 20,
      y: 140,
      font,
      size: 10,
      color: black,
    })
  }

  return doc.save()
}

/* ---------------- EDGE FUNCTION ---------------- */

serve(async (req) => {
  try {
    const body = await req.json()

    const { order_id, recipient_email } = body

    if (!order_id || !recipient_email) {
      return new Response(JSON.stringify({ error: "order_id and recipient_email required" }), {
        status: 400,
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single()

    const tickets = await fetchTicketsForOrder(supabase, order_id)

    let attachments: any[] = []

    if (tickets.length > 0) {
      const pdfBytes = await buildTicketsPdf(tickets, FRONTEND_URL)

      const base64Pdf = toBase64(pdfBytes)

      attachments.push({
        filename: "your-tickets.pdf",
        content: base64Pdf,
      })
    }

    const emailPayload: any = {
      from: FROM_EMAIL,
      to: [recipient_email],
      subject: `Your Tickets — ${order.reference || order.id}`,
      html: `<p>Your tickets are attached.</p>`,
    }

    if (attachments.length > 0) {
      emailPayload.attachments = attachments
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    })

    const result = await res.json()

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      { status: 500 }
    )
  }
})