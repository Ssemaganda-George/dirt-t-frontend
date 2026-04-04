import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RECONCILE_SECRET = Deno.env.get("RECONCILE_SECRET");

serve(async (req) => {
  try {
    if (RECONCILE_SECRET) {
      const token = req.headers.get('x-reconcile-token');
      if (!token || token !== RECONCILE_SECRET) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
      }
    }

    const payload = await req.json();
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'missing env' }), { status: 500 });
    }

    const body = {
      booking_id: payload.bookingId || payload.booking_id,
      issue_type: 'reconcile',
      details: { action: payload.action || 'approve', notes: payload.notes || null, admin_id: payload.adminId || payload.admin_id || null }
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/booking_issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(text, { status: res.status });
    }

    const result = await res.json();
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('reconcile-booking error', err);
    return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
  }
});
