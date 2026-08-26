import { describe, expect, it } from 'vitest'
import { emptyAdminVisitorStats, mapAdminVisitorStats } from '../lib/adminVisitorStats'

describe('mapAdminVisitorStats', () => {
  it('returns empty stats when the RPC payload is missing', () => {
    expect(mapAdminVisitorStats(null)).toEqual(emptyAdminVisitorStats)
  })

  it('maps visit counts and countries from the admin RPC', () => {
    const mapped = mapAdminVisitorStats({
      totalVisitors: 23803,
      uniqueVisitors: 1375,
      avgSessionDuration: 4.2,
      bounceRate: 61.5,
      topCountries: [{ country: 'Uganda', count: 871, percentage: '63.3' }],
      topLikedServices: [
        {
          id: 'svc-1',
          serviceName: '10-day safari',
          category: 'tours',
          totalLikes: 0,
          avgRating: 4.5,
        },
      ],
      recentReviews: [
        {
          id: 'rev-1',
          serviceName: '10-day safari',
          rating: 5,
          comment: 'Great',
          visitorName: 'Ada',
          date: '2026-08-01T00:00:00Z',
          helpful: 1,
        },
      ],
      reviewsThisMonth: 2,
      avgRating: 4.5,
    })

    expect(mapped.totalVisitors).toBe(23803)
    expect(mapped.uniqueVisitors).toBe(1375)
    expect(mapped.topCountries[0]).toEqual({ country: 'Uganda', count: 871, percentage: '63.3' })
    expect(mapped.ageGroups).toEqual([])
    expect(mapped.recentReviews).toHaveLength(1)
    expect(mapped.avgRating).toBe(4.5)
  })
})
