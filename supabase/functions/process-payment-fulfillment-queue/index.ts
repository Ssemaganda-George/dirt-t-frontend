import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const PROCESS_QUEUE_SECRET = Deno.env.get("PROCESS_QUEUE_SECRET") || ""

const HIRER_TRANSPORT_FEE_RATE = 0.02
const PROVIDER_TRANSPORT_FEE_RATE = 0.02

// Leave 30s headroom from the 150s edge function timeout
const WORKER_DEADLINE_MS = 120_000

type QueueJob = {
  id: string
  job_type: "booking_fulfillment" | "order_fulfillment"
  source_id: string
  payload: {
    reference?: string
    amount?: number
  }
  attempts: number
  max_attempts: number
}

type JobOutcome = {
  id: string
  outcome: "completed" | "retrying" | "failed"
  error?: string
}

function nextRetryDelayMinutes(attempt: number): number {
  return Math.max(1, Math.min(60, Math.pow(2, Math.max(0, attempt - 1))))
}

async function notifyFulfillmentJobFailed(job: QueueJob, errMsg: string): Promise<void> {
  const baseUrl = (SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "")
  try {
    const res = await fetch(`${baseUrl}/functions/v1/notify-fulfillment-job-failed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        job_id: job.id,
        last_error: errMsg,
      }),
    })
    if (!res.ok) {
      console.warn("Worker: fulfillment failure alert failed", res.status, await res.text())
    }
  } catch (e: any) {
    console.warn("Worker: fulfillment failure alert error", e?.message || e)
  }
}

async function getAdminProfileId(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle()
  if (error) {
    console.warn("Worker: admin profile lookup failed", error.message)
    return null
  }
  return data?.id ?? null
}

type SettlementParams = {
  vendorId: string
  totalAmount: number
  commissionAmount: number
  adminId: string | null
  bookingId: string | null
  touristId: string | null
  currency: string
  reference: string
}

/** Ledger + vendor wallet (+ platform wallet when admin exists). Replaces bare create_transaction_atomic_v2. */
async function settlePaymentWithCommission(supabase: any, params: SettlementParams): Promise<void> {
  const commission = Math.max(0, Number(params.commissionAmount) || 0)
  const total = Number(params.totalAmount) || 0
  const vendorNet = Math.max(0, total - commission)

  if (params.adminId) {
    const { data, error } = await supabase.rpc("process_payment_with_commission", {
      p_vendor_id: params.vendorId,
      p_total_amount: total,
      p_commission_amount: commission,
      p_admin_id: params.adminId,
      p_booking_id: params.bookingId,
      p_tourist_id: params.touristId,
      p_currency: params.currency,
      p_payment_method: "mobile_money",
      p_reference: params.reference,
    })

    if (error) throw new Error(`settle-with-commission-failed:${error.message}`)
    if (!data?.success && !data?.skipped) {
      throw new Error(`settle-with-commission-failed:${data?.error || "unknown"}`)
    }
    return
  }

  console.warn("Worker: no admin profile — settling vendor net only via process_payment_atomic")
  const { data, error } = await supabase.rpc("process_payment_atomic", {
    p_vendor_id: params.vendorId,
    p_amount: vendorNet,
    p_booking_id: params.bookingId,
    p_tourist_id: params.touristId,
    p_currency: params.currency,
    p_payment_method: "mobile_money",
    p_reference: params.reference,
  })

  if (error) throw new Error(`settle-atomic-failed:${error.message}`)
  if (!data?.success) throw new Error(`settle-atomic-failed:${data?.error || "unknown"}`)
}

function resolveBookingCommission(booking: {
  total_amount?: number | string | null
  commission_amount?: number | string | null
  platform_fee?: number | string | null
  commission_rate_at_booking?: number | string | null
  vendor_payout_amount?: number | string | null
}, isTransport: boolean): { total: number; commission: number } {
  const total = Number(booking.total_amount || 0)

  if (isTransport) {
    const subtotal = total / (1 + HIRER_TRANSPORT_FEE_RATE)
    const vendorNet = subtotal * (1 - PROVIDER_TRANSPORT_FEE_RATE)
    return { total, commission: Math.max(0, total - vendorNet) }
  }

  let commission = Number(booking.commission_amount ?? booking.platform_fee ?? 0)
  if (!commission && booking.commission_rate_at_booking) {
    commission = Math.round(total * Number(booking.commission_rate_at_booking) * 100) / 100
  }

  const vendorPayout = booking.vendor_payout_amount != null
    ? Number(booking.vendor_payout_amount)
    : null
  if (vendorPayout != null && total > 0) {
    commission = Math.max(0, total - vendorPayout)
  }

  return { total, commission: Math.max(0, commission) }
}

const SETTLEABLE_BOOKING_STATUSES = new Set(["confirmed", "completed"])

function assertBookingPaidForSettlement(
  booking: { status?: string; payment_status?: string },
  bookingId: string
): void {
  if (booking.payment_status !== "paid") {
    throw new Error(
      `booking-not-paid:${bookingId}:payment_status=${booking.payment_status || "unknown"}`
    )
  }
  if (!SETTLEABLE_BOOKING_STATUSES.has(String(booking.status || ""))) {
    throw new Error(`booking-not-confirmed:${bookingId}:status=${booking.status || "unknown"}`)
  }
}

function assertOrderPaidForSettlement(order: { status?: string }, orderId: string): void {
  if (order.status !== "paid") {
    throw new Error(`order-not-paid:${orderId}:status=${order.status || "unknown"}`)
  }
}

/** When a MarzPay payments row exists, it must be completed before settlement. */
async function assertMarzpayPaymentCompleted(
  supabase: any,
  opts: { bookingId?: string; orderId?: string; reference: string }
): Promise<void> {
  if (!opts.reference) return

  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, status, booking_id, order_id")
    .eq("reference", opts.reference)
    .maybeSingle()

  if (error) throw new Error(`payment-lookup-failed:${error.message}`)
  if (!payment) return

  const status = String(payment.status || "").toLowerCase()
  if (status !== "completed") {
    throw new Error(`payment-not-completed:reference=${opts.reference}:status=${status}`)
  }

  if (opts.bookingId && payment.booking_id && payment.booking_id !== opts.bookingId) {
    throw new Error(`payment-booking-mismatch:${opts.reference}`)
  }
  if (opts.orderId && payment.order_id && payment.order_id !== opts.orderId) {
    throw new Error(`payment-order-mismatch:${opts.reference}`)
  }
}

async function processBookingFulfillment(supabase: any, job: QueueJob): Promise<void> {
  const bookingId = job.source_id
  const reference = job.payload?.reference || `PMT_${bookingId.slice(0, 8)}_${Date.now()}`

  const { data: booking, error: bookingFetchErr } = await supabase
    .from("bookings")
    .select(
      "id, vendor_id, tourist_id, currency, total_amount, service_id, status, payment_status, payment_reference, commission_amount, platform_fee, commission_rate_at_booking, vendor_payout_amount"
    )
    .eq("id", bookingId)
    .single()

  if (bookingFetchErr || !booking) throw new Error(`booking-not-found:${bookingId}`)

  const { data: serviceRow } = await supabase
    .from("services")
    .select("category_id")
    .eq("id", booking.service_id)
    .maybeSingle()

  if (
    booking.status === "reserved" ||
    booking.payment_status === "not_required" ||
    serviceRow?.category_id === "cat_restaurants"
  ) {
    throw new Error(`booking-skips-settlement:${bookingId}:restaurant-reservation`)
  }

  assertBookingPaidForSettlement(booking, bookingId)
  const paymentRef = job.payload?.reference || booking.payment_reference || reference
  await assertMarzpayPaymentCompleted(supabase, { bookingId, reference: paymentRef })

  const adminId = await getAdminProfileId(supabase)

  const { data: existingTx, error: txCheckErr } = await supabase
    .from("transactions")
    .select("id, payout_meta")
    .eq("booking_id", bookingId)
    .eq("transaction_type", "payment")
    .eq("status", "completed")
    .maybeSingle()

  if (txCheckErr) throw new Error(`tx-check-failed:${txCheckErr.message}`)

  const walletAlreadySettled = Boolean((existingTx as any)?.payout_meta?.wallet_settlement)

  if (existingTx && !walletAlreadySettled) {
    const { data: backfillResult, error: backfillErr } = await supabase.rpc(
      "backfill_wallet_credits_for_booking",
      { p_booking_id: bookingId, p_admin_id: adminId },
    )
    if (backfillErr) throw new Error(`wallet-backfill-failed:${backfillErr.message}`)
    if (!(backfillResult as any)?.success) {
      throw new Error(
        `wallet-backfill-failed:${(backfillResult as any)?.error || "unknown"}`,
      )
    }
  } else if (!existingTx) {
    const { data: serviceData, error: serviceErr } = await supabase
      .from("services")
      .select("category_id")
      .eq("id", booking.service_id)
      .maybeSingle()

    if (serviceErr) throw new Error(`service-fetch-failed:${serviceErr.message}`)

    const isTransport = (serviceData as any)?.category_id === "cat_transport"
    const { total, commission } = resolveBookingCommission(booking, isTransport)

    await settlePaymentWithCommission(supabase, {
      vendorId: booking.vendor_id,
      totalAmount: total,
      commissionAmount: commission,
      adminId,
      bookingId,
      touristId: booking.tourist_id || null,
      currency: booking.currency || "UGX",
      reference: paymentRef,
    })
  }

  const baseUrl = (SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "")
  try {
    const res = await fetch(`${baseUrl}/functions/v1/send-booking-emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    })
    const bodyText = await res.text()
    if (!res.ok) {
      console.warn(
        "Worker: send-booking-emails failed",
        res.status,
        bodyText.slice(0, 500),
      )
    }
  } catch (e: any) {
    console.warn("Worker: send-booking-emails error", e?.message || e)
  }
}

