import { supabase } from './supabaseClient';

export interface PricingTier {
  id: string;
  name: string;
  commission_type: 'percentage' | 'flat';
  commission_value: number;
  min_monthly_bookings: number;
  min_rating?: number;
  priority_order: number;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ServicePricingOverride {
  id: string;
  service_id: string;
  override_enabled: boolean;
  override_type: 'flat' | 'percentage';
  override_value: number;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  tourist_percentage?: number;
  vendor_percentage?: number;
  effective_from: string;
  effective_until?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentCalculation {
  success: boolean;
  error?: string;
  base_price: number;
  platform_fee: number;
  tourist_fee: number;
  vendor_fee: number;
  vendor_payout: number;
  total_customer_payment: number;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  pricing_source: 'tier' | 'override';
  pricing_reference_id: string;
  service_id: string;
}

export interface PricingPreview {
  base_price: number;
  platform_fee: number;
  tourist_fee: number;
  vendor_fee: number;
  vendor_payout: number;
  total_customer_payment: number;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  pricing_source: 'tier' | 'override';
  applied_rule: string;
}

/**
 * Calculate payment breakdown for a service
 * @param serviceId - The service ID
 * @param purchaseDate - Optional purchase date (defaults to now)
 * @returns Payment calculation details
 */
export async function calculatePayment(
  serviceId: string,
  purchaseDate: Date = new Date()
): Promise<PaymentCalculation> {
  try {
    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, price, vendor_id')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return {
        success: false,
        error: 'Service not found',
        base_price: 0,
        platform_fee: 0,
        tourist_fee: 0,
        vendor_fee: 0,
        vendor_payout: 0,
        total_customer_payment: 0,
        fee_payer: 'vendor',
        pricing_source: 'tier',
        pricing_reference_id: '',
        service_id: serviceId
      };
    }

    const basePrice = service.price;

    // Check for active service pricing override
    const { data: override, error: overrideError } = await supabase
      .from('service_pricing_overrides')
      .select('*')
      .eq('service_id', serviceId)
      .eq('override_enabled', true)
      .lte('effective_from', purchaseDate.toISOString())
      .or(`effective_until.is.null,effective_until.gte.${purchaseDate.toISOString()}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (override && !overrideError) {
      // Use override pricing
      const platformFee = override.override_type === 'flat'
        ? override.override_value
        : basePrice * (override.override_value / 100);

      const feePayer = override.fee_payer;
      let totalCustomerPayment: number;
      let vendorPayout: number;
      let touristFee: number;
      let vendorFee: number;

      if (feePayer === 'shared') {
        // Split the fee between tourist and vendor
        touristFee = platformFee * (override.tourist_percentage! / 100);
        vendorFee = platformFee * (override.vendor_percentage! / 100);
        totalCustomerPayment = basePrice + touristFee;
        vendorPayout = basePrice - vendorFee;
      } else if (feePayer === 'tourist') {
        touristFee = platformFee;
        vendorFee = 0;
        totalCustomerPayment = basePrice + platformFee;
        vendorPayout = basePrice;
      } else {
        touristFee = 0;
        vendorFee = platformFee;
        totalCustomerPayment = basePrice;
        vendorPayout = basePrice - platformFee;
      }

      return {
        success: true,
        base_price: basePrice,
        platform_fee: platformFee,
        tourist_fee: touristFee,
        vendor_fee: vendorFee,
        vendor_payout: vendorPayout,
        total_customer_payment: totalCustomerPayment,
        fee_payer: feePayer,
        pricing_source: 'override',
        pricing_reference_id: override.id,
        service_id: serviceId
      };
    }

    // Use vendor tier pricing
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('current_tier_id')
      .eq('id', service.vendor_id)
      .single();

    let platformFee = 0;
    let pricingReferenceId = '';

    if (vendor && !vendorError && vendor.current_tier_id) {
      const { data: tierData, error: tierError } = await supabase
        .from('pricing_tiers')
        .select('id, commission_type, commission_value')
        .eq('id', vendor.current_tier_id)
        .eq('is_active', true)
        .lte('effective_from', purchaseDate.toISOString())
        .or(`effective_until.is.null,effective_until.gte.${purchaseDate.toISOString()}`)
        .single();

      if (tierData && !tierError) {
        pricingReferenceId = tierData.id;
        platformFee = tierData.commission_type === 'flat'
          ? tierData.commission_value
          : basePrice * (tierData.commission_value / 100);
      } else {
        // Default commission if no tier found
        platformFee = basePrice * 0.15; // 15% default
      }
    } else {
      // Default commission if no tier found
      platformFee = basePrice * 0.15; // 15% default
    }

    return {
      success: true,
      base_price: basePrice,
      platform_fee: platformFee,
      tourist_fee: 0,
      vendor_fee: platformFee,
      vendor_payout: basePrice - platformFee,
      total_customer_payment: basePrice,
      fee_payer: 'vendor',
      pricing_source: 'tier',
      pricing_reference_id: pricingReferenceId,
      service_id: serviceId
    };

  } catch (error) {
    console.error('Error calculating payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      base_price: 0,
      platform_fee: 0,
      tourist_fee: 0,
      vendor_fee: 0,
      vendor_payout: 0,
      total_customer_payment: 0,
      fee_payer: 'vendor',
      pricing_source: 'tier',
      pricing_reference_id: '',
      service_id: serviceId
    };
  }
}

/**
 * Calculate payment breakdown for a service using a provided base price (useful for ticket unit prices)
 * @param serviceId - The service ID
 * @param basePrice - The unit/base price to use for calculation
 * @param purchaseDate - Optional purchase date (defaults to now)
 * @returns Payment calculation details
 */
export async function calculatePaymentForAmount(
  serviceId: string,
  basePrice: number,
  purchaseDate: Date = new Date()
): Promise<PaymentCalculation> {
  try {
    // Get service details (we still need vendor_id to resolve tiers and overrides)
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, vendor_id')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return {
        success: false,
        error: 'Service not found',
        base_price: basePrice,
        platform_fee: 0,
        tourist_fee: 0,
        vendor_fee: 0,
        vendor_payout: 0,
        total_customer_payment: 0,
        fee_payer: 'vendor',
        pricing_source: 'tier',
        pricing_reference_id: '',
        service_id: serviceId
      };
    }

    // Check for active service pricing override
    const { data: override, error: overrideError } = await supabase
      .from('service_pricing_overrides')
      .select('*')
      .eq('service_id', serviceId)
      .eq('override_enabled', true)
      .lte('effective_from', purchaseDate.toISOString())
      .or(`effective_until.is.null,effective_until.gte.${purchaseDate.toISOString()}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (override && !overrideError) {
      const platformFee = override.override_type === 'flat'
        ? Number(override.override_value)
        : basePrice * (Number(override.override_value) / 100);

      const feePayer = override.fee_payer as 'vendor' | 'tourist' | 'shared';
      let totalCustomerPayment: number;
      let vendorPayout: number;
      let touristFee: number;
      let vendorFee: number;

      if (feePayer === 'shared') {
        touristFee = platformFee * (Number(override.tourist_percentage || 0) / 100);
        vendorFee = platformFee * (Number(override.vendor_percentage || 0) / 100);
        totalCustomerPayment = basePrice + touristFee;
        vendorPayout = basePrice - vendorFee;
      } else if (feePayer === 'tourist') {
        touristFee = platformFee;
        vendorFee = 0;
        totalCustomerPayment = basePrice + platformFee;
        vendorPayout = basePrice;
      } else {
        touristFee = 0;
        vendorFee = platformFee;
        totalCustomerPayment = basePrice;
        vendorPayout = basePrice - platformFee;
      }

      return {
        success: true,
        base_price: basePrice,
        platform_fee: platformFee,
        tourist_fee: touristFee,
        vendor_fee: vendorFee,
        vendor_payout: vendorPayout,
        total_customer_payment: totalCustomerPayment,
        fee_payer: feePayer,
        pricing_source: 'override',
        pricing_reference_id: override.id,
        service_id: serviceId
      };
    }

    // Use vendor tier pricing
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('current_tier_id')
      .eq('id', service.vendor_id)
      .single();

    let platformFee = 0;
    let pricingReferenceId = '';

    if (vendor && !vendorError && vendor.current_tier_id) {
      const { data: tierData, error: tierError } = await supabase
        .from('pricing_tiers')
        .select('id, commission_type, commission_value')
        .eq('id', vendor.current_tier_id)
        .eq('is_active', true)
        .lte('effective_from', purchaseDate.toISOString())
        .or(`effective_until.is.null,effective_until.gte.${purchaseDate.toISOString()}`)
        .single();

      if (tierData && !tierError) {
        pricingReferenceId = tierData.id;
        platformFee = tierData.commission_type === 'flat'
          ? Number(tierData.commission_value)
          : basePrice * (Number(tierData.commission_value) / 100);
      } else {
        platformFee = basePrice * 0.15; // 15% default
      }
    } else {
      platformFee = basePrice * 0.15; // 15% default
    }

    return {
      success: true,
      base_price: basePrice,
      platform_fee: platformFee,
      tourist_fee: 0,
      vendor_fee: platformFee,
      vendor_payout: basePrice - platformFee,
      total_customer_payment: basePrice,
      fee_payer: 'vendor',
      pricing_source: 'tier',
      pricing_reference_id: pricingReferenceId,
      service_id: serviceId
    };

  } catch (error) {
    console.error('Error calculating payment for amount:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      base_price: basePrice,
      platform_fee: 0,
      tourist_fee: 0,
      vendor_fee: 0,
      vendor_payout: 0,
      total_customer_payment: 0,
      fee_payer: 'vendor',
      pricing_source: 'tier',
      pricing_reference_id: '',
      service_id: serviceId
    };
  }
}

/**
 * Get all active pricing tiers
 * @returns Array of active pricing tiers
 */
export async function getActivePricingTiers(): Promise<PricingTier[]> {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to get active pricing tiers: ${error.message}`);
  }

  return data || [];
}

/**
 * Get vendor count for each active pricing tier
 * @returns Object mapping tier IDs to vendor counts
 */
export async function getVendorCountsByTier(): Promise<Record<string, number>> {
  try {
    // Get active pricing tiers first
    const tiers = await getActivePricingTiers();

    // Get vendor counts - currently all approved vendors with tiers are assumed to be on Bronze
    // TODO: Update vendor current_tier_id to point to correct pricing_tiers IDs
    const { data, error } = await supabase
      .from('vendors')
      .select('id')
      .eq('status', 'approved')
      .not('current_tier_id', 'is', null);

    if (error) {
      throw new Error(`Failed to get vendor tier counts: ${error.message}`);
    }

    const totalApprovedVendorsWithTiers = data?.length || 0;

    // For now, assign all vendors to Bronze tier (priority_order = 1)
    // This is a temporary fix until vendor current_tier_id values are updated
    const counts: Record<string, number> = {};

    // Find the Bronze tier (lowest priority)
    const bronzeTier = tiers.find(t => t.priority_order === 1);
    if (bronzeTier) {
      counts[bronzeTier.id] = totalApprovedVendorsWithTiers;
    }

    return counts;
  } catch (error) {
    console.error('Error in getVendorCountsByTier:', error);
    return {};
  }
}

/**
 * Get pricing tier by ID
 * @param tierId - The pricing tier ID
 * @returns Pricing tier details
 */
export async function getPricingTier(tierId: string): Promise<PricingTier | null> {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('id', tierId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get pricing tier: ${error.message}`);
  }

  return data;
}

