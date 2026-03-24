import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || ""
const TELEGRAM_CHAT_IDS = (Deno.env.get("TELEGRAM_CHAT_ID") || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)

const HIRER_TRANSPORT_FEE_RATE = 0.02
const PROVIDER_TRANSPORT_FEE_RATE = 0.02

async function sendTelegramMessage(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_CHAT_IDS.length === 0) return
  await Promise.all(
    TELEGRAM_CHAT_IDS.map((chatId) =>
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      }).then((r) => r.json()).catch((e) => console.error("Telegram send error:", e.message))
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
  const collection = body.collection || body.data?.collection
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

        // Default behavior: provider receives the full paid amount.
        // Transport override: customer pays +2% and provider pays 2% from subtotal.
        // If total_amount includes customer fee (subtotal * 1.02),
        // provider payout = subtotal * 0.96.
        let providerCreditAmount = Number(payment.amount || 0)
        try {
          const { data: serviceData, error: serviceErr } = await supabase
            .from("services")
            .select("category_id")
            .eq("id", booking.service_id)
            .maybeSingle()

          if (serviceErr) {
            console.warn("Webhook: failed to fetch service category for booking", bookingId, serviceErr)
          } else {
            const isTransport = (serviceData as any)?.category_id === "cat_transport"
            if (isTransport) {
              const paidTotal = Number(booking.total_amount || payment.amount || 0)
              const subtotal = paidTotal / (1 + HIRER_TRANSPORT_FEE_RATE)
              providerCreditAmount = subtotal * (1 - PROVIDER_TRANSPORT_FEE_RATE)
            }
          }
        } catch (feeErr) {
          console.warn("Webhook: transport fee split calc failed, using default full credit amount", feeErr)
          providerCreditAmount = Number(payment.amount || 0)
        }

        try {
          await supabase.rpc("create_transaction_atomic", {
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
        } catch (txErr) {
          console.warn("Webhook: create_transaction_atomic failed for booking", bookingId, txErr)
        }

        // Trigger booking emails (use service role key)
        try {
          const baseUrl = (SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "")
          const sendBookingEmailsUrl = `${baseUrl}/functions/v1/send-booking-emails`
          fetch(sendBookingEmailsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ booking_id: bookingId }),
          })
            .then(async (res) => {
              if (!res.ok) {
                const text = await res.text()
                console.warn("Webhook: send-booking-emails failed", res.status, text)
              } else {
                console.log("Webhook: booking email triggered for", bookingId)
              }
            })
            .catch((e) => console.warn("Webhook: send-booking-emails error", e?.message))
        } catch (e) {
          console.warn("Webhook: failed to call send-booking-emails", e?.message)
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
      await supabase.rpc("create_transaction_atomic", {
        p_vendor_id: order.vendor_id,
        p_amount: payment.amount,
        p_transaction_type: "payment",
        p_booking_id: null,
        p_tourist_id: order.user_id || null,
        p_currency: order.currency || "UGX",
        p_status: "completed",
        p_payment_method: "mobile_money",
        p_reference: reference,
      })
    } catch (txErr) {
      console.warn("Webhook: create_transaction_atomic failed", txErr)
    }

    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("*, ticket_types(*)")
      .eq("order_id", orderId)

    if (!itemsErr && items && items.length > 0) {
      const groups: Record<string, { qty: number; total: number }> = {}
      for (const it of items) {
        const sid = (it as any).ticket_types?.service_id
        if (!sid) continue
        groups[sid] = groups[sid] || { qty: 0, total: 0 }
        groups[sid].qty += it.quantity
        groups[sid].total += Number(it.unit_price || 0) * it.quantity
      }

      // Run booking creation and ticket issuance in parallel — each service/ticket
      // type is independent, so there is no need to process them sequentially.
      const today = new Date().toISOString().slice(0, 10)

      await Promise.all([
        // Create one booking per service (in parallel)
        ...Object.keys(groups).map(async (sid) => {
          try {
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
          } catch (bkErr) {
            console.warn("Webhook: create booking failed for service", sid, bkErr)
          }
        }),

        // Issue tickets for each ticket type (in parallel)
        ...items.map(async (it: any) => {
          try {
            const { data: bookData, error: bookErr } = await supabase.rpc("book_tickets_atomic", {
              p_ticket_type_id: it.ticket_type_id,
              p_quantity: it.quantity,
              p_order_id: orderId,
            })
            if (bookErr || !(bookData as any)?.success) {
              console.warn("Webhook: book_tickets_atomic failed", it.ticket_type_id, bookErr || (bookData as any)?.error)
            }
          } catch (ticketErr) {
            console.warn("Webhook: ticket booking failed", ticketErr)
          }
        }),
      ])

      // Send ticket email to customer (order has guest_email; otherwise use profile email)
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
        })
          .then(async (res) => {
            if (!res.ok) {
              const text = await res.text()
              console.warn("Webhook: send-order-emails failed", res.status, text)
            } else {
              console.log("Webhook: ticket email sent to", recipientEmail)
            }
          })
          .catch((e) => console.warn("Webhook: send-order-emails error", e.message))
      } else {
        console.warn("Webhook: no recipient email for order", orderId, "- ticket email not sent")
      }
    }

    const amountFmt = (collection?.amount as any)?.formatted || `${payment.amount} UGX`
    await sendTelegramMessage(
      `🎉 Payment completed\nOrder #${orderId}\nAmount: ${amountFmt}\nPhone: ${payment.phone_number}\nRef: ${reference}`
    )
  } else if (paymentStatus === "failed" && payment.order_id) {
    await sendTelegramMessage(
      `❌ Payment failed\nOrder #${payment.order_id}\nRef: ${reference}\nStatus: ${paymentStatus}`
    )
  }

  return new Response(JSON.stringify({ success: true, reference, status: paymentStatus }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
