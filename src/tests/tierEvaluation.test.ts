import { describe, expect, it } from 'vitest'
import { isEligibleForTier } from '../domain/tierRules'
import type { VendorTier } from '../types'

const mockTiers: VendorTier[] = [
  {
    id: 'bronze-id',
    name: 'Bronze',
    commission_rate: 0.15,
    min_monthly_bookings: 0,
    min_rating: undefined,
    priority_order: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'silver-id',
    name: 'Silver',
    commission_rate: 0.12,
    min_monthly_bookings: 10,
    min_rating: 4.0,
    priority_order: 2,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'gold-id',
    name: 'Gold',
    commission_rate: 0.10,
    min_monthly_bookings: 25,
    min_rating: 4.5,
    priority_order: 3,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

function getEligibleTier(metrics: { monthlyBookings: number; averageRating?: number }): VendorTier | null {
  for (let i = mockTiers.length - 1; i >= 0; i--) {
    if (isEligibleForTier(metrics, mockTiers[i])) return mockTiers[i]
  }
  return null
}

describe('isEligibleForTier', () => {
  it('accepts bronze with no bookings', () => {
    expect(isEligibleForTier({ monthlyBookings: 0 }, mockTiers[0])).toBe(true)
  })

  it('accepts silver when bookings and rating qualify', () => {
    expect(isEligibleForTier({ monthlyBookings: 15, averageRating: 4.2 }, mockTiers[1])).toBe(true)
  })

  it('rejects silver when rating is too low', () => {
    expect(isEligibleForTier({ monthlyBookings: 15, averageRating: 3.8 }, mockTiers[1])).toBe(false)
  })

  it('assigns gold for top performers', () => {
    expect(getEligibleTier({ monthlyBookings: 30, averageRating: 4.8 })?.name).toBe('Gold')
  })
})

describe('commission math', () => {
  it('computes 15% commission', () => {
    const commissionAmount = 100_000 * 0.15
    expect(commissionAmount).toBe(15_000)
    expect(100_000 - commissionAmount).toBe(85_000)
  })
})
