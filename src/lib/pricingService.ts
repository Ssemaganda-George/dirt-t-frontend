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
  fee_payer: 'vendor' | 'tourist' | 'shared';
  tourist_percentage?: number | null;
  vendor_percentage?: number | null;
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
  // The reference id for the applied pricing rule (override id or tier id)
  pricing_reference_id?: string;
}

/**
 * Normalizes stored commission "value" for percentage tiers: percent points (12 → 12%)
 * or decimal rate (0.12 → 12%).
 */
export function commissionPercentValueToRate(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 1) return Math.min(1, n / 100);
  return Math.min(1, n);
}

const VALID_FEE_PAYERS = ['vendor', 'tourist', 'shared'] as const;

export function normalizeFeePayer(raw: unknown): 'vendor' | 'tourist' | 'shared' {
  const s = String(raw ?? 'vendor').trim().toLowerCase();
  return (VALID_FEE_PAYERS as readonly string[]).includes(s)
    ? (s as 'vendor' | 'tourist' | 'shared')
    : 'vendor';
}

/** Same split rules as service overrides (platform fee is precomputed on base). */
export function applyFeePayerSplitFromPlatformFee(
  basePrice: number,
  platformFee: number,
  feePayer: 'vendor' | 'tourist' | 'shared',
  touristPct?: number | null,
  vendorPct?: number | null
): Pick<
  PaymentCalculation,
  'tourist_fee' | 'vendor_fee' | 'vendor_payout' | 'total_customer_payment'
> {
  const tp = Number(touristPct ?? 0);
  const vp = Number(vendorPct ?? 0);
  if (feePayer === 'shared') {
    const touristFee = platformFee * (tp / 100);
    const vendorFee = platformFee * (vp / 100);
    return {
      tourist_fee: touristFee,
      vendor_fee: vendorFee,
      total_customer_payment: basePrice + touristFee,
      vendor_payout: basePrice - vendorFee
    };
  }
  if (feePayer === 'tourist') {
    return {
      tourist_fee: platformFee,
      vendor_fee: 0,
      total_customer_payment: basePrice + platformFee,
      vendor_payout: basePrice
    };
  }
  return {
    tourist_fee: 0,
    vendor_fee: platformFee,
    total_customer_payment: basePrice,
    vendor_payout: basePrice - platformFee
  };
}

/** Per-unit pricing calc × number of billable units (guests, room-nights, etc.). */
export function customerTotalFromUnitPricingCalc(
  calc: PaymentCalculation | null | undefined,
  billableUnits: number,
  fallbackTotal: number
): number {
  if (!calc || calc.success === false) return fallbackTotal;
  return Number(calc.total_customer_payment) * billableUnits;
}

/** When calculatePaymentForAmount used the full line as a single base (e.g. transport trip total). */
export function customerTotalFromAggregatePricingCalc(
  calc: PaymentCalculation | null | undefined,
  fallbackTotal: number
): number {
  if (!calc || calc.success === false) return fallbackTotal;
  return Number(calc.total_customer_payment);
}

/** Tourist-visible fee line amounts × units (for receipts). */
export function touristFeeTotalFromUnitCalc(
  calc: PaymentCalculation | null | undefined,
  billableUnits: number,
  legacyPerUnitEstimate: number
): number {
  if (!calc || calc.success === false) return legacyPerUnitEstimate * billableUnits;
  return Number(calc.tourist_fee) * billableUnits;
}

/** Active manual tier overrides automatic tier for pricing and display. */
export function effectiveVendorTierId(v: {
  current_tier_id: string | null;
  manual_tier_id?: string | null;
  manual_tier_expires_at?: string | null;
}): string | null {
  const manualActive =
    !!v.manual_tier_id &&
    (!v.manual_tier_expires_at || new Date(v.manual_tier_expires_at) > new Date());
  if (manualActive) return v.manual_tier_id!;
  return v.current_tier_id;
}

