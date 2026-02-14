import { supabase } from './supabaseClient';
import { Vendor, Booking, VendorTier } from '../types';

export interface CommissionCalculation {
  commissionRate: number;
  commissionAmount: number;
  vendorPayoutAmount: number;
  servicePrice: number;
}

/**
 * Calculates commission for a booking based on vendor's current tier
 * @param vendorId - The vendor ID
 * @param servicePrice - The service price
 * @returns Commission calculation details
 */
export async function calculateCommission(
  vendorId: string,
  servicePrice: number
): Promise<CommissionCalculation> {
  // Get vendor's current tier from pricing_tiers
  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('current_tier_id')
    .eq('id', vendorId)
    .single();

  if (error || !vendor) {
    throw new Error(`Failed to get vendor: ${error?.message}`);
  }

  let commissionRate = 0.15; // Default to 15%
  let commissionAmount = 0;

  if (vendor.current_tier_id) {
    // Get tier details from pricing_tiers
    const { data: tier, error: tierError } = await supabase
      .from('pricing_tiers')
      .select('commission_type, commission_value')
      .eq('id', vendor.current_tier_id)
      .eq('is_active', true)
      .lte('effective_from', new Date().toISOString().split('T')[0])
      .or(`effective_until.is.null,effective_until.gte.${new Date().toISOString().split('T')[0]}`)
      .single();

    if (tier && !tierError) {
      if (tier.commission_type === 'flat') {
        commissionAmount = tier.commission_value;
        commissionRate = servicePrice > 0 ? commissionAmount / servicePrice : 0;
      } else {
        commissionRate = tier.commission_value / 100;
        commissionAmount = servicePrice * commissionRate;
      }
    }
  }

  const vendorPayoutAmount = servicePrice - commissionAmount;

  return {
    commissionRate,
    commissionAmount,
    vendorPayoutAmount,
    servicePrice,
  };
}

/**
 * Applies commission calculation to a booking record
 * This should be called during booking confirmation
 * @param bookingId - The booking ID
 * @param vendorId - The vendor ID
 * @param servicePrice - The service price
 * @returns Updated booking with commission details
 */
export async function applyCommissionToBooking(
  bookingId: string,
  vendorId: string,
  servicePrice: number
): Promise<Booking> {
  const calculation = await calculateCommission(vendorId, servicePrice);

  const { data: booking, error } = await supabase
    .from('bookings')
    .update({
      commission_rate_at_booking: calculation.commissionRate,
      commission_amount: calculation.commissionAmount,
      vendor_payout_amount: calculation.vendorPayoutAmount,
    })
    .eq('id', bookingId)
    .select(`
      *,
      service:services(title),
      tourist_profile:profiles(full_name)
    `)
    .single();

  if (error) {
    throw new Error(`Failed to apply commission to booking: ${error.message}`);
  }

  return booking;
}

/**
 * Gets vendor's current tier information (respects manual assignments)
 * @param vendorId - The vendor ID
 * @returns Vendor with tier information
 */
export async function getVendorWithTier(vendorId: string): Promise<Vendor> {
  const { data: vendor, error } = await supabase
    .from('vendors')
    .select(`
      *,
      current_tier:vendor_tiers!current_tier_id(*),
      manual_tier:vendor_tiers!manual_tier_id(*)
    `)
    .eq('id', vendorId)
    .single();

  if (error) {
    throw new Error(`Failed to get vendor tier: ${error.message}`);
  }

  // Check if manual tier assignment is active
  const now = new Date();
  const hasActiveManualTier = vendor.manual_tier_id &&
    (!vendor.manual_tier_expires_at || new Date(vendor.manual_tier_expires_at) > now);

  if (hasActiveManualTier) {
    // Return vendor with manual tier as current tier
    return {
      ...vendor,
      current_tier: vendor.manual_tier,
      current_tier_id: vendor.manual_tier_id,
      current_commission_rate: vendor.manual_tier?.commission_rate || vendor.current_commission_rate
    };
  }

  // Manual tier has expired or doesn't exist - ensure current tier is set to automatic tier
  const hasExpiredManualTier = vendor.manual_tier_id &&
    vendor.manual_tier_expires_at && new Date(vendor.manual_tier_expires_at) <= now;

  if (hasExpiredManualTier) {
    // Manual tier has expired - update vendor to use automatic tier
    console.log(`Manual tier expired for vendor ${vendor.id}, updating to automatic tier`);

    try {
      // Get automatic tier by evaluating vendor metrics
      const automaticTier = await getAutomaticTierForVendor(vendor.id);

      if (automaticTier && (vendor.current_tier_id === vendor.manual_tier_id)) {
        // Update vendor with automatic tier
        await supabase
          .from('vendors')
          .update({
            current_tier_id: automaticTier.id,
            current_commission_rate: automaticTier.commission_rate
          })
          .eq('id', vendor.id);

        // Return updated vendor data
        return {
          ...vendor,
          current_tier: automaticTier,
          current_tier_id: automaticTier.id,
          current_commission_rate: automaticTier.commission_rate
        };
      }
    } catch (updateError) {
      console.error('Error updating expired manual tier:', updateError);
      // Continue with existing data if update fails
    }
  }

  return vendor;
}

/**
 * Gets all active vendor tiers ordered by priority
 * @returns Array of active vendor tiers
 */
export async function getActiveTiers() {
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
 * @param vendorId - The vendor ID
 * @returns The automatic tier the vendor should have
 */
export async function getAutomaticTierForVendor(vendorId: string): Promise<VendorTier | null> {
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

    console.log(`Vendor ${vendorId} metrics:`, {
      monthly_booking_count: vendor.monthly_booking_count,
      average_rating: vendor.average_rating
    });

    // Get all active tiers
    const tiers = await getActiveTiers();

    console.log('Available tiers:', tiers.map(t => ({
      name: t.name,
      priority_order: t.priority_order,
      min_monthly_bookings: t.min_monthly_bookings,
      min_rating: t.min_rating
    })));

    // Find the highest eligible tier (lowest priority_order)
    for (const tier of tiers) {
      const isEligible = (
        (vendor.monthly_booking_count || 0) >= tier.min_monthly_bookings &&
        (!tier.min_rating || (vendor.average_rating || 0) >= tier.min_rating)
      );

      console.log(`Checking tier ${tier.name}: eligible = ${isEligible} (bookings: ${(vendor.monthly_booking_count || 0)} >= ${tier.min_monthly_bookings}, rating: ${!tier.min_rating || (vendor.average_rating || 0) >= tier.min_rating})`);

      if (isEligible) {
        console.log(`Selected tier: ${tier.name}`);
        return tier;
      }
    }

    // Default to Bronze tier specifically, or lowest priority tier
    const bronzeTier = tiers.find(t => t.name === 'Bronze') || tiers[0];
    console.log(`No eligible tier found, defaulting to: ${bronzeTier?.name}`);
    return bronzeTier || null;
  } catch (error) {
    console.error('Error calculating automatic tier:', error);
    return null;
  }
}