import type { VendorTier } from '../types'

/** Pure tier eligibility — no database or Supabase dependency. */
export function isEligibleForTier(
  metrics: { monthlyBookings: number; averageRating?: number },
  tier: VendorTier
): boolean {
  if (metrics.monthlyBookings < tier.min_monthly_bookings) {
    return false
  }

  if (tier.min_rating !== null && tier.min_rating !== undefined) {
    if (!metrics.averageRating || metrics.averageRating < tier.min_rating) {
      return false
    }
  }

  return true
}