async function processOrderFulfillment(supabase: any, job: QueueJob): Promise<void> {
  const orderId = job.source_id
  const reference = job.payload?.reference || `PMT_${orderId.slice(0, 8)}_${Date.now()}`

  const { data: order, error: orderFetchErr } = await supabase
    .from("orders")
    .select(
      "id, vendor_id, user_id, currency, total_amount, platform_fee, vendor_payout, status, reference, guest_name, guest_email, guest_phone"
    )
    .eq("id", orderId)
    .single()

  if (orderFetchErr || !order) throw new Error(`order-not-found:${orderId}`)

  assertOrderPaidForSettlement(order, orderId)
  const paymentRef = job.payload?.reference || order.reference || reference
  await assertMarzpayPaymentCompleted(supabase, { orderId, reference: paymentRef })

  const adminId = await getAdminProfileId(supabase)

  const { data: existingOrderTx, error: orderTxCheckErr } = await supabase
    .from("transactions")
    .select("id, payout_meta")
    .eq("reference", paymentRef)
    .eq("transaction_type", "payment")
    .maybeSingle()

  if (orderTxCheckErr) throw new Error(`order-tx-check-failed:${orderTxCheckErr.message}`)

  const orderWalletSettled = Boolean((existingOrderTx as any)?.payout_meta?.wallet_settlement)

  if (existingOrderTx && !orderWalletSettled) {
    const { data: backfillResult, error: backfillErr } = await supabase.rpc(
      "backfill_wallet_credits_for_order",
      { p_order_id: orderId, p_admin_id: adminId },
    )
    if (backfillErr) throw new Error(`order-wallet-backfill-failed:${backfillErr.message}`)
    if (!(backfillResult as any)?.success) {
      throw new Error(
        `order-wallet-backfill-failed:${(backfillResult as any)?.error || "unknown"}`,
      )
    }
  } else if (!existingOrderTx) {
    const total = Number(job.payload?.amount ?? order.total_amount ?? 0)
    const platformFee = Number(order.platform_fee ?? 0)
    const vendorPayout = order.vendor_payout != null ? Number(order.vendor_payout) : null
    const commission = platformFee > 0
      ? platformFee
      : vendorPayout != null
        ? Math.max(0, total - vendorPayout)
        : 0

    await settlePaymentWithCommission(supabase, {
      vendorId: order.vendor_id,
      totalAmount: total,
      commissionAmount: commission,
      adminId,
      bookingId: null,
      touristId: order.user_id || null,
      currency: order.currency || "UGX",
      reference: paymentRef,
    })
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

  // Item 2: Idempotency guards — if a prior run (or the webhook) already created
  // bookings/tickets for this payment, skip creation entirely on retry.
  const [{ data: existingBookingForRef }, { data: existingTicketForOrder }] = await Promise.all([
    supabase
      .from("bookings")
      .select("id")
      .eq("payment_reference", reference)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("tickets")
      .select("id")
      .eq("order_id", orderId)
      .limit(1)
      .maybeSingle(),
  ])

  const needsBookings = !existingBookingForRef
  const needsTickets  = !existingTicketForOrder

  if (!needsBookings && !needsTickets) {
    // Both already exist — fulfillment was completed by a prior run, nothing to do.
    console.log("Worker: fulfillment already complete for order", orderId, "— skipping booking/ticket creation")
  } else {
    await Promise.all([
      ...(needsBookings
        ? Object.keys(groups).map(async (sid) => {
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
          })
        : []),
      ...(needsTickets
        ? items.map(async (it: any) => {
            const { count: existingCount } = await supabase
              .from("tickets")
              .select("id", { count: "exact", head: true })
              .eq("order_id", orderId)
              .eq("ticket_type_id", it.ticket_type_id)

            if ((existingCount ?? 0) >= it.quantity) {
              console.log(
                "Worker: tickets already issued for order",
                orderId,
                "type",
                it.ticket_type_id,
              )
              return
            }

            const { data: bookData, error: bookErr } = await supabase.rpc("book_tickets_atomic", {
              p_ticket_type_id: it.ticket_type_id,
              p_quantity: it.quantity,
              p_order_id: orderId,
            })
            if (bookErr || !(bookData as any)?.success) {
              throw new Error(
                `ticket-book-failed:${it.ticket_type_id}:${bookErr?.message || (bookData as any)?.error || "unknown"}`
              )
            }
            if ((bookData as any)?.idempotent) {
              console.log(
                "Worker: book_tickets_atomic idempotent success for",
                orderId,
                it.ticket_type_id,
              )
            }
          })
        : []),
    ])
  }

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
    fetch(`${baseUrl}/functions/v1/send-order-emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ order_id: orderId, recipient_email: recipientEmail }),
    }).catch((e) => console.warn("Worker: send-order-emails error", e?.message || e))
  }
}

/** True when every order_item quantity has a matching ticket row (delivery succeeded). */
async function isOrderFulfillmentDelivered(supabase: any, orderId: string): Promise<boolean> {
  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("quantity")
    .eq("order_id", orderId)

  if (itemsErr || !items?.length) return false

  const expectedTickets = items.reduce(
    (sum: number, it: { quantity?: number }) => sum + Number(it.quantity || 0),
    0,
  )
  if (expectedTickets <= 0) return false

  const { count, error: countErr } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)

  if (countErr) return false
  return (count ?? 0) >= expectedTickets
}

async function markFulfillmentJobCompleted(supabase: any, jobId: string): Promise<void> {
  await supabase
    .from("payment_fulfillment_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
}

// ── Per-job executor: runs job, writes outcome back to DB ─────────────────────
async function runJob(supabase: any, job: QueueJob): Promise<JobOutcome> {
  try {
    if (job.job_type === "booking_fulfillment") {
      await processBookingFulfillment(supabase, job)
    } else if (job.job_type === "order_fulfillment") {
      await processOrderFulfillment(supabase, job)
    } else {
      throw new Error(`unknown-job-type:${job.job_type}`)
    }

    await supabase
      .from("payment_fulfillment_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)

    return { id: job.id, outcome: "completed" }
  } catch (e: any) {
    const errMsg = e?.message || String(e)

    if (job.job_type === "order_fulfillment") {
      const delivered = await isOrderFulfillmentDelivered(supabase, job.source_id)
      if (delivered) {
        console.warn(
          "Worker: order_fulfillment threw after tickets delivered — marking completed",
          job.source_id,
          errMsg,
        )
        await markFulfillmentJobCompleted(supabase, job.id)
        return { id: job.id, outcome: "completed" }
      }
    }

    const maxAttempts = Number(job.max_attempts || 6)

    if (job.attempts >= maxAttempts) {
      await supabase
        .from("payment_fulfillment_jobs")
        .update({ status: "failed", last_error: errMsg, updated_at: new Date().toISOString() })
        .eq("id", job.id)
      await notifyFulfillmentJobFailed(job, errMsg)
      return { id: job.id, outcome: "failed", error: errMsg }
    }

    const delayMs = nextRetryDelayMinutes(job.attempts) * 60_000
    const nextTime = new Date(Date.now() + delayMs).toISOString()
    await supabase
      .from("payment_fulfillment_jobs")
      .update({
        status: "pending",
        last_error: errMsg,
        scheduled_for: nextTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
    return { id: job.id, outcome: "retrying", error: errMsg }
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
  const batchSize = Math.max(1, Math.min(20, Number(body?.batch_size || 10)))
  const workerStart = Date.now()

  // ── Claim jobs atomically via DB function (FOR UPDATE SKIP LOCKED) ──────
  // Prevents two concurrent workers (webhook + pg_cron) from double-processing.
  const { data: claimedJobs, error: claimErr } = await supabase.rpc("claim_payment_jobs", {
    p_batch_size: batchSize,
    p_source: body?.source || "webhook",
  })

  if (claimErr) {
    // Fallback: manual claim if claim_payment_jobs RPC not yet deployed
    console.warn("Worker: claim_payment_jobs RPC unavailable, using manual claim", claimErr.message)
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

    // Fall back to original sequential processing for safety
    let processed = 0, completed = 0, failed = 0
    for (const j of (jobs || []) as QueueJob[]) {
      const { data: claimed, error: claimRowErr } = await supabase
        .from("payment_fulfillment_jobs")
        .update({ status: "processing", started_at: new Date().toISOString(), attempts: (j.attempts || 0) + 1 })
        .eq("id", j.id)
        .eq("status", "pending")
        .select("id, job_type, source_id, payload, attempts, max_attempts")
        .maybeSingle()

      if (claimRowErr || !claimed) continue
      processed += 1
      const result = await runJob(supabase, claimed as QueueJob)
      if (result.outcome === "completed") completed++
      else if (result.outcome === "failed") failed++
    }
    return new Response(
      JSON.stringify({ success: true, scanned: (jobs || []).length, processed, completed, failed }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  const jobs = (claimedJobs || []) as QueueJob[]

  if (jobs.length === 0) {
    return new Response(
      JSON.stringify({ success: true, scanned: 0, processed: 0, completed: 0, failed: 0, retrying: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  // ── Deadline guard ────────────────────────────────────────────────────────
  if (Date.now() - workerStart > WORKER_DEADLINE_MS) {
    await supabase
      .from("payment_fulfillment_jobs")
      .update({ status: "pending", scheduled_for: new Date().toISOString() })
      .in("id", jobs.map((j) => j.id))
      .eq("status", "processing")

    return new Response(
      JSON.stringify({ success: false, error: "deadline_exceeded_before_processing" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  // ── Process all claimed jobs in PARALLEL ─────────────────────────────────
  // Promise.allSettled: one failure doesn't cancel other jobs in the batch.
  const settled = await Promise.allSettled(jobs.map((job) => runJob(supabase, job)))

  let completed = 0, failed = 0, retrying = 0
  for (const result of settled) {
    if (result.status === "fulfilled") {
      if (result.value.outcome === "completed") completed++
      else if (result.value.outcome === "failed") failed++
      else if (result.value.outcome === "retrying") retrying++
    } else {
      failed++
      console.error("Worker: unhandled runJob rejection", result.reason)
    }
  }

  // ── Self-chain if backlog remains and time budget allows ─────────────────
  const elapsed = Date.now() - workerStart
  if (jobs.length === batchSize && elapsed < WORKER_DEADLINE_MS - 30_000) {
    const baseUrl = (SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "")
    fetch(`${baseUrl}/functions/v1/process-payment-fulfillment-queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PROCESS_QUEUE_SECRET ? { "x-worker-secret": PROCESS_QUEUE_SECRET } : {}),
      },
      body: JSON.stringify({ batch_size: batchSize, source: "self-chain" }),
    }).catch((e) => console.warn("Worker: self-chain trigger failed", e?.message))
  }

  return new Response(
    JSON.stringify({
      success: true,
      scanned: jobs.length,
      processed: jobs.length,
      completed,
      failed,
      retrying,
      elapsed_ms: Date.now() - workerStart,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
})
