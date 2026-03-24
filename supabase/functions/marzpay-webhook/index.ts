import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const PROCESS_QUEUE_SECRET = Deno.env.get("PROCESS_QUEUE_SECRET") || ""

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
    return new Response(JSON.stringify({ success: false, error: "Missing transaction.reference" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  const reference = transaction.reference
  let paymentStatus = (transaction.status || "").toLowerCase()
  if (paymentStatus === "successful" || paymentStatus === "success") paymentStatus = "completed"
  else if (["failed", "cancelled", "rejected", "expired"].includes(paymentStatus)) paymentStatus = "failed"

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: payments, error: payErr } = await supabase
    .from("payments")
    .select("id, order_id, booking_id, amount, phone_number")
    .eq("reference", reference)

  const payment = payments?.[0]
  if (payErr || !payment) {
    console.log("Webhook: payment not found for reference", reference)
    return new Response(JSON.stringify({ success: true, message: "Payment not found, acknowledged" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
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

  // If this payment completed and is linked to a booking, mark the booking paid/confirmed
  if (paymentStatus === "completed" && payment.booking_id) {
    const bookingId = payment.booking_id
    try {
      const { data: booking, error: bookingFetchErr } = await supabase
        .from("bookings")
        .select("id, vendor_id, tourist_id, currency, total_amount, service_id")
        .eq("id", bookingId)
        .single()

      if (!booking || bookingFetchErr) {
        console.warn("Webhook: booking not found for payment.booking_id", bookingId)
      } else {
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
          console.warn("Webhook: failed to enqueue booking fulfillment job", bookingId, queueErr)
        }
      }
    } catch (err) {
      console.warn("Webhook: error handling booking-linked payment", err)
    }
  }

  if (paymentStatus === "completed" && payment.order_id) {
    const orderId = payment.order_id

    const { data: order, error: orderFetchErr } = await supabase
      .from("orders")
      .select("id, vendor_id, user_id, currency, guest_name, guest_email, guest_phone")
      .eq("id", orderId)
      .single()

    if (orderFetchErr || !order) {
      console.error("Webhook: order not found", orderId)
      return new Response(JSON.stringify({ success: true, reference, status: paymentStatus }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    await supabase
      .from("orders")
      .update({
        status: "paid",
        reference,
        payment_method: "mobile_money",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    try {
      await enqueueFulfillmentJob(supabase, "order_fulfillment", orderId, {
        reference,
        amount: Number(payment.amount || 0),
      })
      triggerQueueWorker()
    } catch (queueErr) {
      console.warn("Webhook: failed to enqueue order fulfillment job", orderId, queueErr)
    }
  }

  return new Response(JSON.stringify({ success: true, reference, status: paymentStatus }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
