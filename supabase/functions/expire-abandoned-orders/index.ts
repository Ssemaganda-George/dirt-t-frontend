// deno-lint-ignore-file
// @ts-nocheck
// Supabase Edge Function: expire-abandoned-orders
// Deploy: supabase functions deploy expire-abandoned-orders
//
// Marks orders as 'expired' when they've been pending for more than 2 hours
// without a successful payment. Triggered by a pg_cron job (see migration).
//
// Environment variables needed:
//   SUPABASE_URL - Your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY - Service role key (bypasses RLS)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EXPIRE_AFTER_HOURS = 2

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const cutoff = new Date(Date.now() - EXPIRE_AFTER_HOURS * 60 * 60 * 1000).toISOString()

    // Expire orders that are still pending/unpaid after EXPIRE_AFTER_HOURS hours.
    // Excludes orders already paid, completed, or explicitly expired.
    const { data: expired, error } = await supabase
      .from('orders')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .not('status', 'in', '("paid","completed","expired")')
      .lt('created_at', cutoff)
      .select('id')

    if (error) {
      console.error('[expire-abandoned-orders] update error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const count = expired?.length ?? 0
    console.log(`[expire-abandoned-orders] expired ${count} orders older than ${EXPIRE_AFTER_HOURS}h`)

    return new Response(
      JSON.stringify({ success: true, expired: count }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[expire-abandoned-orders] unexpected error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
