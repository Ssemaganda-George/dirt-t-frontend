import { describe, expect, it } from 'vitest'
import { finalizePlan, shouldSkipModel } from '../lib/tripPlanner/affordable'
import { parseBudget, serviceFitsBudget } from '../lib/tripPlanner/budget'
import { catalogToPromptText, isPlannerCatalogService } from '../lib/tripPlanner/catalog'
import { requestFromStatement } from '../lib/tripPlanner/intent'
import { extractJsonObject } from '../lib/tripPlanner/parse'
import { buildPlannerPrompt } from '../lib/tripPlanner/prompt'
import { reconcilePlan } from '../lib/tripPlanner/reconcile'
import type { CatalogService, TripRequest } from '../lib/tripPlanner/types'

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

const hotel: CatalogService = {
  ...kenya,
  id: 'hotel-1',
  title: 'Remmie Homes',
  category_id: 'cat_hotels',
  location: 'Entebbe',
  meeting_point: 'Entebbe',
  duration_days: null,
  price: 176000,
  currency: 'UGX',
  itinerary: [],
  tour_highlights: [],
  slug: 'remmie-homes',
}

const mugabi: CatalogService = {
  ...kenya,
  id: 'act-1',
  title: 'Tales of Mugabi',
  category_id: 'cat_activities',
  location: 'Kampala',
  meeting_point: 'Kampala',
  duration_days: null,
  price: 2000,
  currency: 'UGX',
  itinerary: [],
  tour_highlights: [],
  slug: 'tales-of-mugabi',
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
    expect(req.days).toBe(0)
  })

  it('does not invent a 7-day safari when the traveler only named a budget', () => {
    const req = requestFromStatement('i have 500 dollars')
    expect(req.days).toBe(0)
    expect(req.countries).toEqual([])
    expect(req.activities).toEqual([])
  })

  it('reads an explicit day count', () => {
    expect(requestFromStatement('5 days in Kenya').days).toBe(5)
    expect(requestFromStatement('5 days in Kenya').countries).toEqual(['Kenya'])
  })
})

describe('parseBudget', () => {
  it('reads 500 dollars as USD', () => {
    expect(parseBudget('i have 500 dollars')).toEqual({ amount: 500, currency: 'USD' })
  })

  it('reads $1000 as USD', () => {
    expect(parseBudget('I have $1000 and I want to tour Uganda')).toEqual({ amount: 1000, currency: 'USD' })
  })
})

describe('serviceFitsBudget', () => {
  it('keeps a Kampala hotel under $500 and rejects a $4250 Kenya safari', () => {
    const budget = { amount: 500, currency: 'USD' as const }
    expect(serviceFitsBudget(hotel, budget)).toBe(true)
    expect(serviceFitsBudget(kenya, budget)).toBe(false)
  })
})

describe('finalizePlan', () => {
  const catalog = [kenya, restaurant, hotel, mugabi]
  const budgetOnly: TripRequest = {
    countries: [],
    activities: [],
    days: 0,
    adults: 1,
    children: 0,
    extra_info: 'i have 500 dollars',
  }

  it('replaces an over-budget Kenya spine and empty days with what $500 can actually book', () => {
    const plan = finalizePlan(
      {
        title: '7-Day Kenya Wildlife Safari',
        days: [
          {
            day: 1,
            location: 'Nairobi, Kenya',
            slots: [
              {
                kind: 'wish',
                wish_title: '7-DAY KENYA WILDLIFE SAFARI',
                wish_category: 'tour_packages',
                wish_cost_band: 'luxury',
                why: 'exceeds your $500 budget',
              },
            ],
          },
          { day: 2, location: 'Masai Mara', slots: [] },
          { day: 3, location: 'Lake Nakuru', slots: [] },
        ],
      },
      catalog,
      budgetOnly
    )
    expect(plan.days.every((day) => day.slots.length > 0)).toBe(true)
    expect(plan.days.length).toBeLessThanOrEqual(3)
    const titles = plan.days.flatMap((day) => day.slots.map((slot) => slot.title))
    expect(titles).toContain('Remmie Homes')
    expect(titles.some((title) => title.toLowerCase().includes('kenya wildlife'))).toBe(false)
    expect(plan.days.some((day) => day.slots.some((slot) => slot.kind === 'bookable'))).toBe(true)
  })
})

describe('shouldSkipModel', () => {
  it('skips Gemma when $500 Kenya has no in-budget safari package', () => {
    expect(shouldSkipModel(requestFromStatement('I have $500 for 5 days in Kenya'), [kenya, hotel])).toBe(true)
  })
})

describe('buildPlannerPrompt', () => {
  it('does not assume safari or East Africa when the statement is budget-only', () => {
    const prompt = buildPlannerPrompt(
      'IN_BUDGET id=hotel-1',
      requestFromStatement('i have 500 dollars')
    )
    expect(prompt).not.toMatch(/activities=safari/i)
    expect(prompt).not.toMatch(/countries=East Africa/i)
    expect(prompt).toMatch(/in-budget/i)
  })
})

describe('catalogToPromptText', () => {
  it('marks the Kenya safari over a $500 budget and keeps the hotel in budget', () => {
    const text = catalogToPromptText([kenya, hotel], parseBudget('i have 500 dollars'))
    expect(text).toMatch(/OVER_BUDGET[\s\S]*7-DAY KENYA WILDLIFE SAFARI/)
    expect(text).toMatch(/IN_BUDGET[\s\S]*Remmie Homes/)
  })
})
