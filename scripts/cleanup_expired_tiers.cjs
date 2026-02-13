#!/usr/bin/env node

/**
 * Script to clean up expired manual tier assignments
 * Run this script periodically (daily/hourly) to ensure expired manual tiers are reset
 *
 * Usage: node scripts/cleanup_expired_tiers.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

/**
 * Gets all active vendor tiers ordered by priority
 */
async function getActiveTiers() {
  const { data: tiers, error } = await supabase
    .from('vendor_tiers')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to get active tiers: ${error.message}`);
  }

  return tiers;
}

/**
 * Gets the automatic tier for a vendor based on their current metrics
 */
async function getAutomaticTierForVendor(vendorId) {
  try {
    // Get vendor metrics
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('monthly_booking_count, average_rating')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendor) {
      console.error('Error getting vendor metrics:', vendorError);
      return null;
    }

    // Get all active tiers
    const tiers = await getActiveTiers();

    // Find the highest eligible tier (lowest priority_order)
    for (const tier of tiers) {
      const isEligible = (
        (vendor.monthly_booking_count || 0) >= tier.min_monthly_bookings &&
        (!tier.min_rating || (vendor.average_rating || 0) >= tier.min_rating)
      );

      if (isEligible) {
        return tier;
      }
    }

    // Default to Bronze tier specifically, or lowest priority tier
    const bronzeTier = tiers.find(t => t.name === 'Bronze') || tiers[0];
    return bronzeTier || null;
  } catch (error) {
    console.error('Error calculating automatic tier:', error);
    return null;
  }
}

/**
 * Cleans up expired manual tier assignments
 */
async function cleanupExpiredManualTiers() {
  console.log('Starting cleanup of expired manual tier assignments...');

  const errors = [];
  let cleanedCount = 0;

  try {
    const now = new Date().toISOString();

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
      .lte('manual_tier_expires_at', now);

    if (fetchError) {
      const errorMsg = `Failed to fetch expired manual tiers: ${fetchError.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { cleanedCount, errors };
    }

    if (!expiredVendors || expiredVendors.length === 0) {
      console.log('No expired manual tier assignments found.');
      return { cleanedCount, errors };
    }

    console.log(`Found ${expiredVendors.length} expired manual tier assignments to clean up.`);

    // Process each expired vendor
    for (const vendor of expiredVendors) {
      try {
        console.log(`Processing expired manual tier for vendor: ${vendor.business_name} (${vendor.id})`);

        // Calculate automatic tier for this vendor
        const automaticTier = await getAutomaticTierForVendor(vendor.id);

        if (!automaticTier) {
          const errorMsg = `Could not determine automatic tier for vendor ${vendor.id}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          continue;
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
          .eq('id', vendor.id);

        if (updateError) {
          const errorMsg = `Failed to update vendor ${vendor.id}: ${updateError.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        console.log(`Successfully reset vendor ${vendor.business_name} from manual tier to automatic tier: ${automaticTier.name}`);
        cleanedCount++;

      } catch (vendorError) {
        const errorMsg = `Error processing vendor ${vendor.id}: ${vendorError.message || String(vendorError)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Unexpected error during cleanup: ${error.message || String(error)}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  console.log(`Expired manual tier cleanup complete. Cleaned: ${cleanedCount}, Errors: ${errors.length}`);
  return { cleanedCount, errors };
}

async function main() {
  console.log('Starting expired manual tier cleanup...');

  try {
    const result = await cleanupExpiredManualTiers();

    console.log(`\nCleanup completed:`);
    console.log(`- Cleaned: ${result.cleanedCount} expired manual tiers`);
    console.log(`- Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Exit with error code if there were errors
    process.exit(result.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
    process.exit(1);
  }
}

main();