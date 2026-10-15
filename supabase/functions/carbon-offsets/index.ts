import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── carbon-offsets ───────────────────────────────────────────────────────────
// Commercialization API for verified carbon offset purchases (per tonne CO2e).
//
//   POST /carbon-offsets/purchase     create an offset order (creates payment row)
//   GET  /carbon-offsets/pricing      per-tonne pricing with volume tiers
//   GET  /carbon-offsets/orders       order history for the caller
//   GET  /carbon-offsets/certificate?reference=...  fetch a retirement certificate
//   GET  /carbon-offsets/ledger       issuance / retirement ledger
//   GET  /carbon-offsets/impact       aggregate impact stats for ESG reporting
//
// Conversion: 1 tonne CO2e ≈ 45.5 trees at 22 kg/tree/yr over a 10-year horizon.

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

const KG_PER_TREE_YEAR = 22
const OFFSET_HORIZON_YEARS = 10
const TREES_PER_TONNE = Math.round((1000 / (KG_PER_TREE_YEAR * OFFSET_HORIZON_YEARS)) * 10) / 10

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
  return "otx-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function generateCertificateNumber(): string {
  const year = new Date().getFullYear()
  const rand = encodeURIComponent(crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase())
  return `DT-OFFSET-${year}-${rand}`
}

type Caller =
  | { company: Record<string, any> | null; userId: string | null; email: string | null }
  | { error: string; status: number }

