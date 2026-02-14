import { supabase } from './supabaseClient';
import { VendorTier } from '../types';
import { getVendorWithTier, getAutomaticTierForVendor } from './commissionService';
import { updateVendorTierWithServiceImpact } from './pricingService';

export interface TierEvaluationResult {
  vendorId: string;
  previousTier?: VendorTier;
  newTier: VendorTier;
  monthlyBookings: number;
  averageRating?: number;
  tierChanged: boolean;
}

/**
 * Checks if a vendor has an active manual tier assignment
 */
async function getActiveManualTier(vendorId: string): Promise<VendorTier | null> {
  try {
    const now = new Date().toISOString();

    // First check if vendor has an active manual assignment
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('manual_tier_id, manual_tier_expires_at')
      .eq('id', vendorId)
      .not('manual_tier_id', 'is', null)
      .or(`manual_tier_expires_at.is.null,manual_tier_expires_at.gt.${now}`)
      .single();

    if (vendorError || !vendor?.manual_tier_id) {
      return null;
    }

    // Get the tier details
    const { data: tier, error: tierError } = await supabase
      .from('vendor_tiers')
      .select('*')
      .eq('id', vendor.manual_tier_id)
      .single();

    if (tierError || !tier) {
      return null;
    }

    return tier as VendorTier;
  } catch (error) {
    console.error('Error checking manual tier assignment:', error);
    return null;
  }
}

/**
 * Evaluates and updates vendor tiers based on performance metrics
 * Should be run monthly (1st of each month)
 */
export async function evaluateVendorTiers(): Promise<TierEvaluationResult[]> {
  const results: TierEvaluationResult[] = [];

  try {
    // Get all active vendors
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select(`
        id,
        current_tier_id,
        average_rating,
        monthly_booking_count,
        current_tier:vendor_tiers(*)
      `)
      .eq('status', 'approved');

    if (vendorsError) {
      throw new Error(`Failed to get vendors: ${vendorsError.message}`);
    }

    // Get all active tiers ordered by priority (highest first)
    const { data: tiers, error: tiersError } = await supabase
      .from('vendor_tiers')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true }); // Lowest number = highest priority

    if (tiersError) {
      throw new Error(`Failed to get tiers: ${tiersError.message}`);
    }

    // Process each vendor
    for (const vendor of vendors || []) {
      const result = await evaluateSingleVendorTier(vendor, tiers);
      if (result) {
        results.push(result);
      }
    }

    return results;
  } catch (error) {
    console.error('Error evaluating vendor tiers:', error);
    throw error;
  }
}

/**
 * Evaluates a single vendor's tier eligibility
 */
async function evaluateSingleVendorTier(
  vendor: any,
  tiers: VendorTier[]
): Promise<TierEvaluationResult | null> {
  try {
    // Check if vendor has an active manual tier assignment
    const manualTier = await getActiveManualTier(vendor.id);
    if (manualTier) {
      // Vendor has an active manual tier assignment - skip automatic evaluation
      console.log(`Vendor ${vendor.id} has active manual tier assignment: ${manualTier.name}`);
      return null;
    }

    // Calculate current metrics
    const metrics = await calculateVendorMetrics(vendor.id);

    // Find the highest eligible tier
    let eligibleTier: VendorTier | null = null;

    for (const tier of tiers) {
      if (isEligibleForTier(metrics, tier)) {
        eligibleTier = tier;
        break; // Since tiers are ordered by priority, first eligible is best
      }
    }

    // Default to lowest tier if no eligibility
    if (!eligibleTier) {
      eligibleTier = tiers[0]; // Bronze tier (lowest priority number)
    }

    const tierChanged = !vendor.current_tier_id || vendor.current_tier_id !== eligibleTier.id;

    // Update vendor if tier changed
    if (tierChanged) {
      const updateResult = await updateVendorTierWithServiceImpact(vendor.id, eligibleTier.id, metrics);
      if (!updateResult.success) {
        console.error(`Failed to update tier for vendor ${vendor.id}:`, updateResult.error);
        // Continue with evaluation even if update fails
      } else {
        console.log(`Updated tier for vendor ${vendor.id}: ${updateResult.affectedServices.servicesUsingNewTier} services now use new tier, ${updateResult.affectedServices.servicesWithOverrides} services have overrides`);
      }
    }

    // Update evaluation timestamp
    await supabase
      .from('vendors')
      .update({ last_tier_evaluated_at: new Date().toISOString() })
      .eq('id', vendor.id);

    return {
      vendorId: vendor.id,
      previousTier: vendor.current_tier,
      newTier: eligibleTier,
      monthlyBookings: metrics.monthlyBookings,
      averageRating: metrics.averageRating,
      tierChanged,
    };
  } catch (error) {
    console.error(`Error evaluating vendor ${vendor.id}:`, error);
    return null;
  }
}