/** Maps vendor_tiers row to admin/UI PricingTier shape. */
export function mapVendorTierRowToPricingTier(vt: Record<string, unknown>): PricingTier {
  const effFrom =
    (vt.effective_from as string | undefined) ??
    (vt.created_at as string | undefined) ??
    new Date().toISOString();
  return {
    id: vt.id as string,
    name: vt.name as string,
    commission_type: (vt.commission_type as 'percentage' | 'flat') ?? 'percentage',
    commission_value: Number(vt.commission_value ?? 0),
    min_monthly_bookings: Number(vt.min_monthly_bookings ?? 0),
    min_rating: vt.min_rating != null ? Number(vt.min_rating) : undefined,
    priority_order: Number(vt.priority_order ?? 0),
    effective_from: effFrom,
    effective_until: (vt.effective_until as string | undefined) ?? undefined,
    is_active: (vt.is_active as boolean) ?? true,
    fee_payer: normalizeFeePayer(vt.fee_payer),
    tourist_percentage:
      vt.tourist_percentage != null && vt.tourist_percentage !== ''
        ? Number(vt.tourist_percentage)
        : null,
    vendor_percentage:
      vt.vendor_percentage != null && vt.vendor_percentage !== ''
        ? Number(vt.vendor_percentage)
        : null,
    created_by: vt.created_by as string | undefined,
    created_at: (vt.created_at as string) ?? '',
    updated_at: (vt.updated_at as string) ?? ''
  };
}

export function vendorTierCommissionRateForDb(
  commissionType: 'percentage' | 'flat',
  commissionValue: number
): number {
  if (commissionType === 'flat') return 0;
  const n = Number(commissionValue);
  if (!Number.isFinite(n) || n < 0) return 0;
  const rate = n > 1 ? n / 100 : n;
  return Math.min(1, Math.max(0, rate));
}

export type TierCommissionResolve = {
  platformFee: number;
  pricingReferenceId: string;
  fee_payer: 'vendor' | 'tourist' | 'shared';
  tourist_percentage: number | null;
  vendor_percentage: number | null;
};