/**
 * Create a new pricing tier
 * @param tier - Pricing tier data
 * @param adminId - Admin user ID creating the tier
 * @returns Created pricing tier
 */
export async function createPricingTier(
  tier: Omit<PricingTier, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
  adminId: string
): Promise<PricingTier> {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .insert({
      ...tier,
      created_by: adminId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create pricing tier: ${error.message}`);
  }

  return data;
}

/**
 * Update a pricing tier
 * @param tierId - The pricing tier ID
 * @param updates - Fields to update
 * @returns Updated pricing tier
 */
export async function updatePricingTier(
  tierId: string,
  updates: Partial<PricingTier>
): Promise<PricingTier> {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .update(updates)
    .eq('id', tierId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update pricing tier: ${error.message}`);
  }

  return data;
}

/**
 * Get service pricing overrides for a service
 * @param serviceId - The service ID
 * @returns Array of pricing overrides
 */
export async function getServicePricingOverrides(serviceId: string): Promise<ServicePricingOverride[]> {
  const { data, error } = await supabase
    .from('service_pricing_overrides')
    .select('*')
    .eq('service_id', serviceId)
    .order('effective_from', { ascending: false });

  if (error) {
    // Log full supabase error for debugging (includes details/hint/code/status when available)
    try {
      console.error('getServicePricingOverrides supabase error:', error);
      const errInfo = {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
        status: (error as any).status
      };
      console.error('getServicePricingOverrides error info:', JSON.stringify(errInfo, null, 2));
      throw new Error(`Failed to get service pricing overrides: ${error.message} ${JSON.stringify(errInfo)}`);
    } catch (e) {
      // If the error object cannot be serialized for some reason, fall back to original message
      throw new Error(`Failed to get service pricing overrides: ${error.message}`);
    }
  }

  return data || [];
}

