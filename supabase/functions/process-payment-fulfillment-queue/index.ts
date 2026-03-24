import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const PROCESS_QUEUE_SECRET = Deno.env.get("PROCESS_QUEUE_SECRET") || ""

const HIRER_TRANSPORT_FEE_RATE = 0.02
const PROVIDER_TRANSPORT_FEE_RATE = 0.02

type QueueJob = {
  id: string
  job_type: "booking_fulfillment" | "order_fulfillment"
  source_id: string
  payload: {
    reference?: string
  }
  attempts: number
  max_attempts: number
}

function nextRetryDelayMinutes(attempt: number): number {
  const delay = Math.min(60, Math.pow(2, Math.max(0, attempt - 1)))
  return Math.max(1, delay)
}

async function processBookingFulfillment(supabase: any, job: QueueJob): Promise<void> {
  const bookingId = job.source_id
  const reference = job.payload?.reference || `PMT_${bookingId.slice(0, 8)}_${Date.now()}`

  const { data: booking, error: bookingFetchErr } = await supabase
    .from("bookings")
    .select("id, vendor_id, tourist_id, currency, total_amount, service_id")
    .eq("id", bookingId)
    .single()

  if (bookingFetchErr || !booking) throw new Error(`booking-not-found:${bookingId}`)

  // Prevent duplicate transaction creation.
  const { data: existingTx, error: txCheckErr } = await supabase
    .from("transactions")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("transaction_type", "payment")
    .eq("status", "completed")
    .maybeSingle()

  if (txCheckErr) throw new Error(`tx-check-failed:${txCheckErr.message}`)

  if (!existingTx) {
    let providerCreditAmount = Number(booking.total_amount || 0)
    const { data: serviceData, error: serviceErr } = await supabase
      .from("services")
      .select("category_id")
      .eq("id", booking.service_id)
      .maybeSingle()

    if (serviceErr) throw new Error(`service-fetch-failed:${serviceErr.message}`)

    const isTransport = (serviceData as any)?.category_id === "cat_transport"
    if (isTransport) {
      const paidTotal = Number(booking.total_amount || 0)
      const subtotal = paidTotal / (1 + HIRER_TRANSPORT_FEE_RATE)
      providerCreditAmount = subtotal * (1 - PROVIDER_TRANSPORT_FEE_RATE)
    }

    const { error: txErr } = await supabase.rpc("create_transaction_atomic", {
      p_vendor_id: booking.vendor_id,
      p_amount: providerCreditAmount,
      p_transaction_type: "payment",
      p_booking_id: bookingId,
      p_tourist_id: booking.tourist_id || null,
      p_currency: booking.currency || "UGX",
      p_status: "completed",
      p_payment_method: "mobile_money",
      p_reference: reference,
    })

    if (txErr) throw new Error(`create-transaction-failed:${txErr.message}`)
  }

  const baseUrl = (SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "")
  const sendBookingEmailsUrl = `${baseUrl}/functions/v1/send-booking-emails`
  fetch(sendBookingEmailsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  }).catch((e) => console.warn("Worker: send-booking-emails error", e?.message || e))
}

