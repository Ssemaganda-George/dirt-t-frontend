import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const MARZPAY_API_URL = Deno.env.get("MARZPAY_API_URL") || "https://wallet.wearemarz.com/api/v1"
const MARZPAY_API_CREDENTIALS = Deno.env.get("MARZPAY_API_CREDENTIALS") || ""
const APP_URL = Deno.env.get("APP_URL") || Deno.env.get("FRONTEND_URL") || "http://localhost:3000"
const EXTRA_CORS_ORIGINS = Deno.env.get("EXTRA_CORS_ORIGINS") || ""
const DEFAULT_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://bookings.dirt-trails.com",
  "https://dirt-trails.com",
  "https://www.dirt-trails.com",
]

function buildCorsHeaders(req: Request): Record<string, string> {
  const allowed = [
    ...new Set(
      [...APP_URL.split(","), ...EXTRA_CORS_ORIGINS.split(","), ...DEFAULT_CORS_ORIGINS]
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
  const requestOrigin = req.headers.get("origin") || ""
  const allowedOrigin = allowed.includes(requestOrigin) ? requestOrigin : allowed[0]
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
}

// ── In-memory status cache ────────────────────────────────────────────────────
// Scoped to the Deno isolate lifetime. Dramatically reduces Postgres load at
// 100 concurrent users: each unique reference hits the DB at most once per TTL.
//
// Safety rules:
//   • Pending/processing: 10s TTL — status can change, evict quickly
//   • Terminal (completed/failed): 5min TTL — immutable, safe to cache long
//   • A stale "completed" is always correct (payment cannot un-complete)
//   • A stale "pending" resolves within 10s via re-query or Realtime push

interface CacheEntry {
  status: string
  payment_id: string
  order_id: string | null
  amount: number | null
  cachedAt: number
}

const statusCache = new Map<string, CacheEntry>()
const PENDING_TTL_MS  = 10_000    // 10s
const TERMINAL_TTL_MS = 300_000   // 5min

function isTerminal(status: string): boolean {
  return status === "completed" || status === "failed"
}

function getCached(reference: string): CacheEntry | null {
  const entry = statusCache.get(reference)
  if (!entry) return null
  const ttl = isTerminal(entry.status) ? TERMINAL_TTL_MS : PENDING_TTL_MS
  if (Date.now() - entry.cachedAt > ttl) {
    statusCache.delete(reference)
    return null
  }
  return entry
}

function evictExpired(): void {
  const now = Date.now()
  for (const [key, entry] of statusCache) {
    const ttl = isTerminal(entry.status) ? TERMINAL_TTL_MS : PENDING_TTL_MS
    if (now - entry.cachedAt > ttl) statusCache.delete(key)
  }
}

function mapMarzpayStatus(raw: string): string {
  const s = (raw || "").toLowerCase()
  if (s === "successful" || s === "success" || s === "completed") return "completed"
  if (["failed", "cancelled", "rejected", "expired"].includes(s)) return "failed"
  return s || "processing"
}

async function refreshFromMarzpay(
  supabase: ReturnType<typeof createClient>,
  p: { id: string; order_id: string | null; booking_id?: string | null; amount: number | null; status: string; reference: string; transaction_uuid?: string | null },
): Promise<{ status: string; amount: number | null }> {
  if (isTerminal(p.status) || !MARZPAY_API_CREDENTIALS) {
    return { status: p.status, amount: p.amount }
  }
  const lookup = p.transaction_uuid || p.reference
  if (!lookup) return { status: p.status, amount: p.amount }

  try {
    const res = await fetch(`${MARZPAY_API_URL}/transactions/${lookup}`, {
      headers: {
        Authorization: `Basic ${MARZPAY_API_CREDENTIALS}`,
        "Content-Type": "application/json",
      },
    })
    if (!res.ok) return { status: p.status, amount: p.amount }
    const body: any = await res.json()
    const txn = body.transaction || body.data?.transaction
    const next = mapMarzpayStatus(String(txn?.status || ""))
    if (!isTerminal(next)) return { status: p.status, amount: p.amount }

    await supabase
      .from("payments")
      .update({
        status: next,
        webhook_data: body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id)

    if (next === "completed" && p.booking_id) {
      await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_status: "paid",
          payment_reference: p.reference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.booking_id)

      await supabase.from("payment_fulfillment_jobs").upsert(
        {
          job_type: "booking_fulfillment",
          source_id: p.booking_id,
          payload: { reference: p.reference, amount: Number(p.amount || 0) },
          idempotency_key: `booking_fulfillment:${p.booking_id}:${p.reference}`,
          status: "pending",
          scheduled_for: new Date().toISOString(),
        },
        { onConflict: "idempotency_key" },
      )
    }

    return { status: next, amount: p.amount }
  } catch (err) {
    console.warn("marzpay-payment-status: MarzPay refresh failed", (err as Error).message)
    return { status: p.status, amount: p.amount }
  }
}

serve(async (req) => {
  const CORS_HEADERS = buildCorsHeaders(req)
  const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  }
  const JSON_HEADERS = { ...CORS_HEADERS, ...NO_CACHE_HEADERS, "Content-Type": "application/json" }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...CORS_HEADERS, ...NO_CACHE_HEADERS } })
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HEADERS })
  }

  const url = new URL(req.url)
  const reference = url.searchParams.get("reference")
  if (!reference) {
    return new Response(JSON.stringify({ error: "Missing reference parameter" }), { status: 400, headers: JSON_HEADERS })
  }

  // ── Cache hit — skip Postgres entirely ───────────────────────────────────
  const cached = getCached(reference)
  if (cached) {
    return new Response(
      JSON.stringify({
        reference,
        status:     cached.status,
        payment_id: cached.payment_id,
        order_id:   cached.order_id,
        amount:     cached.amount,
        cached:     true,
      }),
      { status: 200, headers: JSON_HEADERS }
    )
  }

  // ── Cache miss — query Postgres, populate cache ───────────────────────────
  try {
    evictExpired()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: rows, error } = await supabase
      .from("payments")
      .select("id, order_id, booking_id, reference, status, amount, phone_number, created_at, transaction_uuid")
      .eq("reference", reference)
      .limit(1)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: JSON_HEADERS })
    }

    const p = rows?.[0]
    if (!p) {
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: JSON_HEADERS })
    }

    const refreshed = await refreshFromMarzpay(supabase, p)
    const status = refreshed.status
    const amount = refreshed.amount

    statusCache.set(reference, {
      status,
      payment_id: p.id,
      order_id:   p.order_id,
      amount,
      cachedAt:   Date.now(),
    })

    return new Response(
      JSON.stringify({
        reference:  p.reference,
        status,
        payment_id: p.id,
        order_id:   p.order_id,
        amount,
        cached:     false,
      }),
      { status: 200, headers: JSON_HEADERS }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: JSON_HEADERS }
    )
  }
})