async function resolveCaller(
  req: Request,
  supabase: ReturnType<typeof createClient>,
): Promise<Caller> {
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
    return { company: data, userId: data.owner_user_id, email: data.contact_email }
  }

  const auth = req.headers.get("authorization") || ""
  const token = auth.replace(/^Bearer\s+/i, "")
  if (!token) {
    // Guest checkout is allowed: they just supply an email on the body.
    return { company: null, userId: null, email: null }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token)
  if (userError || !user) return { company: null, userId: null, email: null }

  const { data } = await supabase
    .from("company_subscriptions")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  return { company: data || null, userId: user.id, email: user.email || null }
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
    const path = url.pathname.replace(/\/carbon-offsets\/?/, "")

    // ── GET /pricing — public so the sales page renders without auth
    if (req.method === "GET" && path === "pricing") {
      const { data, error } = await supabase
        .from("pricing_catalogue")
        .select("*")
        .eq("active", true)
        .like("sku", "carbon_offset%")
        .order("amount", { ascending: true })
      if (error) throw error
      return json(200, {
        success: true,
        data,
        meta: { kg_per_tree_year: KG_PER_TREE_YEAR, horizon_years: OFFSET_HORIZON_YEARS, trees_per_tonne: TREES_PER_TONNE },
      }, CORS_HEADERS)
    }

    // ── POST /purchase — create a pending order + payment row
    if (req.method === "POST" && (path === "purchase" || path === "")) {
      const caller = await resolveCaller(req, supabase)
      if ("error" in caller) return json(caller.status, { error: caller.error }, CORS_HEADERS)

      const body = await req.json()
      const tonnes = Number(body?.tonnes_co2e ?? body?.tonnes ?? 0)
      const sku = String(body?.sku || "carbon_offset_tonne")
      const email = String(body?.buyer_email || caller.email || "").trim()

      if (!Number.isFinite(tonnes) || tonnes <= 0) {
        return json(400, { error: "tonnes_co2e must be a positive number" }, CORS_HEADERS)
      }
      if (!email) {
        return json(400, { error: "buyer_email is required for a certificate" }, CORS_HEADERS)
      }

      // Pick the cheapest SKU the requested volume qualifies for. A buyer who
      // orders 100 tonnes is automatically moved to the bulk price, and a buyer
      // who orders below a SKU's minimum is dropped back to the base price.
      const { data: offsetPrices, error: pricesError } = await supabase
        .from("pricing_catalogue")
        .select("*")
        .eq("active", true)
        .like("sku", "carbon_offset%")
      if (pricesError) throw pricesError

      const requestedPrice = (offsetPrices || []).find((p) => p.sku === sku)
      if (!requestedPrice) {
        return json(400, { error: `Unknown or inactive offset sku: ${sku}` }, CORS_HEADERS)
      }

      let effectivePrice = requestedPrice
      for (const candidate of offsetPrices || []) {
        // Only consider candidates the volume qualifies for, then take the
        // lowest amount so the buyer always gets the best price they earned.
        if (tonnes < Number(candidate.min_quantity)) continue
        if (!candidate.max_quantity || tonnes <= Number(candidate.max_quantity)) {
          if (Number(candidate.amount) < Number(effectivePrice.amount)) {
            effectivePrice = candidate
          }
        }
      }
      const effectiveSku = effectivePrice.sku

      // Server-side pricing — never trust a client-supplied amount.
      const total = Number((tonnes * Number(effectivePrice.amount)).toFixed(2))
      const currency = effectivePrice.currency || "USD"
      const reference = generateReference()
      const treesEq = Math.max(1, Math.ceil(tonnes * TREES_PER_TONNE))

  const { data: order, error: orderError } = await supabase
    .from("carbon_offset_orders")
    .insert({
      company_id: caller.company?.company_name ?? null,
      buyer_user_id: caller.userId,
      buyer_email: email,
      sku: effectiveSku,
      tonnes_co2e: tonnes,
      unit_price: Number(effectivePrice.amount),
      total_amount: total,
      currency,
      trees_equivalent: treesEq,
      status: "pending",
      reference,
      project_description:
        "DirtTrails verified reforestation — native species planting in Uganda with GPS geotagging and ranger monitoring",
      metadata: { price_sku: effectivePrice.sku, price_name: effectivePrice.name },
    })
    .select("*")
    .single()
  if (orderError) throw orderError

  const { data: payment, error: payError } = await supabase
    .from("payments")
    .insert({
      user_id: caller.userId,
      amount: total,
      reference,
      provider: "carbon_offset",
      status: "pending",
      phone_number: null,
      marzpay_response: {
        type: "carbon_offset_order",
        order_id: order.id,
        company_id: caller.company?.company_name ?? null,
        tonnes_co2e: tonnes,
        currency,
      },
    })
    .select("id, reference, status")
    .single()
      if (payError) throw payError

      await supabase
        .from("carbon_offset_orders")
        .update({ payment_id: payment.id })
        .eq("id", order.id)

      return json(200, {
        success: true,
        message: "Offset order created — complete payment to retire the tonnes",
        data: {
          order_id: order.id,
          reference: payment.reference,
          payment_id: payment.id,
          tonnes_co2e: tonnes,
          total_amount: total,
          currency,
          unit_price: Number(effectivePrice.amount),
          trees_equivalent: treesEq,
          sku: effectiveSku,
          pay_url: `${APP_BASE}/conservation/offsets/checkout?reference=${payment.reference}`,
        },
      }, CORS_HEADERS)
    }

    // ── Authenticated routes below ──────────────────────────────────────────
    const caller = await resolveCaller(req, supabase)
    if ("error" in caller) return json(caller.status, { error: caller.error }, CORS_HEADERS)

    // ── GET /orders
    if (req.method === "GET" && path === "orders") {
      let query = supabase
        .from("carbon_offset_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
      if (caller.company) query = query.eq("company_id", caller.company.company_name)
      else if (caller.userId) query = query.eq("buyer_user_id", caller.userId)
      else return json(401, { error: "Authentication required" }, CORS_HEADERS)

      const { data, error } = await query
      if (error) throw error
      return json(200, { success: true, data }, CORS_HEADERS)
    }

    // ── GET /certificate — public via reference so buyers can share it
    if (req.method === "GET" && path === "certificate") {
      const reference = url.searchParams.get("reference") || ""
      if (!reference) return json(400, { error: "reference is required" }, CORS_HEADERS)

      const { data, error } = await supabase
        .from("carbon_offset_orders")
        .select("*")
        .or(`reference.eq.${reference},certificate_number.eq.${reference}`)
        .maybeSingle()
      if (error) throw error
      if (!data) return json(404, { error: "Certificate not found" }, CORS_HEADERS)

      return json(200, {
        success: true,
        data: {
          certificate_number: data.certificate_number || null,
          status: data.status,
          tonnes_co2e: data.tonnes_co2e,
          buyer_email: data.buyer_email,
          trees_equivalent: data.trees_equivalent,
          project_description: data.project_description,
          retired_at: data.retired_at,
          currency: data.currency,
          total_amount: data.total_amount,
          trees: data.certificate_number
            ? (
                await supabase
                  .from("trees")
                  .select("external_id, species, latitude, longitude, planted_on")
                  .eq("company_id", data.company_id)
                  .limit(50)
              ).data || []
            : [],
        },
      }, CORS_HEADERS)
    }

    // ── GET /ledger
    if (req.method === "GET" && path === "ledger") {
      let query = supabase
        .from("carbon_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
      if (caller.company) query = query.eq("company_id", caller.company.company_name)
      else if (caller.userId) {
        const { data: orders } = await supabase
          .from("carbon_offset_orders")
          .select("id")
          .eq("buyer_user_id", caller.userId)
        query = query.in("order_id", (orders || []).map((o) => o.id))
      } else return json(401, { error: "Authentication required" }, CORS_HEADERS)

      const { data, error } = await query
      if (error) throw error
      return json(200, { success: true, data }, CORS_HEADERS)
    }

    // ── GET /impact — aggregate stats for ESG reporting
    if (req.method === "GET" && path === "impact") {
      const from = url.searchParams.get("from")
      const to = url.searchParams.get("to")

      let treesQuery = supabase.from("trees").select("id", { count: "exact", head: true })
      let ordersQuery = supabase
        .from("carbon_offset_orders")
        .select("tonnes_co2e, created_at")
        .in("status", ["paid", "retired"])
      if (caller.company) {
        treesQuery = treesQuery.eq("company_id", caller.company.company_name)
        ordersQuery = ordersQuery.eq("company_id", caller.company.company_name)
      } else if (caller.userId) {
        ordersQuery = ordersQuery.eq("buyer_user_id", caller.userId)
      }
      if (from) {
        treesQuery = treesQuery.gte("created_at", from)
        ordersQuery = ordersQuery.gte("created_at", from)
      }
      if (to) {
        treesQuery = treesQuery.lte("created_at", to)
        ordersQuery = ordersQuery.lte("created_at", to)
      }

      const [{ count: treeCount }, { data: orders }] = await Promise.all([treesQuery, ordersQuery])
      const tonnes = (orders || []).reduce((s, o) => s + Number(o.tonnes_co2e || 0), 0)

      // Carbon removed to date by approved trees (21.77 kg/tree/yr, age-weighted).
      const { data: rows } = await supabase.rpc("company_carbon_stats", {
        p_company_id: caller.company?.company_name ?? null,
        p_from: from ?? null,
        p_to: to ?? null,
      })

      return json(200, {
        success: true,
        data: {
          trees: treeCount || 0,
          tonnes_retired: Number(tonnes.toFixed(3)),
          tonnes_certified: tonnes,
          trees_equivalent_offset: Math.ceil(tonnes * TREES_PER_TONNE),
          company: caller.company?.company_name ?? null,
          period: { from: from ?? null, to: to ?? null },
        },
      }, CORS_HEADERS)
    }

    return json(404, { error: `Unknown route: ${path}` }, CORS_HEADERS)
  } catch (err) {
    console.error("carbon-offsets error:", err)
    return json(500, { error: (err as Error).message || "Internal server error" }, CORS_HEADERS)
  }
})
