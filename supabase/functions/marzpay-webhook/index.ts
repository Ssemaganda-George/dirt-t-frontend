import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const PROCESS_QUEUE_SECRET = Deno.env.get("PROCESS_QUEUE_SECRET") || ""
// CRITICAL-2: Secret set by marzpay-collect in the callback URL query param.
const MARZPAY_WEBHOOK_SECRET = Deno.env.get("MARZPAY_WEBHOOK_SECRET") || ""

const HIRER_TRANSPORT_FEE_RATE = 0.02
const PROVIDER_TRANSPORT_FEE_RATE = 0.02

async function enqueueFulfillmentJob(
  supabase: any,
  jobType: "booking_fulfillment" | "order_fulfillment",
  sourceId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const idempotencyKey = `${jobType}:${sourceId}:${payload.reference || ""}`
  const { error } = await supabase
    .from("payment_fulfillment_jobs")
    .upsert(
      {
        job_type: jobType,
        source_id: sourceId,
        payload,
        idempotency_key: idempotencyKey,
        status: "pending",
        scheduled_for: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" }
    )
  if (error) throw error
}

function triggerQueueWorker(): void {
  const baseUrl = (SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "")
  const workerUrl = `${baseUrl}/functions/v1/process-payment-fulfillment-queue`
  fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(PROCESS_QUEUE_SECRET ? { "x-worker-secret": PROCESS_QUEUE_SECRET } : {}),
    },
    body: JSON.stringify({ batch_size: 8 }),
  }).catch((e) => console.warn("Webhook: queue worker trigger failed", e?.message || e))
}

