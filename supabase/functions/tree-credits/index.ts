import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── tree-credits ─────────────────────────────────────────────────────────────
// Commercialization API for per-tree credits.
//
//   POST /tree-credits/purchase   buy a bulk credit batch (creates a payment row)
//   GET  /tree-credits/balance    remaining credits for a company
//   GET  /tree-credits/batches    purchase history
//   POST /tree-credits/consume    burn credits (plant/verify/monitor/report)
//   GET  /tree-credits/ledger     consumption ledger
//
// Auth: companies authenticate with their `dt_live_...` API key OR a user JWT
// for owner-scoped dashboard actions. Consumption via API key is intended for
// server-to-server integrations (they submit their own plantings).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// APP_URL may be a comma-separated list; use the first entry for deep links.
const APP_BASE = (Deno.env.get("APP_URL") || Deno.env.get("FRONTEND_URL") || "http://localhost:5173")
  .split(",")[0]
  .trim()

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://bookings.dirt-trails.com",
  "https://dirt-trails.com",
  "https://www.dirt-trails.com",
]

function buildCorsHeaders(req: Request): Record<string, string> {
  const requestOrigin = req.headers.get("origin") || ""
  const allowedOrigin = DEFAULT_CORS_ORIGINS.includes(requestOrigin) ? requestOrigin : DEFAULT_CORS_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-company-api-key",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
}

function json(status: number, body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  })
}

function generateReference(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Resolve the caller to a company_subscriptions row via API key or user JWT. */
async function resolveCompany(
  req: Request,
  supabase: ReturnType<typeof createClient>,
): Promise<{ company: Record<string, any>; mode: "api_key" | "jwt" } | { error: string; status: number }> {
  const apiKey =
    req.headers.get("x-company-api-key") ||
    new URL(req.url).searchParams.get("api_key") ||
    ""

  if (apiKey) {
    const { data, error } = await supabase
      .from("company_subscriptions")
      .select("*")
      .eq("api_key", apiKey)
      .maybeSingle()
    if (error || !data) return { error: "Invalid company API key", status: 401 }
    if ((data.status ?? "active") !== "active") return { error: "Company account suspended", status: 403 }
    return { company: data, mode: "api_key" }
  }

  const auth = req.headers.get("authorization") || ""
  const token = auth.replace(/^Bearer\s+/i, "")
  if (!token) return { error: "Missing x-company-api-key or Authorization header", status: 401 }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user) return { error: "Invalid auth token", status: 401 }

  const { data, error } = await supabase
    .from("company_subscriptions")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (error || !data) return { error: "No company account for this user", status: 404 }
  return { company: data, mode: "jwt" }
}

