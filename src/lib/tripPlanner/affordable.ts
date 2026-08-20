import { parseBudget, formatBudget, priceInUgx, serviceFitsBudget } from './budget'
import { reconcilePlan } from './reconcile'
import {
  RESTAURANT_CATEGORY,
  TOUR_CATEGORY,
  type CatalogService,
  type RawPlan,
  type ReconciledDay,
  type ReconciledPlan,
  type ReconciledSlot,
  type TripRequest,
} from './types'

export function collapseEmptyDays(plan: ReconciledPlan): ReconciledPlan {
  return {
    ...plan,
    days: plan.days
      .filter((day) => day.slots.length > 0)
      .map((day, i) => ({ ...day, day: i + 1 })),
  }
}

export function isWeakPlan(plan: ReconciledPlan, catalog: CatalogService[], request: TripRequest): boolean {
  if (plan.days.length === 0 || plan.days.some((day) => day.slots.length === 0)) return true
  const budget = parseBudget(request.extra_info)
  if (!budget) return false
  const affordable = catalog.filter(
    (service) => service.category_id !== RESTAURANT_CATEGORY && serviceFitsBudget(service, budget)
  )
  if (affordable.length === 0) return false
  return !plan.days.some((day) =>
    day.slots.some(
      (slot) => slot.kind === 'bookable' && slot.service_id && affordable.some((service) => service.id === slot.service_id)
    )
  )
}

function bookableSlot(service: CatalogService, why: string): ReconciledSlot {
  return {
    kind: 'bookable',
    service_id: service.id,
    title: service.title.trim(),
    time: null,
    guests: 1,
    why,
    wish_title: null,
    wish_category: null,
    wish_cost_band: null,
    price: Number(service.price),
    currency: service.currency,
    slug: service.slug || null,
    itinerary: service.itinerary || [],
  }
}

function reservationSlot(service: CatalogService): ReconciledSlot {
  return {
    kind: 'reservation',
    service_id: service.id,
    title: service.title.trim(),
    time: null,
    guests: 1,
    why: 'Reservation only — no payment on DirtTrails.',
    wish_title: null,
    wish_category: null,
    wish_cost_band: null,
    price: null,
    currency: null,
    slug: service.slug || null,
    itinerary: [],
  }
}

function matchesCountry(service: CatalogService, countries: string[]): boolean {
  if (!countries.length) return false
  const hay = `${service.title} ${service.location || ''} ${service.meeting_point || ''}`.toLowerCase()
  return countries.some((country) => hay.includes(country.toLowerCase()))
}

