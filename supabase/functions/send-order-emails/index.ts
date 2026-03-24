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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function toBase64(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function fmtEventDate(dateStr?: string): string {
  if (!dateStr) return "See ticket for details"
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    })
  } catch { return dateStr }
}

async function fetchTicketsForOrder(supabase: any, orderId: string): Promise<any[]> {
  const select = `
    *,
    ticket_types(id, title, price),
    services(id, slug, title, event_location, location, event_datetime, vendors(business_name)),
    orders(currency, guest_name, guest_email, user_id)
  `
  const { data: tickets } = await supabase
    .from("tickets")
    .select(select)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  if (tickets && tickets.length > 0) return tickets

  await new Promise((r) => setTimeout(r, 2500))
  const retry = await supabase.from("tickets").select(select).eq("order_id", orderId)
  return retry.data || []
}

async function qrToPngBytes(url: string, size = 160): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(url, { type: "image/png", width: size })
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ─── TICKET PDF — A5 landscape, one ticket per page ──────────────────────────

async function buildTicketsPdf(tickets: any[], frontendUrl: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const green = rgb(0.106, 0.227, 0.176)
  const amber = rgb(0.788, 0.529, 0.227)
  const ivory = rgb(0.980, 0.965, 0.933)
  const dark  = rgb(0.110, 0.098, 0.090)
  const sage  = rgb(0.561, 0.686, 0.608)
  const cream = rgb(0.949, 0.933, 0.898)

  for (const t of tickets) {
    const W = 595, H = 220
    const page = doc.addPage([W, H])

    const service    = t.services    || {}
    const ticketType = t.ticket_types || {}
    const code       = t.code || t.id
    const slug       = service.slug
    const qrUrl      = slug
      ? `${frontendUrl}/service/${slug}?ticket=${code}`
      : `${frontendUrl}/tickets/${code}`

    // Left accent stripe
    page.drawRectangle({ x: 0, y: 0, width: 7, height: H, color: green })

    // Header band
    page.drawRectangle({ x: 7, y: H - 46, width: W - 7, height: 46, color: green })
    page.drawText("DIRT TRAILS", { x: 22, y: H - 28, size: 14, font: bold, color: ivory })
    page.drawText("EVENT TICKET", { x: 22, y: H - 40, size: 7, font, color: amber })

    if (ticketType.title) {
      const tLabel = (ticketType.title as string).toUpperCase()
      const tW = bold.widthOfTextAtSize(tLabel, 9)
      page.drawText(tLabel, { x: W - 155 - tW / 2, y: H - 28, size: 9, font: bold, color: amber })
    }

    // Amber status stripe
    page.drawRectangle({ x: 7, y: H - 59, width: W - 7, height: 13, color: amber })
    page.drawText("VALID TICKET", { x: 22, y: H - 52, size: 7, font: bold, color: green })

    // Event title
    const rawTitle = (service.title || "Event") as string
    const titleDisp = rawTitle.length > 44 ? rawTitle.slice(0, 44) + "..." : rawTitle
    page.drawText(titleDisp, { x: 22, y: H - 80, size: 13, font: bold, color: dark })

    let yPos = H - 98

    if (service.vendors?.business_name) {
      page.drawText("BY", { x: 22, y: yPos, size: 6.5, font, color: sage })
      page.drawText(service.vendors.business_name, { x: 40, y: yPos, size: 8.5, font: bold, color: dark })
      yPos -= 15
    }

    if (service.event_datetime) {
      const evDate = new Date(service.event_datetime).toLocaleDateString("en-GB", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
      })
      const evTime = new Date(service.event_datetime).toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit",
      })
      page.drawText("DATE & TIME", { x: 22, y: yPos, size: 6.5, font, color: sage })
      yPos -= 12
      page.drawText(`${evDate} · ${evTime}`, { x: 22, y: yPos, size: 8.5, font: bold, color: dark })
      yPos -= 15
    }

    const venue = service.event_location || service.location || ""
    if (venue) {
      page.drawText("VENUE", { x: 22, y: yPos, size: 6.5, font, color: sage })
      yPos -= 12
      const v = venue.length > 40 ? venue.slice(0, 40) + "..." : venue
      page.drawText(v, { x: 22, y: yPos, size: 8.5, font: bold, color: dark })
    }

    if (ticketType.price != null) {
      const currency = t.orders?.currency || "UGX"
      page.drawText(`${currency} ${Number(ticketType.price).toLocaleString()}`, {
        x: 22, y: 28, size: 13, font: bold, color: green,
      })
    }

    const refShort = (code as string).toUpperCase().slice(0, 14)
    page.drawText(`REF: ${refShort}`, { x: 22, y: 12, size: 6.5, font, color: sage })

    // Perforated divider
    page.drawLine({
      start: { x: W - 155, y: 10 },
      end:   { x: W - 155, y: H - 60 },
      thickness: 0.5,
      color: cream,
      dashArray: [4, 4],
    })

    // QR section
    page.drawRectangle({ x: W - 150, y: 10, width: 132, height: H - 70, color: cream })
    try {
      const qrBytes = await qrToPngBytes(qrUrl, 140)
      const qrImage = await doc.embedPng(qrBytes)
      page.drawImage(qrImage, { x: W - 145, y: H - 160, width: 120, height: 120 })
    } catch { /* non-fatal */ }

    const scanW = font.widthOfTextAtSize("SCAN TO VERIFY", 6.5)
    page.drawText("SCAN TO VERIFY", { x: W - 84 - scanW / 2, y: 28, size: 6.5, font, color: sage })
    const codeW = font.widthOfTextAtSize(refShort, 5.5)
    page.drawText(refShort, { x: W - 84 - codeW / 2, y: 14, size: 5.5, font, color: dark })
  }

  return doc.save()
}

