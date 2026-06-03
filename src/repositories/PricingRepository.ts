import { supabase } from '../lib/supabaseClient'
import type { PricingTier, ServicePricingOverride, PaymentCalculation, PricingPreview, TierCommissionResolve } from '../types'
import {
  normalizeFeePayer,
  applyFeePayerSplitFromPlatformFee,
  commissionPercentValueToRate,
  mapVendorTierRowToPricingTier,
  vendorTierCommissionRateForDb,
  effectiveVendorTierId,
} from '../services/PricingService'

function _pricingError(serviceId: string, basePrice: number): PaymentCalculation {
  return {
    success: false,
    error: 'Pricing unavailable',
    base_price: basePrice,
    platform_fee: 0,
    tourist_fee: 0,
    vendor_fee: 0,
    vendor_payout: basePrice,
    total_customer_payment: basePrice,
    fee_payer: 'vendor',
    pricing_source: 'tier',
    pricing_reference_id: '',
    service_id: serviceId,
  }
}

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
    vendor_percentage: null,
  })

  const { data: vt, error: vtErr } = await supabase
    .from('vendor_tiers')
    .select('id, commission_type, commission_value, commission_rate, effective_from, effective_until, is_active, fee_payer, tourist_percentage, vendor_percentage')
    .eq('id', currentTierId)
    .eq('is_active', true)
    .maybeSingle()

  if (!vt || vtErr) return empty()

  const effFrom = vt.effective_from ? new Date(vt.effective_from as string) : null
  const effUntil = vt.effective_until ? new Date(vt.effective_until as string) : null
  if (effFrom && effFrom > purchaseDate) return empty()
  if (effUntil && effUntil < purchaseDate) return empty()

  const feePayer = normalizeFeePayer(vt.fee_payer)
  const touristPct = vt.tourist_percentage != null && vt.tourist_percentage !== '' ? Number(vt.tourist_percentage) : null
  const vendorPct = vt.vendor_percentage != null && vt.vendor_percentage !== '' ? Number(vt.vendor_percentage) : null

  let platformFee = 0
  const vtCommissionType = (vt.commission_type || 'percentage') as 'percentage' | 'flat'
  if (vtCommissionType === 'flat') {
    platformFee = Number(vt.commission_value ?? 0)
  } else {
    const val = vt.commission_value != null ? Number(vt.commission_value) : null
    if (val != null && !Number.isNaN(val)) {
      platformFee = basePrice * commissionPercentValueToRate(val)
    }
  }

  return { platformFee, pricingReferenceId: vt.id as string, fee_payer: feePayer, tourist_percentage: touristPct, vendor_percentage: vendorPct }
}

