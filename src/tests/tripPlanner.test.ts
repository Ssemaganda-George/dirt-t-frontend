import { describe, expect, it } from 'vitest'
import { isPlannerCatalogService } from '../lib/tripPlanner/catalog'
import { requestFromStatement } from '../lib/tripPlanner/intent'
import { extractJsonObject } from '../lib/tripPlanner/parse'
import { reconcilePlan } from '../lib/tripPlanner/reconcile'
import type { CatalogService } from '../lib/tripPlanner/types'

const kenya: CatalogService = {
  id: '58629acc-cb1a-4b22-911d-a5d714638419',
  title: '7-DAY KENYA WILDLIFE SAFARI',
  category_id: 'cat_tour_packages',
  location: 'Kenya',
  meeting_point: 'Nairobi',
  duration_days: 7,
  price: 4250,
  currency: 'USD',
  itinerary: ['Day 1: Nairobi – Masai Mara'],
  tour_highlights: ['Masai Mara'],
  slug: '7-day-kenya',
  vendor_id: 'vendor-1',
  status: 'approved',
}

const shop: CatalogService = {
  ...kenya,
  id: 'shop-1',
  title: 'Lady hand bag',
  category_id: 'cat_shops',
  price: 100000,
  currency: 'UGX',
  itinerary: [],
}

const restaurant: CatalogService = {
  ...kenya,
  id: 'rest-1',
  title: 'Luwombo Restaurant',
  category_id: 'cat_restaurants',
  location: 'Kireka',
  price: 17000,
  currency: 'UGX',
  itinerary: [],
}

const unpricedVan: CatalogService = {
  ...kenya,
  id: 'van-1',
  title: 'PRADO TX',
  category_id: 'cat_transport',
  price: 0,
  currency: 'UGX',
  itinerary: [],
}

describe('isPlannerCatalogService', () => {
  it('includes approved priced tours', () => {
    expect(isPlannerCatalogService(kenya)).toBe(true)
  })

  it('excludes shops', () => {
    expect(isPlannerCatalogService(shop)).toBe(false)
  })

  it('includes restaurants even though they are reservation-only', () => {
    expect(isPlannerCatalogService(restaurant)).toBe(true)
  })

  it('excludes unpriced non-restaurants', () => {
    expect(isPlannerCatalogService(unpricedVan)).toBe(false)
  })
})

describe('extractJsonObject', () => {
  it('parses a fenced JSON object', () => {
    const raw = 'Here you go\n```json\n{"title":"Kenya week","days":[]}\n```'
    expect(extractJsonObject(raw)).toEqual({ title: 'Kenya week', days: [] })
  })
})

describe('reconcilePlan', () => {
  const catalog = [kenya, restaurant]

  it('attaches DB price to a bookable tour and ignores model numbers', () => {
    const plan = reconcilePlan(
      {
        title: '7 days Kenya',
        days: [
          {
            day: 1,
            location: 'Kenya',
            slots: [
              {
                kind: 'bookable',
                service_id: kenya.id,
                why: 'Fits a one-week wildlife trip',
                guests: 2,
              },
            ],
          },
        ],
      },
      catalog
    )
    expect(plan.days[0].slots[0].kind).toBe('bookable')
    expect(plan.days[0].slots[0].price).toBe(4250)
    expect(plan.days[0].slots[0].currency).toBe('USD')
    expect(plan.days[0].slots[0].title).toBe(kenya.title)
  })

  it('drops hallucinated service ids', () => {
    const plan = reconcilePlan(
      {
        title: 'x',
        days: [{ day: 1, slots: [{ kind: 'bookable', service_id: 'not-a-real-id' }] }],
      },
      catalog
    )
    expect(plan.days[0].slots).toHaveLength(0)
  })

  it('forces restaurants to reservation with no price', () => {
    const plan = reconcilePlan(
      {
        title: 'x',
        days: [
          {
            day: 1,
            slots: [{ kind: 'bookable', service_id: restaurant.id }],
          },
        ],
      },
      catalog
    )
    expect(plan.days[0].slots[0].kind).toBe('reservation')
    expect(plan.days[0].slots[0].price).toBeNull()
  })

  it('keeps wish slots without a numeric price', () => {
    const plan = reconcilePlan(
      {
        title: 'x',
        days: [
          {
            day: 2,
            slots: [
              {
                kind: 'wish',
                wish_title: 'Mara balloon flight',
                wish_category: 'activities',
                wish_cost_band: 'mid',
              },
            ],
          },
        ],
      },
      catalog
    )
    expect(plan.days[0].slots[0].kind).toBe('wish')
    expect(plan.days[0].slots[0].price).toBeNull()
    expect(plan.days[0].slots[0].wish_title).toBe('Mara balloon flight')
  })
})

describe('requestFromStatement', () => {
  it('keeps the sentence and pulls Uganda out of a budget prompt', () => {
    const req = requestFromStatement('I have $1000 and I want to tour Uganda')
    expect(req.extra_info).toBe('I have $1000 and I want to tour Uganda')
    expect(req.countries).toEqual(['Uganda'])
    expect(req.days).toBe(7)
  })

  it('reads an explicit day count', () => {
    expect(requestFromStatement('5 days in Kenya').days).toBe(5)
    expect(requestFromStatement('5 days in Kenya').countries).toEqual(['Kenya'])
  })
})