/**
 * Get all service pricing overrides
 * @returns Array of all pricing overrides
 */
export async function getAllServicePricingOverrides(): Promise<ServicePricingOverride[]> {
  const { data, error } = await supabase
    .from('service_pricing_overrides')
    .select(`
      *,
      services (
        title,
        vendors (
          business_name
        )
      )
    `)
    .order('effective_from', { ascending: false });

  if (error) {
    // Log full supabase error for debugging
    try {
      console.error('getAllServicePricingOverrides supabase error:', error);
      const errInfo = {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
        status: (error as any).status
      };
      console.error('getAllServicePricingOverrides error info:', JSON.stringify(errInfo, null, 2));
      throw new Error(`Failed to get all service pricing overrides: ${error.message} ${JSON.stringify(errInfo)}`);
    } catch (e) {
      throw new Error(`Failed to get all service pricing overrides: ${error.message}`);
    }
  }

  return data || [];
}

/**
 * Create a service pricing override
 * @param override - Override data
 * @param adminId - Admin user ID creating the override
 * @returns Created override
 */
export async function createServicePricingOverride(
  override: Omit<ServicePricingOverride, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
  adminId: string
): Promise<ServicePricingOverride> {
  // Normalize and validate fee_payer to avoid violating DB check constraint
  const validFeePayers = ['vendor', 'tourist', 'shared'];
  const rawFeePayer = (override as any).fee_payer;
  const feePayer = rawFeePayer == null ? null : String(rawFeePayer).trim().toLowerCase();
  if (!feePayer || !validFeePayers.includes(feePayer)) {
    throw new Error(`Invalid fee_payer value: ${rawFeePayer}. Must be one of ${validFeePayers.join(', ')}`);
  }

  // Build sanitized payload (ensures fee_payer is normalized)
  const payload = {
    ...override,
    fee_payer: feePayer,
    created_by: adminId
  };

  // Log outgoing payload for debugging
  try {
    console.debug('Creating service_pricing_override with payload:', JSON.stringify(payload));
  } catch (e) {
    // ignore stringify errors
  }

  const { data, error } = await supabase
    .from('service_pricing_overrides')
    .insert(payload)
    .select()
    .single();

  if (error) {
    // Log full supabase error for debugging
    try {
      console.error('createServicePricingOverride supabase error:', error);
      const errInfo = {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
        status: (error as any).status
      };
      console.error('createServicePricingOverride error info:', JSON.stringify(errInfo, null, 2));
      throw new Error(`Failed to create service pricing override: ${error.message}. Details: ${JSON.stringify(errInfo)}`);
    } catch (e) {
      throw new Error(`Failed to create service pricing override: ${error.message}`);
    }
  }

  return data;
}