serve(async (req: Request) => {
  const CORS_HEADERS = buildCorsHeaders(req)

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })
  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { error: "Method not allowed" }, CORS_HEADERS)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const url = new URL(req.url)
    const path = url.pathname.replace(/\/tree-credits\/?/, "")

    // ── Public: pricing catalogue (no auth needed so the sales page can render)
    if (req.method === "GET" && path === "pricing") {
      const { data, error } = await supabase
        .from("pricing_catalogue")
        .select("*")
        .eq("active", true)
        .like("sku", "tree_credit%")
        .order("amount", { ascending: true })
      if (error) throw error
      return json(200, { success: true, data }, CORS_HEADERS)
    }

    // Everything else requires a company identity.
    const resolved = await resolveCompany(req, supabase)
    if ("error" in resolved) return json(resolved.status, { error: resolved.error }, CORS_HEADERS)
    const { company } = resolved

    // ── POST /purchase — create a pending credit batch + payment row
    if (req.method === "POST" && path === "purchase") {
      const body = await req.json()
      const sku = String(body?.sku || "tree_credit_starter")
      const credits = Number(body?.credits || 0)

      if (!Number.isFinite(credits) || credits <= 0) {
        return json(400, { error: "credits must be a positive number" }, CORS_HEADERS)
      }

      // Pick the cheapest SKU the requested volume qualifies for, so a buyer
      // ordering 1,000 credits automatically moves to the growth price instead
      // of silently paying the starter rate.
      const { data: creditPrices, error: pricesError } = await supabase
        .from("pricing_catalogue")
        .select("*")
        .eq("active", true)
        .like("sku", "tree_credit%")
      if (pricesError) throw pricesError

      const requested = (creditPrices || []).find((p) => p.sku === sku)
      if (!requested) {
        return json(400, { error: `Unknown or inactive credit sku: ${sku}` }, CORS_HEADERS)
      }

      let price = requested
      for (const candidate of creditPrices || []) {
        if (credits < Number(candidate.min_quantity)) continue
        if (candidate.max_quantity && credits > Number(candidate.max_quantity)) continue
        if (Number(candidate.amount) < Number(price.amount)) price = candidate
      }

      if (credits < Number(price.min_quantity)) {
        return json(400, {
          error: `${price.name} requires a minimum of ${price.min_quantity} credits`,
        }, CORS_HEADERS)
      }

      // Server-side pricing — never trust the client amount.
      const total = Number((credits * Number(price.amount)).toFixed(2))
      const currency = price.currency || "USD"
      const reference = generateReference()

      const { data: batch, error: batchError } = await supabase
        .from("tree_credit_batches")
        .insert({
          company_id: company.company_name,
          sku: price.sku,
          credits_purchased: credits,
          credits_remaining: credits,
          unit_price: Number(price.amount),
          total_amount: total,
          currency,
          status: "pending",
          reference,
          metadata: { sku_name: price.name },
        })
        .select("*")
        .single()
      if (batchError) throw batchError

      // Reuse the existing payments table (status pending → completed by webhook).
      const { data: payment, error: payError } = await supabase
        .from("payments")
        .insert({
          user_id: company.owner_user_id,
          amount: total,
          reference,
          provider: "credit_batch",
          status: "pending",
          phone_number: null,
          marzpay_response: {
            type: "tree_credit_batch",
            batch_id: batch.id,
            company_id: company.company_name,
            currency,
          },
        })
        .select("id, reference, status")
        .single()
      if (payError) throw payError

      await supabase
        .from("tree_credit_batches")
        .update({ payment_id: payment.id })
        .eq("id", batch.id)

      return json(200, {
        success: true,
        message: "Credit batch created — complete payment to activate",
        data: {
          batch_id: batch.id,
          reference: payment.reference,
          payment_id: payment.id,
          credits,
          total_amount: total,
          currency,
          unit_price: Number(price.amount),
          sku: price.sku,
          pay_url: `${APP_BASE}/conservation/credits/checkout?reference=${payment.reference}`,
        },
      }, CORS_HEADERS)
    }

    // ── GET /balance — remaining credits + expiry info
    if (req.method === "GET" && path === "balance") {
      const { data, error } = await supabase
        .from("tree_credit_batches")
        .select("id, credits_purchased, credits_remaining, unit_price, currency, expires_at, created_at, sku")
        .eq("company_id", company.company_name)
        .eq("status", "paid")
      if (error) throw error

      const now = Date.now()
      const active = (data || []).filter(
        (b) => !b.expires_at || new Date(b.expires_at).getTime() > now,
      )
      const remaining = active.reduce((s, b) => s + (b.credits_remaining || 0), 0)
      const oldestExpiry = active
        .filter((b) => b.expires_at)
        .map((b) => b.expires_at)
        .sort()[0] || null

      return json(200, {
        success: true,
        data: {
          company_id: company.company_name,
          credits_remaining: remaining,
          active_batches: active.length,
          oldest_expires_at: oldestExpiry,
          batches: active,
        },
      }, CORS_HEADERS)
    }

    // ── GET /batches — purchase history
    if (req.method === "GET" && path === "batches") {
      const { data, error } = await supabase
        .from("tree_credit_batches")
        .select("*")
        .eq("company_id", company.company_name)
        .order("created_at", { ascending: false })
        .limit(100)
      if (error) throw error
      return json(200, { success: true, data }, CORS_HEADERS)
    }

    // ── GET /ledger — consumption ledger
    if (req.method === "GET" && path === "ledger") {
      const { data, error } = await supabase
        .from("credit_consumptions")
        .select("*, trees(external_id, species, latitude, longitude)")
        .eq("company_id", company.company_name)
        .order("created_at", { ascending: false })
        .limit(200)
      if (error) throw error
      return json(200, { success: true, data }, CORS_HEADERS)
    }

    // ── POST /consume — burn credits for a planting/verification action
    if (req.method === "POST" && path === "consume") {
      const body = await req.json()
      const credits = Number(body?.credits || 1)
      const treeId = body?.tree_id ? String(body.tree_id) : null
      const action = ["plant", "verify", "monitor", "report"].includes(body?.action)
        ? body.action
        : "plant"

      const { data: burned, error } = await supabase.rpc("consume_tree_credits", {
        p_company_id: company.company_name,
        p_credits: credits,
        p_tree_id: treeId,
        p_action: action,
        p_note: body?.note ? String(body.note).slice(0, 500) : null,
      })
      if (error) {
        if (error.message.includes("insufficient")) {
          return json(402, { error: "Insufficient tree credits — purchase more to continue" }, CORS_HEADERS)
        }
        throw error
      }

      return json(200, {
        success: true,
        message: `Burned ${burned} credit(s)`,
        data: { credits_burned: burned, action, tree_id: treeId },
      }, CORS_HEADERS)
    }

    return json(404, { error: `Unknown route: ${path}` }, CORS_HEADERS)
  } catch (err) {
    console.error("tree-credits error:", err)
    return json(500, { error: (err as Error).message || "Internal server error" }, CORS_HEADERS)
  }
})