export function buildAffordablePlan(catalog: CatalogService[], request: TripRequest): ReconciledPlan {
  const budget = parseBudget(request.extra_info)
  const affordable = catalog
    .filter((service) => service.category_id !== RESTAURANT_CATEGORY && serviceFitsBudget(service, budget))
    .sort((a, b) => priceInUgx(a) - priceInUgx(b))

  const pick = (categoryId: string) =>
    affordable.find((service) => service.category_id === categoryId && matchesCountry(service, request.countries)) ||
    affordable.find((service) => service.category_id === categoryId)

  const tour = pick(TOUR_CATEGORY)
  const hotel = pick('cat_hotels')
  const activity = pick('cat_activities')
  const transport = pick('cat_transport')
  const restaurant = catalog.find((service) => service.category_id === RESTAURANT_CATEGORY)
  const overTour = catalog
    .filter((service) => service.category_id === TOUR_CATEGORY && budget && !serviceFitsBudget(service, budget))
    .filter((service) => matchesCountry(service, request.countries))
    .sort((a, b) => priceInUgx(a) - priceInUgx(b))[0]

  const why = budget ? `Fits a ${formatBudget(budget)} trip.` : 'Available on DirtTrails.'
  const days: ReconciledDay[] = []

  if (tour) {
    days.push({
      day: 1,
      date: null,
      location: tour.meeting_point || tour.location,
      narrative: null,
      slots: [bookableSlot(tour, why)],
    })
  } else {
    const day1: ReconciledSlot[] = []
    if (hotel) day1.push(bookableSlot(hotel, why))
    if (restaurant) day1.push(reservationSlot(restaurant))
    if (day1.length) {
      days.push({
        day: 1,
        date: null,
        location: hotel?.location || restaurant?.location || null,
        narrative: null,
        slots: day1,
      })
    }
    const day2: ReconciledSlot[] = []
    if (activity) day2.push(bookableSlot(activity, why))
    if (transport) day2.push(bookableSlot(transport, why))
    if (day2.length) {
      days.push({
        day: days.length + 1,
        date: null,
        location: activity?.location || transport?.location || null,
        narrative: null,
        slots: day2,
      })
    }
  }

  if (overTour && days[0]) {
    days[0].slots.push({
      kind: 'wish',
      service_id: null,
      title: overTour.title.trim(),
      time: null,
      guests: 1,
      why: `${overTour.title.trim()} starts at ${overTour.price} ${overTour.currency} — over your ${budget ? formatBudget(budget) : 'budget'}. Request it if you can stretch.`,
      wish_title: overTour.title.trim(),
      wish_category: 'tour_packages',
      wish_cost_band: 'luxury',
      price: null,
      currency: null,
      slug: null,
      itinerary: [],
    })
  }

  if (days.length === 0) {
    days.push({
      day: 1,
      date: null,
      location: null,
      narrative: null,
      slots: [
        {
          kind: 'wish',
          service_id: null,
          title: budget ? `Nothing listed under ${formatBudget(budget)}` : 'No matching listing',
          time: null,
          guests: 1,
          why: 'Tell us the country and dates and we will request a vendor.',
          wish_title: budget ? `Nothing listed under ${formatBudget(budget)}` : 'No matching listing',
          wish_category: 'tour_packages',
          wish_cost_band: 'budget',
          price: null,
          currency: null,
          slug: null,
          itinerary: [],
        },
      ],
    })
  }

  const maxDays = request.days > 0 ? Math.min(request.days, 3) : 3
  const trimmedDays = days.slice(0, maxDays).map((day, i) => ({ ...day, day: i + 1 }))
  const totals = new Map<string, number>()
  for (const day of trimmedDays) {
    for (const slot of day.slots) {
      if (slot.kind !== 'bookable' || slot.price == null || !slot.currency) continue
      totals.set(slot.currency, (totals.get(slot.currency) || 0) + slot.price)
    }
  }
  const title = tour
    ? tour.title.trim()
    : budget
      ? `What ${formatBudget(budget)} can book on DirtTrails`
      : 'Your DirtTrails trip'
  return {
    title,
    advisor_note: budget
      ? `We stayed inside ${formatBudget(budget)} using what DirtTrails actually sells. Want a different city or dates?`
      : 'Here is what we can book from the live catalog. Want to adjust destination or dates?',
    cost_summary: Array.from(totals.entries()).map(([currency, bookable_total]) => ({ currency, bookable_total })),
    sources: [],
    days: trimmedDays,
  }
}

export function finalizePlan(raw: RawPlan, catalog: CatalogService[], request: TripRequest): ReconciledPlan {
  const plan = collapseEmptyDays(reconcilePlan(raw, catalog))
  if (isWeakPlan(plan, catalog, request)) return buildAffordablePlan(catalog, request)
  return plan
}

export function shouldSkipModel(request: TripRequest, catalog: CatalogService[] = []): boolean {
  const budget = parseBudget(request.extra_info)
  if (budget && request.countries.length === 0 && request.days === 0 && request.activities.length === 0) return true
  if (!budget || catalog.length === 0) return false
  const inBudgetTours = catalog.filter(
    (service) => service.category_id === TOUR_CATEGORY && serviceFitsBudget(service, budget)
  )
  const matching = request.countries.length
    ? inBudgetTours.filter((service) => matchesCountry(service, request.countries))
    : inBudgetTours
  return matching.length === 0
}