export async function resolveTierCommission(
  currentTierId: string,
  basePrice: number,
  purchaseDate: Date
): Promise<TierCommissionResolve> {
  const empty = (): TierCommissionResolve => ({
    platformFee: 0,
    pricingReferenceId: '',
    fee_payer: 'vendor',
    tourist_percentage: null,
    vendor_percentage: null
  });

  const { data: vt, error: vtErr } = await supabase
    .from('vendor_tiers')
    .select(
      'id, commission_type, commission_value, commission_rate, effective_from, effective_until, is_active, fee_payer, tourist_percentage, vendor_percentage'
    )
    .eq('id', currentTierId)
    .eq('is_active', true)
    .maybeSingle();

  if (!vt || vtErr) {
    return empty();
  }

  const effFrom = vt.effective_from ? new Date(vt.effective_from as string) : null;
  const effUntil = vt.effective_until ? new Date(vt.effective_until as string) : null;
  if (effFrom && effFrom > purchaseDate) {
    return empty();
  }
  if (effUntil && effUntil < purchaseDate) {
    return empty();
  }

  const feePayer = normalizeFeePayer(vt.fee_payer);
  const touristPct =
    vt.tourist_percentage != null && vt.tourist_percentage !== ''
      ? Number(vt.tourist_percentage)
      : null;
  const vendorPct =
    vt.vendor_percentage != null && vt.vendor_percentage !== ''
      ? Number(vt.vendor_percentage)
      : null;

  let platformFee = 0;
  const vtCommissionType = (vt.commission_type || 'percentage') as 'percentage' | 'flat';
  if (vtCommissionType === 'flat') {
    platformFee = Number(vt.commission_value ?? 0);
  } else {
    const val = vt.commission_value != null ? Number(vt.commission_value) : null;
    if (val != null && !Number.isNaN(val)) {
      platformFee = basePrice * commissionPercentValueToRate(val);
    }
  }

  return {
    platformFee,
    pricingReferenceId: vt.id as string,
    fee_payer: feePayer,
    tourist_percentage: touristPct,
    vendor_percentage: vendorPct
  };
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
    // Some PostgREST filters (complex OR with timestamps) can trigger 406 responses in some environments.
    // To be robust, fetch candidate overrides for the service and apply date filters client-side.
    const { data: overridesData, error: overridesError } = await supabase
      .from('service_pricing_overrides')
      .select('*')
      .eq('service_id', serviceId)
      .eq('override_enabled', true)
      .order('effective_from', { ascending: false });

    // Debug: log override query outcome to help diagnose why an active override may not be applied
    try {
      console.debug('calculatePayment: overrides fetch', { serviceId, purchaseDate: purchaseDate.toISOString(), count: overridesData?.length || 0, overridesError });
    } catch (e) {
      // ignore stringify problems
    }

    let override: any = null;
    if (overridesData && overridesData.length > 0) {
      // Find first override row that is active for the purchaseDate
      for (const o of overridesData) {
        try {
          const effFrom = o.effective_from ? new Date(o.effective_from) : null;
          const effUntil = o.effective_until ? new Date(o.effective_until) : null;
          if (effFrom && effFrom <= purchaseDate && (!effUntil || effUntil >= purchaseDate)) {
            override = o;
            break;
          }
        } catch (e) {
          // ignore parse errors and continue
        }
      }
    }

    if (override) {
      // Use override pricing
      const platformFee = override.override_type === 'flat'
        ? override.override_value
        : basePrice * (override.override_value / 100);

      const feePayer = normalizeFeePayer(override.fee_payer);
      let totalCustomerPayment: number;
      let vendorPayout: number;
      let touristFee: number;
      let vendorFee: number;

      const split = applyFeePayerSplitFromPlatformFee(
        basePrice,
        platformFee,
        feePayer,
        override.tourist_percentage,
        override.vendor_percentage
      );
      touristFee = split.tourist_fee;
      vendorFee = split.vendor_fee;
      totalCustomerPayment = split.total_customer_payment;
      vendorPayout = split.vendor_payout;

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

    // Use vendor tier pricing (manual tier wins when active)
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('current_tier_id, manual_tier_id, manual_tier_expires_at')
      .eq('id', service.vendor_id)
      .single();

    let platformFee = 0;
    let pricingReferenceId = '';
    let tierFeePayer: 'vendor' | 'tourist' | 'shared' = 'vendor';
    let tierTouristPct: number | null = null;
    let tierVendorPct: number | null = null;

    const tierId = vendor && !vendorError ? effectiveVendorTierId(vendor) : null;
    if (tierId) {
      try {
        console.debug('calculatePayment: resolving tier', { vendorId: service.vendor_id, tierId });
      } catch (e) {}
      const resolved = await resolveTierCommission(tierId, basePrice, purchaseDate);
      platformFee = resolved.platformFee;
      pricingReferenceId = resolved.pricingReferenceId;
      tierFeePayer = resolved.fee_payer;
      tierTouristPct = resolved.tourist_percentage;
      tierVendorPct = resolved.vendor_percentage;
    }

    const tierSplit = applyFeePayerSplitFromPlatformFee(
      basePrice,
      platformFee,
      tierFeePayer,
      tierTouristPct,
      tierVendorPct
    );

    return {
      success: true,
      base_price: basePrice,
      platform_fee: platformFee,
      tourist_fee: tierSplit.tourist_fee,
      vendor_fee: tierSplit.vendor_fee,
      vendor_payout: tierSplit.vendor_payout,
      total_customer_payment: tierSplit.total_customer_payment,
      fee_payer: tierFeePayer,
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
    // Fetch candidate overrides and apply effective date filtering client-side to avoid complex REST filters.
    const { data: overridesData, error: overridesError } = await supabase
      .from('service_pricing_overrides')
      .select('*')
      .eq('service_id', serviceId)
      .eq('override_enabled', true)
      .order('effective_from', { ascending: false });

    try {
      console.debug('calculatePaymentForAmount: overrides fetch', { serviceId, purchaseDate: purchaseDate.toISOString(), count: overridesData?.length || 0, overridesError });
    } catch (e) {}

    let override: any = null;
    if (overridesData && overridesData.length > 0) {
      for (const o of overridesData) {
        try {
          const effFrom = o.effective_from ? new Date(o.effective_from) : null;
          const effUntil = o.effective_until ? new Date(o.effective_until) : null;
          if (effFrom && effFrom <= purchaseDate && (!effUntil || effUntil >= purchaseDate)) {
            override = o;
            break;
          }
        } catch (e) {}
      }
    }

    if (override) {
      const platformFee = override.override_type === 'flat'
        ? Number(override.override_value)
        : basePrice * (Number(override.override_value) / 100);

      const feePayer = normalizeFeePayer(override.fee_payer);
      let totalCustomerPayment: number;
      let vendorPayout: number;
      let touristFee: number;
      let vendorFee: number;

      const splitAmt = applyFeePayerSplitFromPlatformFee(
        basePrice,
        platformFee,
        feePayer,
        override.tourist_percentage,
        override.vendor_percentage
      );
      touristFee = splitAmt.tourist_fee;
      vendorFee = splitAmt.vendor_fee;
      totalCustomerPayment = splitAmt.total_customer_payment;
      vendorPayout = splitAmt.vendor_payout;

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

    // Use vendor tier pricing (manual tier wins when active)
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('current_tier_id, manual_tier_id, manual_tier_expires_at')
      .eq('id', service.vendor_id)
      .single();

    let platformFee = 0;
    let pricingReferenceId = '';
    let tierFeePayerFA: 'vendor' | 'tourist' | 'shared' = 'vendor';
    let tierTouristPctFA: number | null = null;
    let tierVendorPctFA: number | null = null;

    const tierIdForAmount = vendor && !vendorError ? effectiveVendorTierId(vendor) : null;
    if (tierIdForAmount) {
      try { console.debug('calculatePaymentForAmount: resolving tier', { vendorId: service.vendor_id, tierId: tierIdForAmount }); } catch (e) {}
      const resolved = await resolveTierCommission(tierIdForAmount, basePrice, purchaseDate);
      platformFee = resolved.platformFee;
      pricingReferenceId = resolved.pricingReferenceId;
      tierFeePayerFA = resolved.fee_payer;
      tierTouristPctFA = resolved.tourist_percentage;
      tierVendorPctFA = resolved.vendor_percentage;
    }

    const tierSplitFA = applyFeePayerSplitFromPlatformFee(
      basePrice,
      platformFee,
      tierFeePayerFA,
      tierTouristPctFA,
      tierVendorPctFA
    );

    return {
      success: true,
      base_price: basePrice,
      platform_fee: platformFee,
      tourist_fee: tierSplitFA.tourist_fee,
      vendor_fee: tierSplitFA.vendor_fee,
      vendor_payout: tierSplitFA.vendor_payout,
      total_customer_payment: tierSplitFA.total_customer_payment,
      fee_payer: tierFeePayerFA,
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
 * Active commission tiers (public.vendor_tiers — single source of truth).
 */
export async function getActivePricingTiers(): Promise<PricingTier[]> {
  const { data, error } = await supabase
    .from('vendor_tiers')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to get active tiers: ${error.message}`);
  }

  return (data || []).map((row) => mapVendorTierRowToPricingTier(row as Record<string, unknown>));
}

/**
 * Vendor count per tier id (vendor_tiers.id)
 */
export async function getVendorCountsByTier(): Promise<Record<string, number>> {
  try {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('current_tier_id')
      .eq('status', 'approved')
      .not('current_tier_id', 'is', null);

    if (error) {
      throw new Error(`Failed to get vendor tier counts: ${error.message}`);
    }

    const counts: Record<string, number> = {};
    for (const v of vendors || []) {
      const tid = v.current_tier_id as string;
      if (!tid) continue;
      counts[tid] = (counts[tid] || 0) + 1;
    }
    return counts;
  } catch (error) {
    console.error('Error in getVendorCountsByTier:', error);
    return {};
  }
}

export async function getPricingTier(tierId: string): Promise<PricingTier | null> {
  const { data, error } = await supabase
    .from('vendor_tiers')
    .select('*')
    .eq('id', tierId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get tier: ${error.message}`);
  }

  return mapVendorTierRowToPricingTier(data as Record<string, unknown>);
}

/**
 * Create tier row in vendor_tiers
 */
export async function createPricingTier(
  tier: Omit<PricingTier, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
  adminId: string
): Promise<PricingTier> {
  const commissionRate = vendorTierCommissionRateForDb(
    tier.commission_type,
    Number(tier.commission_value)
  );
  const fp = normalizeFeePayer(tier.fee_payer);
  let touristPct: number | null = null;
  let vendorPct: number | null = null;
  if (fp === 'shared') {
    touristPct = Number(tier.tourist_percentage ?? 0);
    vendorPct = Number(tier.vendor_percentage ?? 0);
    if (touristPct + vendorPct !== 100) {
      throw new Error('Shared fee payer requires tourist and vendor percentages to sum to 100');
    }
  }
  const { data, error } = await supabase
    .from('vendor_tiers')
    .insert({
      name: tier.name,
      commission_type: tier.commission_type,
      commission_value: tier.commission_value,
      commission_rate: commissionRate,
      min_monthly_bookings: tier.min_monthly_bookings,
      min_rating: tier.min_rating ?? null,
      priority_order: tier.priority_order,
      is_active: tier.is_active,
      fee_payer: fp,
      tourist_percentage: touristPct,
      vendor_percentage: vendorPct,
      effective_from: tier.effective_from ? new Date(tier.effective_from).toISOString() : undefined,
      effective_until: tier.effective_until ? new Date(tier.effective_until).toISOString() : null,
      ...(adminId ? { created_by: adminId } : {})
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create tier: ${error.message}`);
  }

  return mapVendorTierRowToPricingTier(data as Record<string, unknown>);
}

/**
 * Update tier in vendor_tiers
 */
export async function updatePricingTier(
  tierId: string,
  updates: Partial<PricingTier>
): Promise<PricingTier> {
  const { data: existing, error: fetchErr } = await supabase
    .from('vendor_tiers')
    .select('*')
    .eq('id', tierId)
    .single();

  if (fetchErr || !existing) {
    throw new Error(`Failed to load tier: ${fetchErr?.message || 'not found'}`);
  }

  const commission_type = (updates.commission_type ?? existing.commission_type) as
    | 'percentage'
    | 'flat';
  const commission_value = Number(
    updates.commission_value ?? existing.commission_value ?? 0
  );

  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.commission_type !== undefined) payload.commission_type = updates.commission_type;
  if (updates.commission_value !== undefined) payload.commission_value = updates.commission_value;
  if (updates.min_monthly_bookings !== undefined)
    payload.min_monthly_bookings = updates.min_monthly_bookings;
  if (updates.min_rating !== undefined) payload.min_rating = updates.min_rating;
  if (updates.priority_order !== undefined) payload.priority_order = updates.priority_order;
  if (updates.is_active !== undefined) payload.is_active = updates.is_active;

  if (updates.effective_from !== undefined) {
    payload.effective_from = updates.effective_from
      ? new Date(updates.effective_from).toISOString()
      : existing.effective_from;
  }
  if (updates.effective_until !== undefined) {
    payload.effective_until = updates.effective_until
      ? new Date(updates.effective_until).toISOString()
      : null;
  }

  const existingFp = normalizeFeePayer((existing as Record<string, unknown>).fee_payer);
  const mergedFeePayer =
    updates.fee_payer !== undefined ? normalizeFeePayer(updates.fee_payer) : existingFp;

  if (updates.fee_payer !== undefined) {
    payload.fee_payer = mergedFeePayer;
  }

  if (
    updates.fee_payer !== undefined ||
    updates.tourist_percentage !== undefined ||
    updates.vendor_percentage !== undefined
  ) {
    if (mergedFeePayer === 'shared') {
      const tp =
        updates.tourist_percentage !== undefined
          ? Number(updates.tourist_percentage)
          : Number((existing as Record<string, unknown>).tourist_percentage ?? 0);
      const vp =
        updates.vendor_percentage !== undefined
          ? Number(updates.vendor_percentage)
          : Number((existing as Record<string, unknown>).vendor_percentage ?? 0);
      if (tp + vp !== 100) {
        throw new Error('Shared fee payer requires tourist and vendor percentages to sum to 100');
      }
      payload.tourist_percentage = tp;
      payload.vendor_percentage = vp;
    } else {
      payload.tourist_percentage = null;
      payload.vendor_percentage = null;
    }
  }

  if (updates.commission_type !== undefined || updates.commission_value !== undefined) {
    payload.commission_rate = vendorTierCommissionRateForDb(commission_type, commission_value);
  }

  const { data, error } = await supabase
    .from('vendor_tiers')
    .update(payload)
    .eq('id', tierId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update tier: ${error.message}`);
  }

  return mapVendorTierRowToPricingTier(data as Record<string, unknown>);
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
    const fp = calculation.fee_payer;
    appliedRule =
      fp === 'shared'
        ? 'Vendor tier commission (shared fee)'
        : `Vendor tier commission (${fp} pays fee)`;
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
    applied_rule: appliedRule,
    pricing_reference_id: calculation.pricing_reference_id
  };
}

/**
 * Pricing preview using an explicit unit/base amount (e.g. transport zone rates where `services.price` is unused).
 */
export async function getPricingPreviewForAmount(
  serviceId: string,
  basePricePerUnit: number,
  purchaseDate: Date = new Date()
): Promise<PricingPreview> {
  const calculation = await calculatePaymentForAmount(serviceId, basePricePerUnit, purchaseDate);

  if (!calculation.success) {
    throw new Error(calculation.error || 'Failed to calculate pricing');
  }

  let appliedRule = '';
  if (calculation.pricing_source === 'override') {
    appliedRule = `Service override (${calculation.fee_payer} pays fee)`;
  } else {
    const fp = calculation.fee_payer;
    appliedRule =
      fp === 'shared'
        ? 'Vendor tier commission (shared fee)'
        : `Vendor tier commission (${fp} pays fee)`;
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
    applied_rule: appliedRule,
    pricing_reference_id: calculation.pricing_reference_id
  };
}

/**
 * Get vendor's effective tier (vendor_tiers)
 */
export async function getVendorCurrentTier(vendorId: string): Promise<PricingTier | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('current_tier_id, manual_tier_id, manual_tier_expires_at')
    .eq('id', vendorId)
    .single();

  if (error || !data) {
    return null;
  }

  const tierId = effectiveVendorTierId(data);
  if (!tierId) {
    return null;
  }

  const { data: vt, error: vtError } = await supabase
    .from('vendor_tiers')
    .select('*')
    .eq('id', tierId)
    .eq('is_active', true)
    .single();

  if (!vt || vtError) {
    return null;
  }

  const ct = (vt.commission_type || 'percentage') as 'percentage' | 'flat';
  let displayValue: number;
  if (ct === 'flat') {
    displayValue = Number(vt.commission_value ?? 0);
  } else if (vt.commission_value != null && vt.commission_value !== '') {
    const n = Number(vt.commission_value);
    displayValue = n > 1 ? n : n * 100;
  } else {
    const r = Number(vt.commission_rate ?? 0);
    displayValue = r <= 1 ? r * 100 : r;
  }

  const mapped = mapVendorTierRowToPricingTier(vt as Record<string, unknown>);
  return { ...mapped, commission_type: ct, commission_value: displayValue };
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

/**
 * Update vendor's current tier and identify affected services
 * Services without pricing overrides will automatically use the new tier's pricing
 * Services with active overrides will maintain their custom pricing
 * @param vendorId - The vendor ID
 * @param tierId - The new tier ID
 * @param metrics - Optional metrics to update (monthly bookings, rating)
 * @returns Object containing update result and affected services information
 */
export async function updateVendorTierWithServiceImpact(
  vendorId: string,
  tierId: string,
  _metrics?: { monthlyBookings?: number; averageRating?: number }
): Promise<{
  success: boolean;
  error?: string;
  affectedServices: {
    totalServices: number;
    servicesUsingNewTier: number;
    servicesWithOverrides: number;
    overriddenServiceIds: string[];
  };
}> {
  try {
    const { data: vt, error: vtError } = await supabase
      .from('vendor_tiers')
      .select('commission_type, commission_value')
      .eq('id', tierId)
      .eq('is_active', true)
      .maybeSingle();

    const tier =
      vt && !vtError
        ? {
            commission_type: vt.commission_type || 'percentage',
            commission_value: Number(vt.commission_value ?? 0)
          }
        : null;

    if (!tier) {
      return {
        success: false,
        error: 'Tier not found in vendor_tiers',
        affectedServices: {
          totalServices: 0,
          servicesUsingNewTier: 0,
          servicesWithOverrides: 0,
          overriddenServiceIds: []
        }
      };
    }

    // Get all services for this vendor
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('status', 'approved');

    if (servicesError) {
      return {
        success: false,
        error: `Failed to get services: ${servicesError.message}`,
        affectedServices: {
          totalServices: 0,
          servicesUsingNewTier: 0,
          servicesWithOverrides: 0,
          overriddenServiceIds: []
        }
      };
    }

    const totalServices = services?.length || 0;
    let servicesWithOverrides = 0;
    const overriddenServiceIds: string[] = [];

    // Check each service for active pricing overrides (client-side effective date checks)
    const now = new Date();
    for (const svc of services || []) {
      const { data: overridesData, error: overridesError } = await supabase
        .from('service_pricing_overrides')
        .select('id, effective_from, effective_until, override_enabled')
        .eq('service_id', svc.id)
        .eq('override_enabled', true)
        .order('effective_from', { ascending: false });

      if (overridesError) {
        console.warn(`Error checking overrides for service ${svc.id}:`, overridesError);
        continue;
      }

      let hasActive = false;
      if (overridesData && overridesData.length > 0) {
        for (const o of overridesData) {
          try {
            const effFrom = o.effective_from ? new Date(o.effective_from) : null;
            const effUntil = o.effective_until ? new Date(o.effective_until) : null;
            if (effFrom && effFrom <= now && (!effUntil || effUntil >= now)) {
              hasActive = true;
              break;
            }
          } catch (e) {}
        }
      }

      if (hasActive) {
        servicesWithOverrides++;
        overriddenServiceIds.push(svc.id);
      }
    }

    const servicesUsingNewTier = totalServices - servicesWithOverrides;

    return {
      success: true,
      affectedServices: {
        totalServices,
        servicesUsingNewTier,
        servicesWithOverrides,
        overriddenServiceIds
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
      affectedServices: {
        totalServices: 0,
        servicesUsingNewTier: 0,
        servicesWithOverrides: 0,
        overriddenServiceIds: []
      }
    };
  }
}