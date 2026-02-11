import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MARZPAY_API_URL = Deno.env.get("MARZPAY_API_URL") || "https://wallet.wearemarz.com/api/v1"
const MARZPAY_API_CREDENTIALS = Deno.env.get("MARZPAY_API_CREDENTIALS") || ""
const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("FRONTEND_URL") || "http://localhost:3000"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

function generateReference(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    if (!MARZPAY_API_CREDENTIALS) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured (MARZPAY_API_CREDENTIALS)" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let body: { amount: number; phone_number: string; order_id: string; description?: string; user_id?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { amount, phone_number, order_id, description, user_id } = body
    if (!amount || !phone_number || !order_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, phone_number, order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let formattedPhone = String(phone_number).trim()
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.replace(/^0/, "")
      formattedPhone = `+256${formattedPhone}`
    }
    if (!/^\+256[0-9]{9}$/.test(formattedPhone)) {
      return new Response(
        JSON.stringify({
          error: "Invalid phone number. Use 10 digits e.g. 0712345678 or +256712345678",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    const prefix = formattedPhone.charAt(4)
    if (!["7", "3"].includes(prefix)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone. Must be (07...) or (03...)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const reference = generateReference()
    const supabaseUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "")
    const webhookUrl = `${supabaseUrl}/functions/v1/marzpay-webhook`
    const marzpayRequest = {
      amount: parseInt(String(amount), 10),
      phone_number: formattedPhone,
      country: "UG",
      reference,
      description: description || `Order #${order_id} payment`,
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!marzpayResponse.ok) {
      const msg = marzpayData.message || marzpayData.error || "Payment initiation failed"
      return new Response(
        JSON.stringify({ error: msg, details: marzpayData.errors || marzpayData.details }),
        {
          status: marzpayResponse.status === 422 ? 422 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (marzpayData.status !== "success") {
      return new Response(
        JSON.stringify({ error: marzpayData.message || "Payment initiation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: paymentRow, error: insertError } = await supabase
      .from("payments")
      .insert({
        order_id: order_id,
        user_id: user_id || null,
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("marzpay-collect error:", err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