/**
 * Update a service pricing override
 * @param overrideId - The override ID
 * @param updates - Fields to update
 * @returns Updated override
 */
export async function updateServicePricingOverride(
  overrideId: string,
  updates: Partial<ServicePricingOverride>
): Promise<ServicePricingOverride> {
  // Validate fee_payer if present in updates
  const validFeePayers = ['vendor', 'tourist', 'shared'];
  if (Object.prototype.hasOwnProperty.call(updates as any, 'fee_payer')) {
    // Normalize fee_payer even if it's an empty string or null
    const raw = (updates as any).fee_payer;
    const normalized = raw == null ? null : String(raw).trim().toLowerCase();
    if (!normalized || !validFeePayers.includes(normalized)) {
      throw new Error(`Invalid fee_payer value in update: ${raw}. Must be one of ${validFeePayers.join(', ')}`);
    }
    // replace with normalized value
    (updates as any).fee_payer = normalized as any;
  }

  // Sanitize payload to only include defined fields (avoid sending undefined)
  const sanitizedUpdates: any = {};
  Object.keys(updates).forEach((k) => {
    const val = (updates as any)[k];
    if (typeof val !== 'undefined') sanitizedUpdates[k] = val;
  });

  try {
    console.debug('Updating service_pricing_override id=', overrideId, 'with', JSON.stringify(sanitizedUpdates));
  } catch (e) {
    // ignore
  }

  const { data, error } = await supabase
    .from('service_pricing_overrides')
    .update(sanitizedUpdates)
    .eq('id', overrideId)
    .select()
    .single();

  if (error) {
    // Log full supabase error for debugging
    try {
      console.error('updateServicePricingOverride supabase error:', error);
      const errInfo = {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
        status: (error as any).status
      };
      console.error('updateServicePricingOverride error info:', JSON.stringify(errInfo, null, 2));
      throw new Error(`Failed to update service pricing override: ${error.message}. Details: ${JSON.stringify(errInfo)}`);
    } catch (e) {
      throw new Error(`Failed to update service pricing override: ${error.message}`);
    }
  }

  return data;
}