async function processOrderFulfillment(supabase: any, job: QueueJob): Promise<void> {
  const orderId = job.source_id
  const reference = job.payload?.reference || `PMT_${orderId.slice(0, 8)}_${Date.now()}`

  const { data: order, error: orderFetchErr } = await supabase
    .from("orders")
    .select("id, vendor_id, user_id, currency, guest_name, guest_email, guest_phone")
    .eq("id", orderId)
    .single()

  if (orderFetchErr || !order) throw new Error(`order-not-found:${orderId}`)

  // Order-level transaction (idempotent by reference check).
  const { data: existingOrderTx, error: orderTxCheckErr } = await supabase
    .from("transactions")
    .select("id")
    .eq("reference", reference)
    .eq("transaction_type", "payment")
    .maybeSingle()
  if (orderTxCheckErr) throw new Error(`order-tx-check-failed:${orderTxCheckErr.message}`)

  if (!existingOrderTx) {
    const { error: txErr } = await supabase.rpc("create_transaction_atomic", {
      p_vendor_id: order.vendor_id,
      p_amount: Number((job as any)?.payload?.amount || 0),
      p_transaction_type: "payment",
      p_booking_id: null,
      p_tourist_id: order.user_id || null,
      p_currency: order.currency || "UGX",
      p_status: "completed",
      p_payment_method: "mobile_money",
      p_reference: reference,
    })
    if (txErr) throw new Error(`create-order-transaction-failed:${txErr.message}`)
  }

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("*, ticket_types(*)")
    .eq("order_id", orderId)
  if (itemsErr) throw new Error(`order-items-fetch-failed:${itemsErr.message}`)
  if (!items || items.length === 0) return

  const groups: Record<string, { qty: number; total: number }> = {}
  for (const it of items) {
    const sid = (it as any).ticket_types?.service_id
    if (!sid) continue
    groups[sid] = groups[sid] || { qty: 0, total: 0 }
    groups[sid].qty += it.quantity
    groups[sid].total += Number(it.unit_price || 0) * it.quantity
  }

  const today = new Date().toISOString().slice(0, 10)
  await Promise.all([
    ...Object.keys(groups).map(async (sid) => {
      const { data: svc } = await supabase.from("services").select("vendor_id").eq("id", sid).single()
      const vendorId = (svc as any)?.vendor_id || order.vendor_id
      const createRes = await supabase.rpc("create_booking_atomic", {
        p_service_id: sid,
        p_vendor_id: vendorId,
        p_booking_date: today,
        p_guests: groups[sid].qty,
        p_total_amount: groups[sid].total,
        p_tourist_id: order.user_id || null,
        p_service_date: today,
        p_currency: order.currency || "UGX",
        p_guest_name: order.guest_name || null,
        p_guest_email: order.guest_email || null,
        p_guest_phone: order.guest_phone || null,
      })
      if ((createRes.data as any)?.success && (createRes.data as any)?.booking_id) {
        await supabase.rpc("update_booking_status_atomic", {
          p_booking_id: (createRes.data as any).booking_id,
          p_status: "confirmed",
          p_payment_status: "paid",
        })
      }
    }),
    ...items.map(async (it: any) => {
      const { data: bookData, error: bookErr } = await supabase.rpc("book_tickets_atomic", {
        p_ticket_type_id: it.ticket_type_id,
        p_quantity: it.quantity,
        p_order_id: orderId,
      })
      if (bookErr || !(bookData as any)?.success) {
        throw new Error(`ticket-book-failed:${it.ticket_type_id}:${bookErr?.message || (bookData as any)?.error || "unknown"}`)
      }
    }),
  ])

  let recipientEmail = (order as any).guest_email?.trim() || null
  if (!recipientEmail && (order as any).user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", (order as any).user_id)
      .maybeSingle()
    recipientEmail = (profile as any)?.email?.trim() || null
  }

  if (recipientEmail) {
    const baseUrl = (SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "")
    const sendOrderEmailsUrl = `${baseUrl}/functions/v1/send-order-emails`
    fetch(sendOrderEmailsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ order_id: orderId, recipient_email: recipientEmail }),
    }).catch((e) => console.warn("Worker: send-order-emails error", e?.message || e))
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, x-worker-secret",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (PROCESS_QUEUE_SECRET) {
    const provided = req.headers.get("x-worker-secret") || ""
    if (provided !== PROCESS_QUEUE_SECRET) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const body = await req.json().catch(() => ({}))
  const batchSize = Math.max(1, Math.min(20, Number(body?.batch_size || 8)))

  const nowIso = new Date().toISOString()
  const { data: jobs, error: jobsErr } = await supabase
    .from("payment_fulfillment_jobs")
    .select("id, job_type, source_id, payload, attempts, max_attempts")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("created_at", { ascending: true })
    .limit(batchSize)

  if (jobsErr) {
    return new Response(JSON.stringify({ success: false, error: jobsErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  let processed = 0
  let completed = 0
  let failed = 0

  for (const j of (jobs || []) as QueueJob[]) {
    // Claim job optimistically.
    const { data: claimed, error: claimErr } = await supabase
      .from("payment_fulfillment_jobs")
      .update({ status: "processing", started_at: new Date().toISOString(), attempts: (j.attempts || 0) + 1 })
      .eq("id", j.id)
      .eq("status", "pending")
      .select("id, job_type, source_id, payload, attempts, max_attempts")
      .maybeSingle()

    if (claimErr || !claimed) continue

    processed += 1
    const attempt = Number((claimed as any).attempts || 1)

    try {
      if ((claimed as any).job_type === "booking_fulfillment") {
        await processBookingFulfillment(supabase, claimed as QueueJob)
      } else if ((claimed as any).job_type === "order_fulfillment") {
        await processOrderFulfillment(supabase, claimed as QueueJob)
      } else {
        throw new Error(`unknown-job-type:${(claimed as any).job_type}`)
      }

      await supabase
        .from("payment_fulfillment_jobs")
        .update({ status: "completed", completed_at: new Date().toISOString(), last_error: null })
        .eq("id", (claimed as any).id)
      completed += 1
    } catch (e: any) {
      const errMsg = e?.message || String(e)
      const maxAttempts = Number((claimed as any).max_attempts || 6)

      if (attempt >= maxAttempts) {
        await supabase
          .from("payment_fulfillment_jobs")
          .update({ status: "failed", last_error: errMsg })
          .eq("id", (claimed as any).id)
        failed += 1
      } else {
        const delayMinutes = nextRetryDelayMinutes(attempt)
        const next = new Date(Date.now() + delayMinutes * 60_000).toISOString()
        await supabase
          .from("payment_fulfillment_jobs")
          .update({
            status: "pending",
            last_error: errMsg,
            scheduled_for: next,
          })
          .eq("id", (claimed as any).id)
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, scanned: (jobs || []).length, processed, completed, failed }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  )
})
