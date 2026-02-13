// deno-lint-ignore-file
// @ts-nocheck
// Supabase Edge Function: cleanup-expired-tiers
// Deploy this to your Supabase project:
//   supabase functions deploy cleanup-expired-tiers
//
// This function cleans up expired manual tier assignments.
// It should be called periodically (daily/hourly) via cron job or scheduled task.
// Environment variables needed:
//   SUPABASE_URL - Your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key (for admin operations)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    console.log('Starting cleanup of expired manual tier assignments...')

    const errors: string[] = []
    let cleanedCount = 0

    const now = new Date().toISOString()

    // Find all vendors with expired manual tier assignments
    const { data: expiredVendors, error: fetchError } = await supabase
      .from('vendors')
      .select(`
        id,
        business_name,
        manual_tier_id,
        manual_tier_expires_at,
        current_tier_id,
        monthly_booking_count,
        average_rating
      `)
      .not('manual_tier_id', 'is', null)
      .not('manual_tier_expires_at', 'is', null)
      .lte('manual_tier_expires_at', now)

    if (fetchError) {
      const errorMsg = `Failed to fetch expired manual tiers: ${fetchError.message}`
      console.error(errorMsg)
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!expiredVendors || expiredVendors.length === 0) {
      console.log('No expired manual tier assignments found.')
      return new Response(JSON.stringify({
        success: true,
        cleanedCount: 0,
        message: 'No expired manual tier assignments found'
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${expiredVendors.length} expired manual tier assignments to clean up.`)

    // Get all active tiers for automatic tier calculation
    const { data: tiers, error: tiersError } = await supabase
      .from('vendor_tiers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (tiersError || !tiers) {
      const errorMsg = `Failed to get active tiers: ${tiersError?.message || 'No tiers found'}`
      console.error(errorMsg)
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Process each expired vendor
    for (const vendor of expiredVendors) {
      try {
        console.log(`Processing expired manual tier for vendor: ${vendor.business_name} (${vendor.id})`)

        // Calculate automatic tier for this vendor
        let automaticTier = null

        // Find the highest eligible tier (lowest priority_order)
        for (const tier of tiers) {
          const isEligible = (
            (vendor.monthly_booking_count || 0) >= tier.min_monthly_bookings &&
            (!tier.min_rating || (vendor.average_rating || 0) >= tier.min_rating)
          )

          if (isEligible) {
            automaticTier = tier
            break
          }
        }

        // Default to Bronze tier or lowest priority tier if no eligible tier found
        if (!automaticTier) {
          automaticTier = tiers.find(t => t.name === 'Bronze') || tiers[0]
        }

        if (!automaticTier) {
          const errorMsg = `Could not determine automatic tier for vendor ${vendor.id}`
          console.error(errorMsg)
          errors.push(errorMsg)
          continue
        }

        // Update vendor to use automatic tier
        const { error: updateError } = await supabase
          .from('vendors')
          .update({
            current_tier_id: automaticTier.id,
            current_commission_rate: automaticTier.commission_rate,
            manual_tier_id: null,
            manual_tier_expires_at: null
          })
          .eq('id', vendor.id)

        if (updateError) {
          const errorMsg = `Failed to update vendor ${vendor.id}: ${updateError.message}`
          console.error(errorMsg)
          errors.push(errorMsg)
          continue
        }

        console.log(`Successfully reset vendor ${vendor.business_name} from manual tier to automatic tier: ${automaticTier.name}`)
        cleanedCount++

      } catch (vendorError) {
        const errorMsg = `Error processing vendor ${vendor.id}: ${vendorError.message || String(vendorError)}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    console.log(`Expired manual tier cleanup complete. Cleaned: ${cleanedCount}, Errors: ${errors.length}`)

    return new Response(JSON.stringify({
      success: true,
      cleanedCount,
      errors: errors.length,
      message: `Cleaned ${cleanedCount} expired manual tiers${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unexpected error during cleanup:', error)
    return new Response(JSON.stringify({
      error: `Unexpected error: ${error.message || String(error)}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})