// ─── ORDER EMAIL HTML ─────────────────────────────────────────────────────────

function buildOrderEmailHtml(p: {
  order: any
  tickets: any[]
  guestName: string
  frontendUrl: string
}): string {
  const { order, tickets, guestName } = p
  const first     = tickets[0]
  const service   = first?.services || {}
  const eventName = service.title || "Your Event"
  const eventDate = service.event_datetime ? fmtEventDate(service.event_datetime) : "See tickets for details"
  const venue     = service.event_location || service.location || ""
  const currency  = order?.currency || first?.orders?.currency || "UGX"
  const total     = tickets.reduce((s: number, t: any) => s + Number(t.ticket_types?.price || 0), 0)
  const ref       = (order?.reference || order?.id || "").toUpperCase()
  const nameGreet = guestName ? `, ${guestName}` : ""

  const ticketRows = tickets.map((t: any, i: number) => `
    <tr>
      <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Ticket ${i + 1}</td>
      <td style="padding:7px 0;color:#1C1917;font-size:12px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${t.ticket_types?.title || "General Admission"}</td>
      <td style="padding:7px 0;text-align:right;color:#1B3A2D;font-size:12px;font-weight:700;font-family:'Courier New',Courier,monospace;border-bottom:1px dotted #EEE9DF;">${currency} ${Number(t.ticket_types?.price || 0).toLocaleString()}</td>
    </tr>`).join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Your Tickets - DirtTrails</title>
</head>
<body style="margin:0;padding:0;background:#F0EBE1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0EBE1;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;box-shadow:0 8px 48px rgba(27,58,45,.14);">
  <tr><td style="background:#1B3A2D;padding:36px 44px;text-align:center;">
    <h1 style="margin:0 0 4px;color:#FAF6EE;font-size:30px;letter-spacing:10px;font-weight:700;font-family:Georgia,serif;text-transform:uppercase;">DIRT TRAILS</h1>
    <p style="margin:0;color:#8FAF9B;font-size:9px;letter-spacing:5px;text-transform:uppercase;font-family:Arial,sans-serif;">YOUR TICKETS ARE READY</p>
  </td></tr>
  <tr><td style="background:#C9873A;padding:13px 44px;text-align:center;">
    <p style="margin:0;color:#1B3A2D;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;font-family:Arial,sans-serif;">${tickets.length} TICKET${tickets.length !== 1 ? "S" : ""} ATTACHED TO THIS EMAIL</p>
  </td></tr>
  <tr><td style="background:#fff;padding:40px 44px;">
    <h2 style="margin:0 0 8px;color:#1B3A2D;font-size:21px;font-family:Georgia,serif;font-weight:normal;line-height:1.4;">Ready for <em>${eventName}</em>${nameGreet}?</h2>
    <p style="margin:0 0 36px;color:#6B6560;font-size:14px;line-height:1.8;font-family:Arial,sans-serif;">Your tickets are attached as a PDF. Show them at the venue &mdash; digital or printed both work.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF6EE;border-left:3px solid #C9873A;margin-bottom:36px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 4px;color:#8FAF9B;font-size:9px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">Order Reference</p>
      <p style="margin:0;color:#1B3A2D;font-size:16px;font-weight:700;letter-spacing:3px;font-family:'Courier New',Courier,monospace;">${ref}</p>
    </td></tr>
    </table>
    <p style="margin:0 0 12px;color:#8FAF9B;font-size:9px;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #EEE9DF;padding-bottom:8px;font-family:Arial,sans-serif;">Event Details</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding:7px 0;width:36%;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Event</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${eventName}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Date</td>
        <td style="padding:7px 0;color:#1B3A2D;font-size:13px;font-weight:700;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${eventDate}</td>
      </tr>
      ${venue ? `<tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">Venue</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;border-bottom:1px dotted #EEE9DF;">${venue}</td>
      </tr>` : ""}
      ${service.vendors?.business_name ? `<tr>
        <td style="padding:7px 0;color:#8FAF9B;font-size:12px;font-family:Arial,sans-serif;">Organiser</td>
        <td style="padding:7px 0;color:#1C1917;font-size:13px;font-weight:600;font-family:Arial,sans-serif;">${service.vendors.business_name}</td>
      </tr>` : ""}
    </table>
    <p style="margin:0 0 12px;color:#8FAF9B;font-size:9px;letter-spacing:4px;text-transform:uppercase;border-bottom:1px solid #EEE9DF;padding-bottom:8px;font-family:Arial,sans-serif;">Ticket Breakdown</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      ${ticketRows}
      <tr>
        <td style="padding:12px 0 0;" colspan="2"><span style="color:#1B3A2D;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Total</span></td>
        <td style="padding:12px 0 0;text-align:right;color:#1B3A2D;font-size:20px;font-weight:700;font-family:'Courier New',Courier,monospace;">${currency} ${total.toLocaleString()}</td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF6EE;margin-bottom:36px;">
    <tr><td style="padding:18px 22px;">
      <p style="margin:0 0 8px;color:#1B3A2D;font-size:13px;font-weight:700;font-family:Arial,sans-serif;">Your tickets are attached</p>
      <p style="margin:0;color:#6B6560;font-size:12px;line-height:1.8;font-family:Arial,sans-serif;">Open the PDF attachment <strong>your-tickets.pdf</strong>. Each ticket has a unique QR code &mdash; show it at the entrance.</p>
    </td></tr>
    </table>
    <p style="margin:0;color:#ABA49C;font-size:12px;text-align:center;font-family:Arial,sans-serif;line-height:1.6;">Enjoy the event!</p>
  </td></tr>
  <tr><td style="background:#1B3A2D;padding:28px 44px;text-align:center;">
    <p style="margin:0 0 8px;color:#C9873A;font-size:9px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;">DIRTTRAILS ADVENTURES</p>
    <p style="margin:0;color:#5D8070;font-size:12px;font-family:Arial,sans-serif;line-height:1.7;">Questions? Contact the event organiser or visit DirtTrails.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const origin = req.headers.get("origin") || "*"
  const CORS = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    if (!RESEND_API_KEY || !FROM_EMAIL || !FRONTEND_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables")
    }

    let body
    try { body = await req.json() }
    catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } }) }

    const { order_id, recipient_email } = body
    if (!order_id || !recipient_email) {
      return new Response(JSON.stringify({ error: "order_id and recipient_email are required" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).single()
    const tickets = await fetchTicketsForOrder(supabase, order_id)

    const guestName     = order?.guest_name || ""
    const firstService  = tickets[0]?.services
    const eventName     = firstService?.title || "Your Event"

    const attachments: any[] = []
    if (tickets.length > 0) {
      const pdfBytes = await buildTicketsPdf(tickets, FRONTEND_URL)
      attachments.push({ filename: "your-tickets.pdf", content: toBase64(pdfBytes) })
    }

    const from = FROM_EMAIL && FROM_EMAIL.includes("<") ? FROM_EMAIL : `DirtTrails <${FROM_EMAIL}>`
    const emailPayload: any = {
      from,
      to: [recipient_email],
      subject: `Your Tickets — ${eventName} | DirtTrails`,
      html: buildOrderEmailHtml({ order, tickets, guestName, frontendUrl: FRONTEND_URL }),
    }
    if (attachments.length > 0) emailPayload.attachments = attachments

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload),
    })
    const result = await res.json()

    return new Response(
      JSON.stringify({ success: true, id: result?.id ?? null, attachment: attachments.length > 0, result }),
      { status: 200, headers: { "Content-Type": "application/json", ...CORS } }
    )
  } catch (err: any) {
    console.error("Error in send-order-emails:", err)
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
