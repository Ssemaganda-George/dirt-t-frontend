// Pure pricing math — no I/O, no Supabase dependency.
// Move calculation logic here; DB lookups belong in PricingRepository.
import type { PaymentCalculation, PricingTier } from '../types'

export function commissionPercentValueToRate(value: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 1) return Math.min(1, n / 100)
  return Math.min(1, n)
}

const VALID_FEE_PAYERS = ['vendor', 'tourist', 'shared'] as const

export function normalizeFeePayer(raw: unknown): 'vendor' | 'tourist' | 'shared' {
  const s = String(raw ?? 'vendor').trim().toLowerCase()
  return (VALID_FEE_PAYERS as readonly string[]).includes(s)
    ? (s as 'vendor' | 'tourist' | 'shared')
    : 'vendor'
}

export function applyFeePayerSplitFromPlatformFee(
  basePrice: number,
  platformFee: number,
  feePayer: 'vendor' | 'tourist' | 'shared',
  touristPct?: number | null,
  vendorPct?: number | null
): Pick<PaymentCalculation, 'tourist_fee' | 'vendor_fee' | 'vendor_payout' | 'total_customer_payment'> {
  const tp = Number(touristPct ?? 0)
  const vp = Number(vendorPct ?? 0)
  if (feePayer === 'shared') {
    const touristFee = platformFee * (tp / 100)
    const vendorFee = platformFee * (vp / 100)
    return {
      tourist_fee: touristFee,
      vendor_fee: vendorFee,
      total_customer_payment: basePrice + touristFee,
      vendor_payout: basePrice - vendorFee,
    }
  }
  if (feePayer === 'tourist') {
    return {
      tourist_fee: platformFee,
      vendor_fee: 0,
      total_customer_payment: basePrice + platformFee,
      vendor_payout: basePrice,
    }
  }
  return {
    tourist_fee: 0,
    vendor_fee: platformFee,
    total_customer_payment: basePrice,
    vendor_payout: basePrice - platformFee,
  }
}

export function customerTotalFromUnitPricingCalc(
  calc: PaymentCalculation | null | undefined,
  billableUnits: number,
  fallbackTotal: number
): number {
  if (!calc || calc.success === false) return fallbackTotal
  return Number(calc.total_customer_payment) * billableUnits
}

export function customerTotalFromAggregatePricingCalc(
  calc: PaymentCalculation | null | undefined,
  fallbackTotal: number
): number {
  if (!calc || calc.success === false) return fallbackTotal
  return Number(calc.total_customer_payment)
}

export function touristFeeTotalFromUnitCalc(
  calc: PaymentCalculation | null | undefined,
  billableUnits: number,
  legacyPerUnitEstimate: number
): number {
  if (!calc || calc.success === false) return legacyPerUnitEstimate * billableUnits
  return Number(calc.tourist_fee) * billableUnits
}

export function effectiveVendorTierId(v: {
  current_tier_id: string | null
  manual_tier_id?: string | null
  manual_tier_expires_at?: string | null
}): string | null {
  const manualActive =
    !!v.manual_tier_id &&
    (!v.manual_tier_expires_at || new Date(v.manual_tier_expires_at) > new Date())
  if (manualActive) return v.manual_tier_id!
  return v.current_tier_id
}

export function mapVendorTierRowToPricingTier(vt: Record<string, unknown>): PricingTier {
  const effFrom =
    (vt.effective_from as string | undefined) ??
    (vt.created_at as string | undefined) ??
    new Date().toISOString()
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
    updated_at: (vt.updated_at as string) ?? '',
  }
}

export function vendorTierCommissionRateForDb(
  commissionType: 'percentage' | 'flat',
  commissionValue: number
): number {
  if (commissionType === 'flat') return 0
  const n = Number(commissionValue)
  if (!Number.isFinite(n) || n < 0) return 0
  const rate = n > 1 ? n / 100 : n
  return Math.min(1, Math.max(0, rate))
}
