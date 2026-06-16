import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json().catch(() => ({}))
    const limit = Math.max(1, Math.min(500, Number(body?.limit || 100)))

    const { data, error } = await supabase.rpc("release_eligible_vendor_holds", {
      p_limit: limit,
    })

    if (error) {
      console.error("[release-pending-wallet-funds] RPC error:", error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("[release-pending-wallet-funds] result:", JSON.stringify(data))

    return new Response(JSON.stringify({ success: true, ...(data as object) }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("[release-pending-wallet-funds] unexpected error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