/**
 * Delete a service pricing override
 * @param overrideId - The override ID
 */
export async function deleteServicePricingOverride(overrideId: string): Promise<void> {
  const { error } = await supabase
    .from('service_pricing_overrides')
    .delete()
    .eq('id', overrideId);

  if (error) {
    throw new Error(`Failed to delete service pricing override: ${error.message}`);
  }
}

/**
 * Get pricing preview for a service
 * @param serviceId - The service ID
 * @param purchaseDate - Optional purchase date
 * @returns Pricing preview
 */
export async function getPricingPreview(
  serviceId: string,
  purchaseDate: Date = new Date()
): Promise<PricingPreview> {
  const calculation = await calculatePayment(serviceId, purchaseDate);

  if (!calculation.success) {
    throw new Error(calculation.error || 'Failed to calculate pricing');
  }

  let appliedRule = '';
  if (calculation.pricing_source === 'override') {
    appliedRule = `Service override (${calculation.fee_payer} pays fee)`;
  } else {
    appliedRule = 'Vendor tier commission (vendor pays fee)';
  }

  return {
    base_price: calculation.base_price,
    platform_fee: calculation.platform_fee,
    tourist_fee: calculation.tourist_fee,
    vendor_fee: calculation.vendor_fee,
    vendor_payout: calculation.vendor_payout,
    total_customer_payment: calculation.total_customer_payment,
    fee_payer: calculation.fee_payer,
    pricing_source: calculation.pricing_source,
    applied_rule: appliedRule
  };
}

/**
 * Get vendor's current pricing tier
 * @param vendorId - The vendor ID
 * @returns Current pricing tier or null
 */
export async function getVendorCurrentTier(vendorId: string): Promise<PricingTier | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('current_tier_id')
    .eq('id', vendorId)
    .single();

  if (error || !data?.current_tier_id) {
    return null;
  }

  const { data: tier, error: tierError } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('id', data.current_tier_id)
    .single();

  if (tierError) {
    return null;
  }

  return tier;
}

/**
 * Update vendor's current tier
 * @param vendorId - The vendor ID
 * @param tierId - The new tier ID
 */
export async function updateVendorTier(vendorId: string, tierId: string): Promise<void> {
  const { error } = await supabase
    .from('vendors')
    .update({ current_tier_id: tierId })
    .eq('id', vendorId);

  if (error) {
    throw new Error(`Failed to update vendor tier: ${error.message}`);
  }
}

/**
 * Search for services by name or ID
 * @param searchTerm - The search term (service name or ID)
 * @param limit - Maximum number of results to return
 * @returns Array of services matching the search
 */
export async function searchServices(searchTerm: string, limit: number = 10): Promise<any[]> {
  if (!searchTerm.trim()) {
    return [];
  }

  const trimmedTerm = searchTerm.trim();

  // Helper function to check if string is a valid UUID
  const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  let exactIdMatch: any[] = [];

  // Only try ID search if the term looks like a valid UUID
  if (isValidUUID(trimmedTerm)) {
    const { data, error: idError } = await supabase
      .from('services')
      .select(`
        id,
        title,
        vendors!inner (
          business_name
        ),
        service_categories (
          name
        )
      `)
      .eq('id', trimmedTerm)
      .limit(1);

    if (idError) {
      console.error('Error searching services by ID:', idError);
    } else {
      exactIdMatch = data || [];
    }
  }

  // Then search by name (case-insensitive partial match)
  const { data: nameMatches, error: nameError } = await supabase
    .from('services')
    .select(`
      id,
      title,
      vendors!inner (
        business_name
      ),
      service_categories (
        name
      )
    `)
    .ilike('title', `%${trimmedTerm}%`)
    .limit(limit);

  if (nameError) {
    console.error('Error searching services by name:', nameError);
  }

  // Combine results, prioritizing exact ID match
  const results: any[] = [];

  if (exactIdMatch && exactIdMatch.length > 0) {
    results.push(...exactIdMatch);
  }

  if (nameMatches) {
    // Filter out duplicates if exact ID match is already included
    const filteredNameMatches = nameMatches.filter(
      service => !results.some(existing => existing.id === service.id)
    );
    results.push(...filteredNameMatches);
  }

  return results.slice(0, limit);
}