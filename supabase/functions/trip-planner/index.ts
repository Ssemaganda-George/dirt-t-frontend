import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHOP_CATEGORY = 'cat_shops'
const RESTAURANT_CATEGORY = 'cat_restaurants'
const TOUR_CATEGORY = 'cat_tour_packages'
const MAX_PLANS_PER_DAY = 5
const UGX_PER_USD = 3700
const GEMMA_TIMEOUT_MS = 18000
const LISTABLE_STATUS = new Set(['approved', 'active'])

type CatalogService = {
  id: string
  title: string
  category_id: string
  location: string | null
  meeting_point: string | null
  duration_days: number | null
  price: number
  currency: string
  itinerary: string[]
  tour_highlights: string[]
  slug?: string | null
  vendor_id?: string | null
  status: string
}

type NamedBudget = { amount: number; currency: 'USD' | 'UGX' }

type TripRequest = {
  countries: string[]
  activities: string[]
  days: number
  start_date: string | null
  adults: number
  children: number
  extra_info: string | null
}

type ReconciledSlot = {
  kind: 'bookable' | 'wish' | 'reservation'
  service_id: string | null
  title: string
  time: string | null
  guests: number | null
  why: string | null
  wish_title: string | null
  wish_category: string | null
  wish_cost_band: 'budget' | 'mid' | 'luxury' | null
  price: number | null
  currency: string | null
  slug: string | null
  itinerary: string[]
}

type ReconciledDay = {
  day: number
  date: string | null
  location: string | null
  slots: ReconciledSlot[]
}

type ReconciledPlan = { title: string; days: ReconciledDay[] }

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0
  return Number(raw.replace(/,/g, ''))
}

function parseBudget(text?: string | null): NamedBudget | null {
  if (!text) return null
  const usd = text.match(/\$\s*([\d,]+(?:\.\d+)?)|\b([\d,]+(?:\.\d+)?)\s*(?:usd|dollars?)\b/i)
  if (usd) {
    const amount = parseAmount(usd[1] || usd[2])
    if (amount > 0) return { amount, currency: 'USD' }
  }
  const ugx = text.match(/\b(?:ugx|ush)\s*([\d,]+(?:\.\d+)?)|\b([\d,]+(?:\.\d+)?)\s*(?:ugx|ush)\b/i)
  if (ugx) {
    const amount = parseAmount(ugx[1] || ugx[2])
    if (amount > 0) return { amount, currency: 'UGX' }
  }
  return null
}

function toUgx(amount: number, currency: string): number {
  return currency.toUpperCase() === 'USD' ? amount * UGX_PER_USD : amount
}

function priceInUgx(service: CatalogService): number {
  return toUgx(Number(service.price) || 0, service.currency || 'UGX')
}

function serviceFitsBudget(service: CatalogService, budget: NamedBudget | null): boolean {
  if (!budget) return true
  if (service.category_id === RESTAURANT_CATEGORY) return true
  return priceInUgx(service) <= toUgx(budget.amount, budget.currency)
}

function formatBudget(budget: NamedBudget): string {
  return budget.currency === 'USD' ? `$${budget.amount}` : `${budget.amount} UGX`
}

function isPlannerCatalogService(service: CatalogService): boolean {
  if (!LISTABLE_STATUS.has(service.status)) return false
  if (service.category_id === SHOP_CATEGORY) return false
  if (service.category_id === RESTAURANT_CATEGORY) return true
  return Number(service.price) > 0
}

