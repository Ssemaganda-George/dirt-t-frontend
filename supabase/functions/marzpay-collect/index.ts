import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MARZPAY_API_URL = Deno.env.get("MARZPAY_API_URL") || "https://wallet.wearemarz.com/api/v1"
const MARZPAY_API_CREDENTIALS = Deno.env.get("MARZPAY_API_CREDENTIALS") || ""
const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("FRONTEND_URL") || "http://localhost:3000"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: string): boolean {
  return typeof value === "string" && UUID_REGEX.test(value.trim())
}

function generateReference(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// CRITICAL-3: Build CORS headers from an explicit allowlist — never reflect the request Origin.
// APP_URL may be a comma-separated list for multi-domain setups.
function buildCorsHeaders(req: Request): Record<string, string> {
  const allowed = APP_URL.split(",").map((s) => s.trim()).filter(Boolean)
  const requestOrigin = req.headers.get("origin") || ""
  const allowedOrigin = allowed.includes(requestOrigin) ? requestOrigin : allowed[0]
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
}

serve(async (req) => {
  // CRITICAL-3 + CRITICAL-4: CORS headers built once, used consistently throughout.
  const CORS_HEADERS = buildCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  // CRITICAL-4: was referencing undefined `corsHeaders` (camelCase) — now consistently `CORS_HEADERS`.
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  try {
    if (!MARZPAY_API_CREDENTIALS) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured (MARZPAY_API_CREDENTIALS)" }),
        { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    let body: {
      amount: number
      phone_number: string
      order_id?: string
      booking_id?: string
      description?: string
      user_id?: string
      metadata?: { type?: string; reference?: string }
    }
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    const { amount, phone_number, order_id, booking_id, description, user_id, metadata } = body
    if (!amount || !phone_number) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, phone_number" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    const isWalletTopup = metadata?.type === "wallet_topup"
    if (!order_id && !booking_id && !isWalletTopup) {
      return new Response(
        JSON.stringify({ error: "Missing required field: order_id or booking_id" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    let formattedPhone = String(phone_number).trim()
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.replace(/^0/, "")
      formattedPhone = `+256${formattedPhone}`
    }
    if (!/^\+256[0-9]{9}$/.test(formattedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Use 10 digits e.g. 0712345678 or +256712345678" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }
    const prefix = formattedPhone.charAt(4)
    if (!["7", "3"].includes(prefix)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone. Must be (07...) or (03...)" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    const paymentOrderId = order_id && isValidUUID(order_id) ? order_id : null
    const paymentBookingId = booking_id && isValidUUID(booking_id) ? booking_id : null
    const paymentUserId = user_id && isValidUUID(user_id) ? user_id : null

    // Supabase client created once and reused for all pre-payment checks + insert.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── Order-scoped pre-payment guards ─────────────────────────────────────
    if (paymentOrderId) {
      // HIGH-5: Deduplication — return existing in-flight payment for this order.
      // Prevents duplicate charges when user double-clicks or browser retries.
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id, reference, status, amount")
        .eq("order_id", paymentOrderId)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingPayment) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment already in progress",
            data: {
              payment_id: existingPayment.id,
              reference: existingPayment.reference,
              status: existingPayment.status,
              amount: existingPayment.amount,
              provider: "existing",
            },
          }),
          { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        )
      }

      // HIGH-2: Rate limiting — cap total payment attempts per order at 5.
      const { count: attemptCount } = await supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("order_id", paymentOrderId)

      if ((attemptCount ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ error: "Too many payment attempts for this order. Please contact support." }),
          { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        )
      }

      // HIGH-1: Server-side order validation — verify order exists and is payable.
      const { data: order } = await supabase
        .from("orders")
        .select("id, total_amount, status")
        .eq("id", paymentOrderId)
        .single()

      if (!order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        )
      }

      if (!["pending", "processing"].includes(order.status ?? "")) {
        return new Response(
          JSON.stringify({ error: "Order is no longer payable" }),
          { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        )
      }

      // HIGH-1: Amount validation — reject if client amount differs from stored total by >1 UGX.
      if (order.total_amount != null) {
        const serverAmount = Math.round(Number(order.total_amount))
        const clientAmount = Math.round(Number(amount))
        if (Math.abs(serverAmount - clientAmount) > 1) {
          console.warn("marzpay-collect: amount mismatch", {
            serverAmount,
            clientAmount,
            orderId: paymentOrderId,
          })
          return new Response(
            JSON.stringify({ error: "Payment amount does not match order total" }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          )
        }
      }

      // CRITICAL-5: Inventory check — verify ticket availability before charging the user.
      // This is the reservation gate: if tickets are sold out the payment is aborted here,
      // not discovered after the user has already paid.
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("ticket_type_id, quantity")
        .eq("order_id", paymentOrderId)

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (!item.ticket_type_id || !item.quantity) continue
          const { data: tt } = await supabase
            .from("ticket_types")
            .select("id, available_quantity, capacity")
            .eq("id", item.ticket_type_id)
            .single()

          if (!tt) continue

          const available = tt.available_quantity ?? tt.capacity ?? null
          if (available !== null && available < item.quantity) {
            return new Response(
              JSON.stringify({
                error: "Not enough tickets available. Please reduce your quantity and try again.",
              }),
              { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            )
          }
        }
      }
    }

    // ── Initiate payment with MarzPay ────────────────────────────────────────
    const reference = generateReference()
    const supabaseBase = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "")
    const webhookSecret = Deno.env.get("MARZPAY_WEBHOOK_SECRET") || ""
    // Embed secret in callback URL so marzpay-webhook can verify origin.
    const webhookUrl = webhookSecret
      ? `${supabaseBase}/functions/v1/marzpay-webhook?secret=${encodeURIComponent(webhookSecret)}`
      : `${supabaseBase}/functions/v1/marzpay-webhook`

    let paymentDescription = description
    if (!paymentDescription) {
      if (isWalletTopup) {
        paymentDescription = `Wallet top-up${metadata?.reference ? ` - ${metadata.reference}` : ""}`
      } else if (order_id) {
        paymentDescription = `Order #${order_id} payment`
      } else {
        paymentDescription = `Booking #${booking_id} payment`
      }
    }

    const marzpayRequest = {
      amount: parseInt(String(amount), 10),
      phone_number: formattedPhone,
      country: "UG",
      reference,
      description: paymentDescription,
      callback_url: webhookUrl,
    }

    const marzpayResponse = await fetch(`${MARZPAY_API_URL}/collect-money`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${MARZPAY_API_CREDENTIALS}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(marzpayRequest),
    })

    const responseText = await marzpayResponse.text()
    let marzpayData: any
    try {
      marzpayData = JSON.parse(responseText)
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid response from payment service" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    if (!marzpayResponse.ok) {
      const msg = marzpayData.message || marzpayData.error || "Payment initiation failed"
      return new Response(
        JSON.stringify({ error: msg, details: marzpayData.errors || marzpayData.details }),
        {
          status: marzpayResponse.status === 422 ? 422 : 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      )
    }

    if (marzpayData.status !== "success") {
      return new Response(
        JSON.stringify({ error: marzpayData.message || "Payment initiation failed" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    const transactionData = marzpayData.data?.transaction || {}
    const collectionData = marzpayData.data?.collection || {}
    const amountData = collectionData.amount || {}
    let paymentStatus = (transactionData.status || "pending").toLowerCase()
    if (paymentStatus === "successful") paymentStatus = "completed"
    else if (paymentStatus === "failed" || paymentStatus === "cancelled") paymentStatus = "failed"
    else if (paymentStatus !== "processing") paymentStatus = "processing"

    const provider = (collectionData.provider || "mtn").toLowerCase().includes("airtel")
      ? "airtel"
      : "mtn"

    const amountInt = amountData.raw ?? parseInt(String(amount), 10)
    const ref = transactionData.reference || reference

    const { data: paymentRow, error: insertError } = await supabase
      .from("payments")
      .insert({
        ...(paymentOrderId ? { order_id: paymentOrderId } : {}),
        ...(paymentBookingId ? { booking_id: paymentBookingId } : {}),
        user_id: paymentUserId,
        amount: amountInt,
        phone_number: formattedPhone,
        reference: ref,
        provider,
        status: paymentStatus,
        transaction_uuid: transactionData.uuid || null,
        provider_reference: transactionData.provider_reference || null,
        marzpay_response: marzpayData,
      })
      .select("id, reference, status")
      .single()

    if (insertError) {
      console.error("Payment insert error:", insertError)
      return new Response(
        JSON.stringify({ error: "Failed to store payment" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: marzpayData.message || "Payment initiated",
        data: {
          payment_id: paymentRow?.id,
          reference: paymentRow?.reference || ref,
          status: paymentRow?.status || paymentStatus,
          amount: amountInt,
          provider,
        },
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("marzpay-collect error:", err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  }
})