async function _calculatePaymentLegacy(serviceId: string, basePriceOverride: number | null, purchaseDate: Date): Promise<PaymentCalculation> {
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id, price, vendor_id')
    .eq('id', serviceId)
    .single()

  if (serviceError || !service) return _pricingError(serviceId, basePriceOverride ?? 0)

  const basePrice = basePriceOverride ?? Number(service.price ?? 0)
  const { data: overridesData } = await supabase
    .from('service_pricing_overrides')
    .select('*')
    .eq('service_id', serviceId)
    .eq('override_enabled', true)
    .order('effective_from', { ascending: false })

  let override: any = null
  for (const o of overridesData || []) {
    try {
      const effFrom = o.effective_from ? new Date(o.effective_from) : null
      const effUntil = o.effective_until ? new Date(o.effective_until) : null
      if (effFrom && effFrom <= purchaseDate && (!effUntil || effUntil >= purchaseDate)) { override = o; break }
    } catch { /* skip unparseable dates */ }
  }

  if (override) {
    const platformFee = override.override_type === 'flat'
      ? Number(override.override_value)
      : basePrice * (Number(override.override_value) / 100)
    const feePayer = normalizeFeePayer(override.fee_payer)
    const split = applyFeePayerSplitFromPlatformFee(basePrice, platformFee, feePayer, override.tourist_percentage, override.vendor_percentage)
    return { success: true, base_price: basePrice, platform_fee: platformFee, ...split, fee_payer: feePayer, pricing_source: 'override', pricing_reference_id: override.id, service_id: serviceId }
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('current_tier_id, manual_tier_id, manual_tier_expires_at')
    .eq('id', service.vendor_id)
    .single()

  let platformFee = 0, pricingReferenceId = '', feePayer: 'vendor' | 'tourist' | 'shared' = 'vendor', touristPct: number | null = null, vendorPct: number | null = null
  const tierId = vendor ? effectiveVendorTierId(vendor) : null
  if (tierId) {
    const resolved = await resolveTierCommission(tierId, basePrice, purchaseDate)
    platformFee = resolved.platformFee; pricingReferenceId = resolved.pricingReferenceId
    feePayer = resolved.fee_payer; touristPct = resolved.tourist_percentage; vendorPct = resolved.vendor_percentage
  }

  const split = applyFeePayerSplitFromPlatformFee(basePrice, platformFee, feePayer, touristPct, vendorPct)
  return { success: true, base_price: basePrice, platform_fee: platformFee, ...split, fee_payer: feePayer, pricing_source: 'tier', pricing_reference_id: pricingReferenceId, service_id: serviceId }
}

export async function calculatePayment(serviceId: string, purchaseDate: Date = new Date()): Promise<PaymentCalculation> {
  try {
    const { data, error } = await supabase.rpc('get_effective_pricing', {
      p_service_id: serviceId,
      p_base_price: null,
      p_purchase_date: purchaseDate.toISOString(),
    })
    if (!error && data && data.success !== false) return { ...(data as PaymentCalculation), service_id: serviceId }
    if (error) console.warn('calculatePayment: RPC unavailable, using fallback', error.message)
    return _calculatePaymentLegacy(serviceId, null, purchaseDate)
  } catch (error) {
    console.error('Error calculating payment:', error)
    return _pricingError(serviceId, 0)
  }
}

export async function calculatePaymentForAmount(serviceId: string, basePrice: number, purchaseDate: Date = new Date()): Promise<PaymentCalculation> {
  try {
    const { data, error } = await supabase.rpc('get_effective_pricing', {
      p_service_id: serviceId,
      p_base_price: basePrice,
      p_purchase_date: purchaseDate.toISOString(),
    })
    if (!error && data && data.success !== false) return { ...(data as PaymentCalculation), service_id: serviceId }
    if (error) console.warn('calculatePaymentForAmount: RPC unavailable, using fallback', error.message)
    return _calculatePaymentLegacy(serviceId, basePrice, purchaseDate)
  } catch (error) {
    console.error('Error calculating payment for amount:', error)
    return _pricingError(serviceId, basePrice)
  }
}

export async function getActivePricingTiers(): Promise<PricingTier[]> {
  const { data, error } = await supabase
    .from('vendor_tiers')
    .select('*')
    .eq('is_active', true)
    .order('priority_order', { ascending: true })
  if (error) throw new Error(`Failed to get active tiers: ${error.message}`)
  return (data || []).map((row) => mapVendorTierRowToPricingTier(row as Record<string, unknown>))
}

export async function getVendorCountsByTier(): Promise<Record<string, number>> {
  try {
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('current_tier_id')
      .eq('status', 'approved')
      .not('current_tier_id', 'is', null)
    if (error) throw new Error(`Failed to get vendor tier counts: ${error.message}`)
    const counts: Record<string, number> = {}
    for (const v of vendors || []) {
      const tid = v.current_tier_id as string
      if (!tid) continue
      counts[tid] = (counts[tid] || 0) + 1
    }
    return counts
  } catch (error) {
    console.error('Error in getVendorCountsByTier:', error)
    return {}
  }
}

export async function getPricingTier(tierId: string): Promise<PricingTier | null> {
  const { data, error } = await supabase.from('vendor_tiers').select('*').eq('id', tierId).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to get tier: ${error.message}`)
  }
  return mapVendorTierRowToPricingTier(data as Record<string, unknown>)
}

export async function createPricingTier(
  tier: Omit<PricingTier, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
  adminId: string
): Promise<PricingTier> {
  const commissionRate = vendorTierCommissionRateForDb(tier.commission_type, Number(tier.commission_value))
  const fp = normalizeFeePayer(tier.fee_payer)
  let touristPct: number | null = null
  let vendorPct: number | null = null
  if (fp === 'shared') {
    touristPct = Number(tier.tourist_percentage ?? 0)
    vendorPct = Number(tier.vendor_percentage ?? 0)
    if (touristPct + vendorPct !== 100) throw new Error('Shared fee payer requires tourist and vendor percentages to sum to 100')
  }
  const { data, error } = await supabase.from('vendor_tiers').insert({
    name: tier.name, commission_type: tier.commission_type, commission_value: tier.commission_value,
    commission_rate: commissionRate, min_monthly_bookings: tier.min_monthly_bookings,
    min_rating: tier.min_rating ?? null, priority_order: tier.priority_order, is_active: tier.is_active,
    fee_payer: fp, tourist_percentage: touristPct, vendor_percentage: vendorPct,
    effective_from: tier.effective_from ? new Date(tier.effective_from).toISOString() : undefined,
    effective_until: tier.effective_until ? new Date(tier.effective_until).toISOString() : null,
    ...(adminId ? { created_by: adminId } : {}),
  }).select().single()
  if (error) throw new Error(`Failed to create tier: ${error.message}`)
  return mapVendorTierRowToPricingTier(data as Record<string, unknown>)
}

export async function updatePricingTier(tierId: string, updates: Partial<PricingTier>): Promise<PricingTier> {
  const { data: existing, error: fetchErr } = await supabase.from('vendor_tiers').select('*').eq('id', tierId).single()
  if (fetchErr || !existing) throw new Error(`Failed to load tier: ${fetchErr?.message || 'not found'}`)
  const commission_type = (updates.commission_type ?? existing.commission_type) as 'percentage' | 'flat'
  const commission_value = Number(updates.commission_value ?? existing.commission_value ?? 0)
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.commission_type !== undefined) payload.commission_type = updates.commission_type
  if (updates.commission_value !== undefined) payload.commission_value = updates.commission_value
  if (updates.min_monthly_bookings !== undefined) payload.min_monthly_bookings = updates.min_monthly_bookings
  if (updates.min_rating !== undefined) payload.min_rating = updates.min_rating
  if (updates.priority_order !== undefined) payload.priority_order = updates.priority_order
  if (updates.is_active !== undefined) payload.is_active = updates.is_active
  if (updates.effective_from !== undefined) payload.effective_from = updates.effective_from ? new Date(updates.effective_from).toISOString() : existing.effective_from
  if (updates.effective_until !== undefined) payload.effective_until = updates.effective_until ? new Date(updates.effective_until).toISOString() : null
  const existingFp = normalizeFeePayer((existing as Record<string, unknown>).fee_payer)
  const mergedFeePayer = updates.fee_payer !== undefined ? normalizeFeePayer(updates.fee_payer) : existingFp
  if (updates.fee_payer !== undefined) payload.fee_payer = mergedFeePayer
  if (updates.fee_payer !== undefined || updates.tourist_percentage !== undefined || updates.vendor_percentage !== undefined) {
    if (mergedFeePayer === 'shared') {
      const tp = updates.tourist_percentage !== undefined ? Number(updates.tourist_percentage) : Number((existing as Record<string, unknown>).tourist_percentage ?? 0)
      const vp = updates.vendor_percentage !== undefined ? Number(updates.vendor_percentage) : Number((existing as Record<string, unknown>).vendor_percentage ?? 0)
      if (tp + vp !== 100) throw new Error('Shared fee payer requires tourist and vendor percentages to sum to 100')
      payload.tourist_percentage = tp; payload.vendor_percentage = vp
    } else {
      payload.tourist_percentage = null; payload.vendor_percentage = null
    }
  }
  if (updates.commission_type !== undefined || updates.commission_value !== undefined) {
    payload.commission_rate = vendorTierCommissionRateForDb(commission_type, commission_value)
  }
  const { data, error } = await supabase.from('vendor_tiers').update(payload).eq('id', tierId).select().single()
  if (error) throw new Error(`Failed to update tier: ${error.message}`)
  return mapVendorTierRowToPricingTier(data as Record<string, unknown>)
}

export async function getServicePricingOverrides(serviceId: string): Promise<ServicePricingOverride[]> {
  const { data, error } = await supabase.from('service_pricing_overrides').select('*').eq('service_id', serviceId).order('effective_from', { ascending: false })
  if (error) throw new Error(`Failed to get service pricing overrides: ${error.message}`)
  return data || []
}

export async function getAllServicePricingOverrides(): Promise<ServicePricingOverride[]> {
  const { data, error } = await supabase.from('service_pricing_overrides').select('*, services(title, vendors(business_name))').order('effective_from', { ascending: false })
  if (error) throw new Error(`Failed to get all service pricing overrides: ${error.message}`)
  return data || []
}

export async function createServicePricingOverride(
  override: Omit<ServicePricingOverride, 'id' | 'created_at' | 'updated_at' | 'created_by'>,
  adminId: string
): Promise<ServicePricingOverride> {
  const validFeePayers = ['vendor', 'tourist', 'shared']
  const rawFeePayer = (override as any).fee_payer
  const feePayer = rawFeePayer == null ? null : String(rawFeePayer).trim().toLowerCase()
  if (!feePayer || !validFeePayers.includes(feePayer)) throw new Error(`Invalid fee_payer value: ${rawFeePayer}`)
  const { data, error } = await supabase.from('service_pricing_overrides').insert({ ...override, fee_payer: feePayer, created_by: adminId }).select().single()
  if (error) throw new Error(`Failed to create service pricing override: ${error.message}`)
  return data
}

export async function updateServicePricingOverride(overrideId: string, updates: Partial<ServicePricingOverride>): Promise<ServicePricingOverride> {
  const validFeePayers = ['vendor', 'tourist', 'shared']
  if (Object.prototype.hasOwnProperty.call(updates as any, 'fee_payer')) {
    const raw = (updates as any).fee_payer
    const normalized = raw == null ? null : String(raw).trim().toLowerCase()
    if (!normalized || !validFeePayers.includes(normalized)) throw new Error(`Invalid fee_payer value in update: ${raw}`)
    ;(updates as any).fee_payer = normalized as any
  }
  const sanitizedUpdates: any = {}
  Object.keys(updates).forEach((k) => { const val = (updates as any)[k]; if (typeof val !== 'undefined') sanitizedUpdates[k] = val })
  const { data, error } = await supabase.from('service_pricing_overrides').update(sanitizedUpdates).eq('id', overrideId).select().single()
  if (error) throw new Error(`Failed to update service pricing override: ${error.message}`)
  return data
}

export async function deleteServicePricingOverride(overrideId: string): Promise<void> {
  const { error } = await supabase.from('service_pricing_overrides').delete().eq('id', overrideId)
  if (error) throw new Error(`Failed to delete service pricing override: ${error.message}`)
}

export async function getPricingPreview(serviceId: string, purchaseDate: Date = new Date()): Promise<PricingPreview> {
  const calculation = await calculatePayment(serviceId, purchaseDate)
  if (!calculation.success) throw new Error(calculation.error || 'Failed to calculate pricing')
  const fp = calculation.fee_payer
  const appliedRule = calculation.pricing_source === 'override'
    ? `Service override (${fp} pays fee)`
    : fp === 'shared' ? 'Vendor tier commission (shared fee)' : `Vendor tier commission (${fp} pays fee)`
  return { base_price: calculation.base_price, platform_fee: calculation.platform_fee, tourist_fee: calculation.tourist_fee, vendor_fee: calculation.vendor_fee, vendor_payout: calculation.vendor_payout, total_customer_payment: calculation.total_customer_payment, fee_payer: fp, pricing_source: calculation.pricing_source, applied_rule: appliedRule, pricing_reference_id: calculation.pricing_reference_id }
}

export async function getPricingPreviewForAmount(serviceId: string, basePricePerUnit: number, purchaseDate: Date = new Date()): Promise<PricingPreview> {
  const calculation = await calculatePaymentForAmount(serviceId, basePricePerUnit, purchaseDate)
  if (!calculation.success) throw new Error(calculation.error || 'Failed to calculate pricing')
  const fp = calculation.fee_payer
  const appliedRule = calculation.pricing_source === 'override'
    ? `Service override (${fp} pays fee)`
    : fp === 'shared' ? 'Vendor tier commission (shared fee)' : `Vendor tier commission (${fp} pays fee)`
  return { base_price: calculation.base_price, platform_fee: calculation.platform_fee, tourist_fee: calculation.tourist_fee, vendor_fee: calculation.vendor_fee, vendor_payout: calculation.vendor_payout, total_customer_payment: calculation.total_customer_payment, fee_payer: fp, pricing_source: calculation.pricing_source, applied_rule: appliedRule, pricing_reference_id: calculation.pricing_reference_id }
}

export async function getVendorCurrentTier(vendorId: string): Promise<PricingTier | null> {
  const { data, error } = await supabase.from('vendors').select('current_tier_id, manual_tier_id, manual_tier_expires_at').eq('id', vendorId).single()
  if (error || !data) return null
  const tierId = effectiveVendorTierId(data)
  if (!tierId) return null
  const { data: vt, error: vtError } = await supabase.from('vendor_tiers').select('*').eq('id', tierId).eq('is_active', true).single()
  if (!vt || vtError) return null
  const ct = (vt.commission_type || 'percentage') as 'percentage' | 'flat'
  let displayValue: number
  if (ct === 'flat') {
    displayValue = Number(vt.commission_value ?? 0)
  } else if (vt.commission_value != null && vt.commission_value !== '') {
    const n = Number(vt.commission_value)
    displayValue = n > 1 ? n : n * 100
  } else {
    const r = Number(vt.commission_rate ?? 0)
    displayValue = r <= 1 ? r * 100 : r
  }
  return { ...mapVendorTierRowToPricingTier(vt as Record<string, unknown>), commission_type: ct, commission_value: displayValue }
}

export async function updateVendorTier(vendorId: string, tierId: string): Promise<void> {
  const { error } = await supabase.from('vendors').update({ current_tier_id: tierId }).eq('id', vendorId)
  if (error) throw new Error(`Failed to update vendor tier: ${error.message}`)
}

export async function searchServices(searchTerm: string, limit: number = 10): Promise<any[]> {
  if (!searchTerm.trim()) return []
  const trimmedTerm = searchTerm.trim()
  const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  let exactIdMatch: any[] = []
  if (isValidUUID(trimmedTerm)) {
    const { data } = await supabase.from('services').select('id, title, vendors!inner(business_name), service_categories(name)').eq('id', trimmedTerm).limit(1)
    exactIdMatch = data || []
  }
  const { data: nameMatches } = await supabase.from('services').select('id, title, vendors!inner(business_name), service_categories(name)').ilike('title', `%${trimmedTerm}%`).limit(limit)
  const results: any[] = [...exactIdMatch]
  if (nameMatches) results.push(...nameMatches.filter(s => !results.some(e => e.id === s.id)))
  return results.slice(0, limit)
}

export async function updateVendorTierWithServiceImpact(vendorId: string, tierId: string, _metrics?: { monthlyBookings?: number; averageRating?: number }): Promise<{ success: boolean; error?: string; affectedServices: { totalServices: number; servicesUsingNewTier: number; servicesWithOverrides: number; overriddenServiceIds: string[] } }> {
  try {
    const { data: vt, error: vtError } = await supabase.from('vendor_tiers').select('commission_type, commission_value').eq('id', tierId).eq('is_active', true).maybeSingle()
    if (!vt || vtError) return { success: false, error: 'Tier not found in vendor_tiers', affectedServices: { totalServices: 0, servicesUsingNewTier: 0, servicesWithOverrides: 0, overriddenServiceIds: [] } }
    const { data: services, error: servicesError } = await supabase.from('services').select('id').eq('vendor_id', vendorId).eq('status', 'approved')
    if (servicesError) return { success: false, error: `Failed to get services: ${servicesError.message}`, affectedServices: { totalServices: 0, servicesUsingNewTier: 0, servicesWithOverrides: 0, overriddenServiceIds: [] } }
    const totalServices = services?.length || 0
    let servicesWithOverrides = 0; const overriddenServiceIds: string[] = []; const now = new Date()
    for (const svc of services || []) {
      const { data: overridesData } = await supabase.from('service_pricing_overrides').select('id, effective_from, effective_until, override_enabled').eq('service_id', svc.id).eq('override_enabled', true).order('effective_from', { ascending: false })
      let hasActive = false
      for (const o of overridesData || []) {
        try {
          const effFrom = o.effective_from ? new Date(o.effective_from) : null
          const effUntil = o.effective_until ? new Date(o.effective_until) : null
          if (effFrom && effFrom <= now && (!effUntil || effUntil >= now)) { hasActive = true; break }
        } catch (e) {}
      }
      if (hasActive) { servicesWithOverrides++; overriddenServiceIds.push(svc.id) }
    }
    return { success: true, affectedServices: { totalServices, servicesUsingNewTier: totalServices - servicesWithOverrides, servicesWithOverrides, overriddenServiceIds } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error occurred', affectedServices: { totalServices: 0, servicesUsingNewTier: 0, servicesWithOverrides: 0, overriddenServiceIds: [] } }
  }
}