/**
 * Calculates vendor metrics for tier evaluation
 */
export async function calculateVendorMetrics(vendorId: string): Promise<{
  monthlyBookings: number;
  averageRating: number | undefined;
}> {
  // Calculate monthly bookings (completed bookings in current month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyBookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id', { count: 'exact' })
    .eq('vendor_id', vendorId)
    .eq('status', 'completed')
    .gte('created_at', startOfMonth.toISOString());

  if (bookingsError) {
    throw new Error(`Failed to calculate monthly bookings: ${bookingsError.message}`);
  }

  // For now, we'll use a placeholder for average rating
  // In a real implementation, this would calculate from a reviews table
  const averageRating = 4.0; // Placeholder

  return {
    monthlyBookings: monthlyBookings?.length || 0,
    averageRating,
  };
}

/**
 * Checks if vendor is eligible for a specific tier
 */
export function isEligibleForTier(
  metrics: { monthlyBookings: number; averageRating?: number },
  tier: VendorTier
): boolean {
  // Check monthly bookings requirement
  if (metrics.monthlyBookings < tier.min_monthly_bookings) {
    return false;
  }

  // Check rating requirement (if specified)
  if (tier.min_rating !== null && tier.min_rating !== undefined) {
    if (!metrics.averageRating || metrics.averageRating < tier.min_rating) {
      return false;
    }
  }

  return true;
}

/**
 * Gets next tier information for a vendor (for dashboard display)
 */
export async function getNextTierInfo(vendorId: string): Promise<{
  currentTier: VendorTier;
  nextTier: VendorTier | null;
  progressPercentage: number;
  requirements: string[];
}> {
  // Use the commission service to get vendor with tier (handles RLS properly)
  const vendor = await getVendorWithTier(vendorId);

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  const currentTier = vendor.current_tier;
  if (!currentTier) {
    throw new Error('Vendor has no current tier');
  }

  // Get all active tiers ordered by priority
  const { data: tiers } = await supabase
    .from('vendor_tiers')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (!tiers) {
    throw new Error('No active tiers found');
  }

  // Find next tier
  const currentTierIndex = tiers.findIndex(t => t.id === currentTier.id);
  const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;

  // Calculate progress to next tier
  let progressPercentage = 100; // Already at highest tier
  const requirements: string[] = [];

  if (nextTier) {
    const metrics = await calculateVendorMetrics(vendorId);
    const bookingProgress = Math.min(
      (metrics.monthlyBookings / nextTier.min_monthly_bookings) * 100,
      100
    );

    let ratingProgress = 100;
    if (nextTier.min_rating && metrics.averageRating) {
      ratingProgress = Math.min(
        (metrics.averageRating / nextTier.min_rating) * 100,
        100
      );
    }

    progressPercentage = Math.min(bookingProgress, ratingProgress);

    // Build requirements list
    requirements.push(`${nextTier.min_monthly_bookings} monthly bookings (${metrics.monthlyBookings} current)`);
    if (nextTier.min_rating) {
      requirements.push(`${nextTier.min_rating} average rating (${metrics.averageRating?.toFixed(1) || 'N/A'} current)`);
    }
  }

  return {
    currentTier,
    nextTier,
    progressPercentage,
    requirements,
  };
}

/**
 * Scheduled function to run monthly tier evaluation
 * This should be called by a cron job or scheduled function
 */
export async function runMonthlyTierEvaluation(): Promise<TierEvaluationResult[]> {
  console.log('Starting monthly vendor tier evaluation...');

  const results = await evaluateVendorTiers();

  const changes = results.filter(r => r.tierChanged);
  console.log(`Tier evaluation complete. ${changes.length} tier changes made.`);

  return results;
}

/**
 * Cleans up expired manual tier assignments
 * This should be called periodically (daily/hourly) to ensure expired manual tiers are reset
 */
export async function cleanupExpiredManualTiers(): Promise<{ cleanedCount: number; errors: string[] }> {
  console.log('Starting cleanup of expired manual tier assignments...');

  const errors: string[] = [];
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
        const errorMsg = `Error processing vendor ${vendor.id}: ${vendorError instanceof Error ? vendorError.message : String(vendorError)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Unexpected error during cleanup: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    errors.push(errorMsg);
  }

  console.log(`Expired manual tier cleanup complete. Cleaned: ${cleanedCount}, Errors: ${errors.length}`);
  return { cleanedCount, errors };
}