async function sendTelegramMessage(text: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")
  const chatRaw = Deno.env.get("TELEGRAM_CHAT_ID") || ""
  const chatIds = chatRaw.split(",").map((s) => s.trim()).filter(Boolean)
  if (!token || chatIds.length === 0) return
  await Promise.all(
    chatIds.map((id) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: id, text }),
      }).catch((e) => console.warn("Webhook: telegram send failed", e?.message || e))
    )
  )
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  // ── CRITICAL-2: Webhook secret verification ──────────────────────────────
  // The secret is embedded in the callback URL by marzpay-collect (?secret=...).
  // Set MARZPAY_WEBHOOK_SECRET in Supabase edge function secrets.
  // Without this any party could POST fabricated "completed" events to issue free tickets.
  if (MARZPAY_WEBHOOK_SECRET) {
    const url = new URL(req.url)
    const provided =
      url.searchParams.get("secret") || req.headers.get("x-webhook-secret") || ""
    if (provided !== MARZPAY_WEBHOOK_SECRET) {
      console.warn("Webhook: unauthorized request — invalid or missing secret")
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  let transaction = body.transaction
  if (body.data?.transaction) transaction = body.data.transaction

  if (!transaction?.reference) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing transaction.reference" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  const reference = transaction.reference
  let paymentStatus = (transaction.status || "").toLowerCase()
  if (paymentStatus === "successful" || paymentStatus === "success") paymentStatus = "completed"
  else if (["failed", "cancelled", "rejected", "expired"].includes(paymentStatus))
    paymentStatus = "failed"

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: payments, error: payErr } = await supabase
    .from("payments")
    .select("id, order_id, booking_id, amount, phone_number")
    .eq("reference", reference)

  const payment = payments?.[0]
  if (payErr || !payment) {
    console.log("Webhook: payment not found for reference", reference)
    return new Response(
      JSON.stringify({ success: true, message: "Payment not found, acknowledged" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  await supabase
    .from("payments")
    .update({
      status: paymentStatus,
      transaction_uuid: transaction.uuid || null,
      provider_reference: transaction.provider_reference || null,
      webhook_data: body,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference)

  // ── Booking-linked payment (hotel / transport / activity bookings) ────────
  if (paymentStatus === "completed" && payment.booking_id) {
    const bookingId = payment.booking_id
    try {
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: "paid",
          payment_reference: reference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)

      // CRITICAL-1: booking/transaction creation is the queue worker's sole responsibility.
      // Do NOT call create_booking_atomic or book_tickets_atomic here — the queue worker
      // handles fulfillment with idempotency guards, preventing double-issuance.
      try {
        await enqueueFulfillmentJob(supabase, "booking_fulfillment", bookingId, {
          reference,
          amount: Number(payment.amount || 0),
          transport_fee_rates: {
            hirer: HIRER_TRANSPORT_FEE_RATE,
            provider: PROVIDER_TRANSPORT_FEE_RATE,
          },
        })
        triggerQueueWorker()
      } catch (queueErr) {
        console.warn(
          "Webhook: failed to enqueue booking fulfillment job",
          bookingId,
          queueErr
        )
      }
    } catch (err) {
      console.warn("Webhook: error handling booking-linked payment", err)
    }
  }

  // ── Transport fallback: payment completed before booking was linked ───────
  if (paymentStatus === "completed" && !payment.booking_id && !payment.order_id) {
    try {
      const { data: bookingByReference, error: bookingByRefErr } = await supabase
        .from("bookings")
        .select("id")
        .eq("payment_reference", reference)
        .maybeSingle()

      if (bookingByRefErr) {
        console.warn(
          "Webhook: booking lookup by payment_reference failed",
          reference,
          bookingByRefErr
        )
      } else if (bookingByReference?.id) {
        const bookingId = bookingByReference.id

        await supabase
          .from("payments")
          .update({ booking_id: bookingId, updated_at: new Date().toISOString() })
          .eq("id", payment.id)

        await supabase
          .from("bookings")
          .update({
            status: "confirmed",
            payment_status: "paid",
            payment_reference: reference,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)

        try {
          await enqueueFulfillmentJob(supabase, "booking_fulfillment", bookingId, {
            reference,
            amount: Number(payment.amount || 0),
            transport_fee_rates: {
              hirer: HIRER_TRANSPORT_FEE_RATE,
              provider: PROVIDER_TRANSPORT_FEE_RATE,
            },
          })
          triggerQueueWorker()
        } catch (queueErr) {
          console.warn(
            "Webhook: failed to enqueue fallback booking fulfillment job",
            bookingId,
            queueErr
          )
        }
      }
    } catch (err) {
      console.warn("Webhook: fallback payment_reference reconciliation failed", err)
    }
  }

  // ── Order-linked payment (event tickets) ─────────────────────────────────
  if (paymentStatus === "completed" && payment.order_id) {
    const orderId = payment.order_id

    // HIGH-3: Status precondition prevents webhook from reviving expired or already-paid orders.
    const { error: orderUpdateErr } = await supabase
      .from("orders")
      .update({
        status: "paid",
        reference,
        payment_method: "mobile_money",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .in("status", ["pending", "processing"])

    if (orderUpdateErr) {
      console.warn(
        "Webhook: order status update skipped (order already paid, expired, or not found)",
        orderId,
        orderUpdateErr.message
      )
    }

    // CRITICAL-1: ticket issuance delegated entirely to the queue worker.
    try {
      await enqueueFulfillmentJob(supabase, "order_fulfillment", orderId, {
        reference,
        amount: Number(payment.amount || 0),
      })
      triggerQueueWorker()
    } catch (queueErr) {
      console.warn("Webhook: failed to enqueue order fulfillment job", orderId, queueErr)
    }

    const collection = body?.collection ?? (transaction as any)?.collection
    const amountFmt = (collection?.amount as any)?.formatted || `${payment.amount} UGX`
    // LOW-3: phone number omitted from Telegram notification to avoid PII in chat logs.
    await sendTelegramMessage(
      `🎉 Payment completed\nOrder #${orderId}\nAmount: ${amountFmt}\nRef: ${reference}`
    )
  } else if (paymentStatus === "failed" && payment.order_id) {
    await sendTelegramMessage(
      `❌ Payment failed\nOrder #${payment.order_id}\nRef: ${reference}\nStatus: ${paymentStatus}`
    )
  }

  return new Response(
    JSON.stringify({ success: true, reference, status: paymentStatus }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
})
