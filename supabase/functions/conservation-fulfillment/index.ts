import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── conservation-fulfillment ────────────────────────────────────────────────
// Internal service-role function that activates commercialization purchases
// once payment is confirmed. Called by marzpay-webhook (or the reconcile job)
// after a payment reaches `completed`.
//
//   POST /conservation-fulfillment { reference, status }
//
// Behavior:
//   * tree credit batch  → status paid (credits become spendable)
//   * carbon offset order → status retired + certificate number + ledger entry
//
// Idempotent: re-processing a reference is a no-op.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

function generateCertificateNumber(): string {
  const year = new Date().getFullYear()
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
  return `DT-OFFSET-${year}-${rand}`
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })
  if (req.method !== "POST") return json(405, { error: "Method not allowed" })

  // Guard: this is an internal function. Verify the caller actually holds
  // service-role privileges by attempting a privileged admin call with the
  // presented key. Works for both the legacy JWT and the new-format secret
  // key, and does not depend on the two functions sharing an identical env var.
  const auth = req.headers.get("authorization") || ""
  const presented = auth.replace(/^Bearer\s+/i, "").trim()
  if (!presented) {
    return json(401, { error: "Unauthorized" })
  }

  const probe = createClient(SUPABASE_URL, presented)
  const { error: probeErr } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (probeErr) {
    console.warn("conservation-fulfillment: caller is not service-role")
    return json(401, { error: "Unauthorized" })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const body = await req.json()
    const reference = String(body?.reference || "").trim()
    const status = String(body?.status || "completed").toLowerCase()

    if (!reference) return json(400, { error: "reference is required" })

    const { data: payment, error: payError } = await supabase
      .from("payments")
      .select("id, status, amount, marzpay_response")
      .eq("reference", reference)
      .maybeSingle()
    if (payError) throw payError
    if (!payment) return json(404, { error: "Payment not found" })

    const meta = (payment.marzpay_response || {}) as Record<string, any>
    const paid = status === "completed" || status === "successful" || status === "success"

    // ── Tree credit batch activation ───────────────────────────────────────
    if (meta.type === "tree_credit_batch" && meta.batch_id) {
      if (!paid) {
        await supabase
          .from("tree_credit_batches")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", meta.batch_id)
        return json(200, { success: true, message: "Credit batch marked failed", reference })
      }

      const { data: batch } = await supabase
        .from("tree_credit_batches")
        .select("*")
        .eq("id", meta.batch_id)
        .maybeSingle()

      if (!batch) return json(404, { error: "Credit batch not found" })
      if (batch.status === "paid") {
        return json(200, { success: true, message: "Already activated", reference })
      }

      await supabase
        .from("tree_credit_batches")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", meta.batch_id)

      return json(200, {
        success: true,
        message: `Activated ${batch.credits_purchased} tree credits`,
        reference,
      })
    }

    // ── Carbon offset retirement ───────────────────────────────────────────
    if (meta.type === "carbon_offset_order" && meta.order_id) {
      if (!paid) {
        await supabase
          .from("carbon_offset_orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", meta.order_id)
        return json(200, { success: true, message: "Offset order marked failed", reference })
      }

      const { data: order } = await supabase
        .from("carbon_offset_orders")
        .select("*")
        .eq("id", meta.order_id)
        .maybeSingle()

      if (!order) return json(404, { error: "Offset order not found" })
      if (order.status === "retired" || order.status === "paid") {
        return json(200, {
          success: true,
          message: "Already retired",
          reference,
          certificate_number: order.certificate_number,
        })
      }

      const certificate = generateCertificateNumber()
      const retiredAt = new Date().toISOString()

      await supabase
        .from("carbon_offset_orders")
        .update({
          status: "retired",
          certificate_number: certificate,
          certificate_url: `${(Deno.env.get("APP_URL") || "https://dirt-trails.com").split(",")[0].trim()}/conservation/offsets/certificate?reference=${reference}`,
          retired_at: retiredAt,
          updated_at: retiredAt,
        })
        .eq("id", meta.order_id)

      await supabase.from("carbon_ledger").insert({
        order_id: order.id,
        company_id: order.company_id,
        entry_type: "retired",
        tonnes_co2e: order.tonnes_co2e,
        balance_after: order.tonnes_co2e,
        reference: order.reference,
        note: `Retired against certificate ${certificate}`,
      })

      return json(200, {
        success: true,
        message: `Retired ${order.tonnes_co2e} tonnes CO2e`,
        reference,
        certificate_number: certificate,
      })
    }

    return json(200, { success: true, message: "No conservation action for this payment", reference })
  } catch (err) {
    console.error("conservation-fulfillment error:", err)
    return json(500, { error: (err as Error).message || "Internal server error" })
  }
})