function catalogToPromptText(services: CatalogService[], budget: NamedBudget | null): string {
  return [...services]
    .sort((a, b) => {
      const aFit = serviceFitsBudget(a, budget) ? 0 : 1
      const bFit = serviceFitsBudget(b, budget) ? 0 : 1
      return aFit - bFit
    })
    .map((s) => {
      const inBudget = serviceFitsBudget(s, budget)
      const loc = s.meeting_point || s.location || 'unspecified'
      const days = s.duration_days ? `${s.duration_days}d` : null
      const itinerary = inBudget && s.category_id === TOUR_CATEGORY ? (s.itinerary || []).slice(0, 4).join(' | ') : null
      return [
        inBudget ? 'IN_BUDGET' : 'OVER_BUDGET',
        `id=${s.id}`,
        `category=${s.category_id}`,
        `title=${s.title.trim()}`,
        `location=${loc}`,
        days ? `duration=${days}` : null,
        `price=${s.price} ${s.currency}`,
        itinerary ? `itinerary=${itinerary}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
    })
    .join('\n')
}

function buildPlannerPrompt(catalogText: string, request: TripRequest): string {
  const countries = request.countries.length ? request.countries.join(', ') : 'not specified — do not assume Kenya or East Africa'
  const activities = request.activities.length ? request.activities.join(', ') : 'not specified — do not assume safari'
  const statement = request.extra_info?.trim() || 'none'
  const budget = parseBudget(request.extra_info)
  const days = request.days > 0 ? String(request.days) : 'not specified — plan 1-3 days from in-budget listings'
  return `You are the DirtTrails trip planner. You compose trips ONLY from the catalog below.

Rules:
- The traveler's statement is the request. Infer destination, duration, party size, and budget from it.
- Do not assume safari, Kenya, or 7 days unless they said so.
- BOOKABLE slots must use IN_BUDGET catalog ids. Never mark an OVER_BUDGET id as bookable. Never invent a cheaper price.
- If no tour package is IN_BUDGET, stitch in-budget hotels, transport, and activities. That is the trip.
- OVER_BUDGET tours may appear once as a WISH upgrade only if the traveler named that country. Never use them as the trip title or as empty day 2–7 locations.
- Every day must have at least one slot. Omit empty days.
- Prefer ONE in-budget tour package as the spine. Do not break a multi-day package into fake daily bookings.
- Never use shops. Never invent a service_id.
- Restaurants are reservations, not bookable, not priced.
- Output compact JSON only, matching:
{"title": string, "days":[{"day": number, "date": string|null, "location": string|null, "slots":[{"kind":"bookable"|"wish"|"reservation","service_id": string|null,"time": string|null,"guests": number|null,"why": string|null,"wish_title": string|null,"wish_category": string|null,"wish_cost_band":"budget"|"mid"|"luxury"|null}]}]}

Traveler statement:
${statement}

Structured hints (may be empty; statement wins):
countries=${countries}
activities=${activities}
days=${days}
budget=${budget ? formatBudget(budget) : 'not specified'}
start_date=${request.start_date || 'flexible'}
adults=${request.adults}
children=${request.children}

Catalog:
${catalogText}
`
}

function extractJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] || text).trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Planner model returned no JSON object')
  const parsed = JSON.parse(candidate.slice(start, end + 1))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Planner model JSON was not an object')
  }
  return parsed as Record<string, unknown>
}

function costBand(raw: unknown): 'budget' | 'mid' | 'luxury' | null {
  const v = String(raw || '').trim().toLowerCase()
  return v === 'budget' || v === 'mid' || v === 'luxury' ? v : null
}

function reconcilePlan(raw: Record<string, unknown>, catalog: CatalogService[]): ReconciledPlan {
  const index = new Map(catalog.map((s) => [s.id, s]))
  const rawDays = (Array.isArray(raw.days) ? raw.days : []) as Record<string, unknown>[]
  const days = rawDays.map((dayRaw, i) => {
    const slots = (Array.isArray(dayRaw.slots) ? dayRaw.slots : []) as Record<string, unknown>[]
    const reconciledSlots = slots
      .map((slotRaw) => {
        const kind = String(slotRaw.kind || '').toLowerCase()
        const base = {
          service_id: null as string | null,
          time: slotRaw.time ? String(slotRaw.time) : null,
          guests: typeof slotRaw.guests === 'number' ? slotRaw.guests : null,
          why: slotRaw.why ? String(slotRaw.why) : null,
          wish_title: null as string | null,
          wish_category: null as string | null,
          wish_cost_band: null as 'budget' | 'mid' | 'luxury' | null,
          price: null as number | null,
          currency: null as string | null,
          slug: null as string | null,
          itinerary: [] as string[],
        }
        if (kind === 'wish') {
          const title = String(slotRaw.wish_title || '').trim()
          if (!title) return null
          return {
            ...base,
            kind: 'wish' as const,
            title,
            wish_title: title,
            wish_category: slotRaw.wish_category ? String(slotRaw.wish_category) : null,
            wish_cost_band: costBand(slotRaw.wish_cost_band),
          }
        }
        const id = String(slotRaw.service_id || '').trim()
        const svc = index.get(id)
        if (!svc) return null
        if (svc.category_id === RESTAURANT_CATEGORY) {
          return {
            ...base,
            kind: 'reservation' as const,
            service_id: svc.id,
            title: svc.title.trim(),
            slug: svc.slug || null,
          }
        }
        return {
          ...base,
          kind: 'bookable' as const,
          service_id: svc.id,
          title: svc.title.trim(),
          slug: svc.slug || null,
          price: Number(svc.price),
          currency: svc.currency,
          itinerary: svc.itinerary || [],
        }
      })
      .filter(Boolean) as ReconciledSlot[]
    return {
      day: typeof dayRaw.day === 'number' ? dayRaw.day : i + 1,
      date: dayRaw.date ? String(dayRaw.date) : null,
      location: dayRaw.location ? String(dayRaw.location) : null,
      slots: reconciledSlots,
    }
  })
  return {
    title: String(raw.title || 'Your DirtTrails trip').trim() || 'Your DirtTrails trip',
    days,
  }
}

function collapseEmptyDays(plan: ReconciledPlan): ReconciledPlan {
  return {
    ...plan,
    days: plan.days.filter((day) => day.slots.length > 0).map((day, i) => ({ ...day, day: i + 1 })),
  }
}

function isWeakPlan(plan: ReconciledPlan, catalog: CatalogService[], request: TripRequest): boolean {
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

function buildAffordablePlan(catalog: CatalogService[], request: TripRequest): ReconciledPlan {
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
  return {
    title: tour ? tour.title.trim() : budget ? `What ${formatBudget(budget)} can book on DirtTrails` : 'Your DirtTrails trip',
    days: days.slice(0, maxDays).map((day, i) => ({ ...day, day: i + 1 })),
  }
}

function finalizePlan(raw: Record<string, unknown>, catalog: CatalogService[], request: TripRequest): ReconciledPlan {
  const plan = collapseEmptyDays(reconcilePlan(raw, catalog))
  if (isWeakPlan(plan, catalog, request)) return buildAffordablePlan(catalog, request)
  return plan
}

function shouldSkipModel(request: TripRequest, catalog: CatalogService[]): boolean {
  const budget = parseBudget(request.extra_info)
  if (budget && request.countries.length === 0 && request.days === 0 && request.activities.length === 0) return true
  if (!budget) return false
  const inBudgetTours = catalog.filter(
    (service) => service.category_id === TOUR_CATEGORY && serviceFitsBudget(service, budget)
  )
  const matching = request.countries.length
    ? inBudgetTours.filter((service) => matchesCountry(service, request.countries))
    : inBudgetTours
  return matching.length === 0
}

function rowToCatalog(row: Record<string, unknown>): CatalogService {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    category_id: String(row.category_id || ''),
    location: row.location ? String(row.location) : null,
    meeting_point: row.meeting_point ? String(row.meeting_point) : null,
    duration_days: row.duration_days == null ? null : Number(row.duration_days),
    price: Number(row.price || 0),
    currency: String(row.currency || 'UGX'),
    itinerary: Array.isArray(row.itinerary) ? row.itinerary.map(String) : [],
    tour_highlights: Array.isArray(row.tour_highlights) ? row.tour_highlights.map(String) : [],
    slug: row.slug ? String(row.slug) : null,
    vendor_id: row.vendor_id ? String(row.vendor_id) : null,
    status: String(row.status || ''),
  }
}

async function callGemma(prompt: string, signal: AbortSignal): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  const model = Deno.env.get('GEMMA_MODEL') || 'gemma-4-26b-a4b-it'
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set on the trip-planner function')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1536, temperature: 0.2 },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `Gemma request failed (${res.status})`)
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || ''
  if (!text.trim()) throw new Error('Gemma returned an empty plan')
  return text
}

async function planWithModel(catalog: CatalogService[], request: TripRequest): Promise<ReconciledPlan> {
  const prompt = buildPlannerPrompt(catalogToPromptText(catalog, parseBudget(request.extra_info)), request)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMMA_TIMEOUT_MS)
  try {
    const modelText = await callGemma(prompt, controller.signal)
    return finalizePlan(extractJsonObject(modelText), catalog, request)
  } catch (error) {
    console.error('trip-planner model fallback:', error)
    return buildAffordablePlan(catalog, request)
  } finally {
    clearTimeout(timer)
  }
}

function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
}

function utcDayStart(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  try {
    const body = await req.json()
    const action = String(body?.action || 'plan')
    const supabase = adminClient()

    if (action === 'get') {
      const id = String(body?.id || '')
      const visitorId = body?.visitor_id ? String(body.visitor_id) : null
      const userId = body?.user_id ? String(body.user_id) : null
      if (!id) return json(400, { error: 'id is required' })
      const { data, error } = await supabase
        .from('trip_plans')
        .select('id, request, plan, status, created_at, user_id, visitor_id')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return json(404, { error: 'Plan not found' })
      const allowed = (userId && data.user_id === userId) || (visitorId && data.visitor_id === visitorId)
      if (!allowed) return json(404, { error: 'Plan not found' })
      return json(200, { id: data.id, request: data.request, plan: data.plan, status: data.status, created_at: data.created_at })
    }

    if (action === 'wish') {
      const title = String(body?.wish_title || '').trim()
      if (!title) return json(400, { error: 'wish_title is required' })
      const { data, error } = await supabase
        .from('trip_wish_requests')
        .insert({
          trip_plan_id: body?.trip_plan_id || null,
          user_id: body?.user_id || null,
          visitor_id: body?.visitor_id || null,
          wish_title: title,
          wish_category: body?.wish_category || null,
          wish_cost_band: body?.wish_cost_band || null,
          location: body?.location || null,
        })
        .select('id')
        .single()
      if (error) throw error
      return json(200, { id: data.id })
    }

    const visitorId = body?.visitor_id ? String(body.visitor_id) : null
    const userId = body?.user_id ? String(body.user_id) : null
    if (!visitorId && !userId) return json(400, { error: 'visitor_id is required' })

    if (visitorId) {
      const { count, error: countError } = await supabase
        .from('trip_plans')
        .select('id', { count: 'exact', head: true })
        .eq('visitor_id', visitorId)
        .gte('created_at', utcDayStart())
      if (countError) throw countError
      if ((count || 0) >= MAX_PLANS_PER_DAY) {
        return json(429, { error: 'Daily plan limit reached. Try again tomorrow.' })
      }
    }

    const { data: rows, error: svcError } = await supabase
      .from('services')
      .select('id, title, category_id, location, meeting_point, duration_days, price, currency, itinerary, tour_highlights, slug, vendor_id, status')
      .in('status', ['approved', 'active'])
    if (svcError) throw svcError

    const catalog = (rows || []).map(rowToCatalog).filter(isPlannerCatalogService)
    if (catalog.length === 0) return json(503, { error: 'No bookable catalog available' })

    const daysRaw = Number(body?.days)
    const request: TripRequest = {
      countries: Array.isArray(body?.countries) ? body.countries.map(String) : [],
      activities: Array.isArray(body?.activities) ? body.activities.map(String) : [],
      days: Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(30, Math.floor(daysRaw)) : 0,
      start_date: body?.start_date || null,
      adults: Math.max(1, Number(body?.adults) || 1),
      children: Math.max(0, Number(body?.children) || 0),
      extra_info: body?.extra_info ? String(body.extra_info).slice(0, 1000) : null,
    }

    const plan = shouldSkipModel(request, catalog)
      ? buildAffordablePlan(catalog, request)
      : await planWithModel(catalog, request)

    const { data: saved, error: saveError } = await supabase
      .from('trip_plans')
      .insert({
        user_id: userId,
        visitor_id: visitorId,
        request,
        plan,
        status: 'draft',
      })
      .select('id, created_at')
      .single()
    if (saveError) throw saveError

    return json(200, { id: saved.id, created_at: saved.created_at, request, plan })
  } catch (error) {
    console.error('trip-planner error:', error)
    return json(500, { error: error instanceof Error ? error.message : 'Failed to generate plan' })
  }
})
