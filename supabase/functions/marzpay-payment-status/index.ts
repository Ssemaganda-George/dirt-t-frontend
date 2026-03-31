import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

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

serve(async (req) => {
  const requestOrigin = req.headers.get("origin") || "*"
  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
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
      .select("id, order_id, reference, status, amount, phone_number, created_at")
      .eq("reference", reference)
      .limit(1)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: JSON_HEADERS })
    }

    const p = rows?.[0]
    if (!p) {
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: JSON_HEADERS })
    }

    statusCache.set(reference, {
      status:     p.status,
      payment_id: p.id,
      order_id:   p.order_id,
      amount:     p.amount,
      cachedAt:   Date.now(),
    })

    return new Response(
      JSON.stringify({
        reference:  p.reference,
        status:     p.status,
        payment_id: p.id,
        order_id:   p.order_id,
        amount:     p.amount,
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
