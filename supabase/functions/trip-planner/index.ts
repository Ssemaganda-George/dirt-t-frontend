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
const MAX_REFINEMENTS_PER_PLAN = 20
const MAX_MESSAGE_LEN = 600
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
  banner_ocr_text?: string | null
}

type ConversationMessage = {
  role: 'user' | 'advisor'
  content: string
  created_at?: string
}

type PlanSource = {
  title: string
  uri: string
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

function catalogToPromptText(services: CatalogService[], budget: NamedBudget | null = null): string {
  return [...services]
    .sort((a, b) => {
      const aFit = serviceFitsBudget(a, budget) ? 0 : 1
      const bFit = serviceFitsBudget(b, budget) ? 0 : 1
      return aFit - bFit
    })
    .map((s) => {
      const inBudget = serviceFitsBudget(s, budget)
      const loc = s.meeting_point || s.location || 'unspecified'
      const days = s.duration_days ? `${s.duration_days}d` : 'duration unknown'
      const itinerary =
        inBudget && s.category_id === TOUR_CATEGORY ? (s.itinerary || []).slice(0, 14).join(' | ') : null
      const highlights =
        inBudget && s.category_id === TOUR_CATEGORY ? (s.tour_highlights || []).slice(0, 6).join(', ') : null
      const bannerNotes = inBudget ? (s.banner_ocr_text || '').trim().slice(0, 500) : ''
      return [
        inBudget ? 'IN_BUDGET' : 'OVER_BUDGET',
        `id=${s.id}`,
        `category=${s.category_id}`,
        `title=${s.title.trim()}`,
        `location=${loc}`,
        `duration=${days}`,
        `price=${s.price} ${s.currency}`,
        highlights ? `highlights=${highlights}` : null,
        itinerary ? `itinerary=${itinerary}` : null,
        bannerNotes ? `banner_notes=${bannerNotes}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
    })
    .join('\n')
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

function reconcilePlan(raw: Record<string, unknown>, catalog: CatalogService[], sources: PlanSource[] = []) {
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
            kind: 'wish',
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
            kind: 'reservation',
            service_id: svc.id,
            title: svc.title.trim(),
            slug: svc.slug || null,
          }
        }
        return {
          ...base,
          kind: 'bookable',
          service_id: svc.id,
          title: svc.title.trim(),
          slug: svc.slug || null,
          price: Number(svc.price),
          currency: svc.currency,
          itinerary: svc.itinerary || [],
        }
      })
      .filter(Boolean)
    return {
      day: typeof dayRaw.day === 'number' ? dayRaw.day : i + 1,
      date: dayRaw.date ? String(dayRaw.date) : null,
      location: dayRaw.location ? String(dayRaw.location) : null,
      narrative: dayRaw.narrative ? String(dayRaw.narrative).trim() : null,
      slots: reconciledSlots,
    }
  })

  const totals = new Map<string, number>()
  for (const day of days) {
    for (const slot of day.slots as Array<{ kind: string; price: number | null; currency: string | null }>) {
      if (slot.kind !== 'bookable' || slot.price == null || !slot.currency) continue
      totals.set(slot.currency, (totals.get(slot.currency) || 0) + slot.price)
    }
  }
  const cost_summary = Array.from(totals.entries()).map(([currency, bookable_total]) => ({ currency, bookable_total }))

  return {
    title: String(raw.title || 'Your DirtTrails trip').trim() || 'Your DirtTrails trip',
    advisor_note: raw.advisor_note ? String(raw.advisor_note).trim() : null,
    cost_summary,
    sources,
    days,
  }
}

// Grounding knowledge so the model reasons about East Africa like a local operator even for
// gaps the catalog can't fill (WISH slots), not just the listings it can book.
const EAST_AFRICA_KNOWLEDGE = `
Regional knowledge (use for realistic sequencing, travel time, and WISH suggestions —
never to invent a bookable price):

UGANDA
- Kampala/Entebbe: arrival hub, city day, Ssese Islands boat access.
- Jinja (~2-3h from Kampala): source of the Nile, white-water rafting, bungee, Mabira Forest en route.
- Lake Mburo NP (~3.5h from Kampala): closest savannah park, zebra, no predators to fear on walking safaris.
- Bwindi Impenetrable NP (~8-9h drive or short flight from Entebbe): gorilla trekking, permits are the single
  biggest line item on any Uganda budget and usually exceed a shoestring budget.
- Queen Elizabeth NP (~5-6h from Kampala, ~2-3h from Bwindi): tree-climbing lions, Kazinga Channel boat cruise.
- Kibale NP (~4-5h from Kampala): chimpanzee trekking, Bigodi wetland walk.
- Murchison Falls NP (~4-5h from Kampala via Masindi): boat cruise to the base of the falls, top-of-the-falls hike,
  game drives on the northern bank, classic 3-4 day loop (mirrors the Masindi/Murchison itinerary style).
- Sipi Falls / Mt Elgon (~4-5h east of Kampala): waterfalls, coffee tours, hiking, budget-friendly.
- Kabale/Kisoro (far southwest, near Bwindi/Mgahinga): Lake Bunyonyi, gorilla/golden monkey base.
- Fort Portal: crater lakes, tea estates, gateway to Kibale and Rwenzori foothills.

NEIGHBOURING EAST AFRICA (only mention if the traveler's statement or destination implies a regional trip)
- Kenya: Nairobi hub, Maasai Mara (wildebeest migration July-Oct), Amboseli (Kilimanjaro views), Diani coast.
- Tanzania: Arusha hub, Serengeti, Ngorongoro Crater, Zanzibar beach add-on.
- Rwanda: Kigali hub, Volcanoes NP gorilla trekking (permits pricier than Uganda), Lake Kivu.

Seasonality: Uganda's driest/easiest travel windows are Dec-Feb and Jun-Aug; Mar-May and Oct-Nov are wetter,
roads to Bwindi/Kibale can be slower. Mention this only when it changes the plan.
`.trim()

const OUTPUT_SCHEMA = `{"title": string, "advisor_note": string, "days":[{"day": number, "date": string|null, "location": string|null, "narrative": string, "slots":[{"kind":"bookable"|"wish"|"reservation","service_id": string|null,"time": string|null,"guests": number|null,"why": string|null,"wish_title": string|null,"wish_category": string|null,"wish_cost_band":"budget"|"mid"|"luxury"|null}]}]}`

const SHARED_RULES = `
Rules:
- The traveler's statement is the request. Infer destination, duration, party size, and budget from it.
- Do not assume safari, Kenya, or 7 days unless they said so.
- BOOKABLE slots must use IN_BUDGET catalog ids. Never mark an OVER_BUDGET id as bookable. Never invent a cheaper price.
- If they named a budget, do not pick a BOOKABLE package whose listed catalog price is above that budget. Put the overshoot in WISH slots instead.
- If no tour package is IN_BUDGET, stitch in-budget hotels, transport, and activities. That is the trip.
- OVER_BUDGET tours may appear once as a WISH upgrade only if the traveler named that country. Never use them as the trip title or as empty day 2–7 locations.
- Every day must have at least one slot. Omit empty days.
- Prefer ONE in-budget tour package as the spine of the trip (one service_id for the whole tour). Do not break a multi-day package into fake daily bookings.
- Never use shops. Never invent a service_id — only ids that appear in the Catalog block below.
- Restaurants are reservations, not bookable, not priced.
- BOOKABLE slots: kind="bookable" and a catalog service_id.
- WISH slots: real experiences/lodges DirtTrails does not sell yet, drawn from the regional knowledge above. kind="wish", wish_title, wish_category, wish_cost_band (budget|mid|luxury). Never a number, never a fabricated service_id.
- You have a Google Search tool. Use it to check current, real-world East Africa facts that make the plan credible — park entry fee ranges, gorilla/chimp permit prices, seasonal road/weather conditions, opening days, recently opened lodges or attractions near the destination. This is what should make this plan noticeably better-informed than a generic itinerary. Still only ever describe a WISH cost as a band (budget|mid|luxury), never quote a search-found number as if it were bookable — DirtTrails prices come only from the catalog.
- Write like an experienced East Africa tour operator building a written quotation, not a chatbot listing bullet points:
  - "narrative" per day is 2-4 sentences of flowing itinerary text: departure/arrival times, transit, meals, what happens and roughly when, in the same voice as a written trip quotation (e.g. "8:00 AM — depart Kampala, refreshments in the car, lunch en route, afternoon arrival and check-in...").
  - "why" per slot is one short sentence justifying that choice for this traveler (budget fit, logistics, pacing) — not marketing copy.
  - "advisor_note" is 2-4 sentences, first person plural ("we"), speaking directly to the traveler: summarize the trip, flag the single biggest trade-off or gap (e.g. a WISH item over budget), and end with one concrete question or suggestion to move the conversation forward (this is a back-and-forth, not a final answer).
- Output JSON only, matching:
${OUTPUT_SCHEMA}`


function buildPlannerPrompt(catalogText: string, request: Record<string, unknown>): string {
  const countries = Array.isArray(request.countries) && request.countries.length
    ? (request.countries as string[]).join(', ')
    : 'not specified — do not assume Kenya or East Africa'
  const activities = Array.isArray(request.activities) && request.activities.length
    ? (request.activities as string[]).join(', ')
    : 'not specified — do not assume safari'
  const statement = String(request.extra_info || '').trim() || 'none'
  const budget = parseBudget(String(request.extra_info || ''))
  const daysRaw = Number(request.days)
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? String(daysRaw) : 'not specified — plan 1-3 days from in-budget listings'
  return `You are the DirtTrails trip planner — an experienced East Africa tour operator drafting a first quotation for a traveler. You compose BOOKABLE trips ONLY from the catalog below, but you reason about the whole trip like someone who knows the region.

${EAST_AFRICA_KNOWLEDGE}
${SHARED_RULES}

Traveler statement:
${statement}

Structured hints (may be empty; statement wins):
countries=${countries}
activities=${activities}
days=${days}
budget=${budget ? formatBudget(budget) : 'not specified'}
start_date=${request.start_date || 'flexible'}
adults=${request.adults || 1}
children=${request.children || 0}

Catalog:
${catalogText}
`
}

function buildRefinePrompt(
  catalogText: string,
  request: Record<string, unknown>,
  previousPlan: Record<string, unknown>,
  history: ConversationMessage[],
  userMessage: string
): string {
  const recentHistory = history.slice(-8)
  const historyText = recentHistory.length
    ? recentHistory.map((m) => `${m.role === 'user' ? 'Traveler' : 'Advisor'}: ${m.content}`).join('\n')
    : '(none yet)'

  const days = (Array.isArray(previousPlan.days) ? previousPlan.days : []) as Record<string, unknown>[]
  const previousPlanSlim = {
    title: previousPlan.title,
    days: days.map((d) => ({
      day: d.day,
      date: d.date,
      location: d.location,
      narrative: d.narrative,
      slots: ((Array.isArray(d.slots) ? d.slots : []) as Record<string, unknown>[]).map((s) => ({
        kind: s.kind,
        service_id: s.service_id,
        time: s.time,
        guests: s.guests,
        why: s.why,
        wish_title: s.wish_title,
        wish_category: s.wish_category,
        wish_cost_band: s.wish_cost_band,
      })),
    })),
  }

  return `You are the DirtTrails trip planner — an experienced East Africa tour operator in an ongoing conversation with a traveler about a draft quotation. You are adjusting the CURRENT PLAN below based on their new message. You compose BOOKABLE trips ONLY from the catalog below, but you reason about the whole trip like someone who knows the region.

${EAST_AFRICA_KNOWLEDGE}
${SHARED_RULES}
- This is a REVISION, not a fresh plan. Keep everything the traveler did not ask to change. Only edit the days/slots the new message actually affects.
- If the traveler's request would break a hard rule (e.g. asks to add a price for a restaurant, or push a bookable slot over their stated budget without moving it to WISH), do it the compliant way and say so in advisor_note instead of refusing silently.

Original request:
${JSON.stringify(request)}

Current plan (before this message):
${JSON.stringify(previousPlanSlim)}

Conversation so far:
${historyText}

Traveler's new message:
${userMessage}

Catalog:
${catalogText}
`
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
    banner_ocr_text: row.banner_ocr_text ? String(row.banner_ocr_text) : null,
  }
}

// Grounding (Google Search) is only supported by Gemini 2.0+ models, not Gemma — so the planner
// defaults to a Gemini model. GEMMA_MODEL is kept as a fallback env var name for compatibility with
// existing deployments, but should be set to a Gemini model id (e.g. gemini-2.5-flash) to keep grounding working.
async function callPlannerModel(prompt: string): Promise<{ text: string; sources: PlanSource[] }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  const model = Deno.env.get('GEMINI_MODEL') || Deno.env.get('GEMMA_MODEL') || 'gemini-2.5-flash'
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set on the trip-planner function')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMMA_TIMEOUT_MS)
  const signal = controller.signal
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.2 },
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error?.message || `Planner model request failed (${res.status})`)
    }
    const candidate = data?.candidates?.[0]
    const text = candidate?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || ''
    if (!text.trim()) throw new Error('Planner model returned an empty plan')

    const chunks = (candidate?.groundingMetadata?.groundingChunks || []) as Array<{ web?: { uri?: string; title?: string } }>
    const seen = new Set<string>()
    const sources: PlanSource[] = []
    for (const chunk of chunks) {
      const uri = chunk?.web?.uri
      if (!uri || seen.has(uri)) continue
      seen.add(uri)
      sources.push({ uri, title: chunk?.web?.title || uri })
      if (sources.length >= 5) break
    }

    return { text, sources }
  } finally {
    clearTimeout(timer)
  }
}

function shouldSkipModel(request: TripRequest, catalog: CatalogService[]): boolean {
  const budget = parseBudget(request.extra_info)
  if (budget && request.countries.length === 0 && request.days === 0 && request.activities.length === 0) return true
  if (!budget) return false
  const inBudgetTours = catalog.filter(
    (service) => service.category_id === TOUR_CATEGORY && serviceFitsBudget(service, budget)
  )
  const matching = request.countries.length
    ? inBudgetTours.filter((service) => {
        const hay = `${service.title} ${service.location || ''} ${service.meeting_point || ''}`.toLowerCase()
        return request.countries.some((country) => hay.includes(country.toLowerCase()))
      })
    : inBudgetTours
  return matching.length === 0
}

function budgetFallbackPlan(catalog: CatalogService[], request: TripRequest) {
  const budget = parseBudget(request.extra_info)
  const affordable = catalog
    .filter((service) => service.category_id !== RESTAURANT_CATEGORY && serviceFitsBudget(service, budget))
    .sort((a, b) => priceInUgx(a) - priceInUgx(b))
  const pick = (categoryId: string) => affordable.find((service) => service.category_id === categoryId)
  const tour = pick(TOUR_CATEGORY)
  const hotel = pick('cat_hotels')
  const activity = pick('cat_activities')
  const spine = tour || hotel || activity || affordable[0]
  const days = spine
    ? [{
        day: 1,
        date: null,
        location: spine.meeting_point || spine.location,
        narrative: null,
        slots: [{
          kind: 'bookable' as const,
          service_id: spine.id,
          title: spine.title.trim(),
          time: null,
          guests: 1,
          why: budget ? `Fits a ${formatBudget(budget)} trip.` : 'Available on DirtTrails.',
          wish_title: null,
          wish_category: null,
          wish_cost_band: null,
          price: Number(spine.price),
          currency: spine.currency,
          slug: spine.slug || null,
          itinerary: spine.itinerary || [],
        }],
      }]
    : []
  return reconcilePlan(
    {
      title: tour
        ? tour.title.trim()
        : budget
          ? `What ${formatBudget(budget)} can book on DirtTrails`
          : 'Your DirtTrails trip',
      advisor_note: budget
        ? `We stayed inside ${formatBudget(budget)} using what DirtTrails actually sells. Want a different city or dates?`
        : 'Here is what we can book from the live catalog.',
      days,
    },
    catalog
  )
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
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
      const { data, error } = await supabase.from('trip_plans').select('id, request, plan, messages, status, created_at, user_id, visitor_id').eq('id', id).maybeSingle()
      if (error) throw error
      if (!data) return json(404, { error: 'Plan not found' })
      const allowed = (userId && data.user_id === userId) || (visitorId && data.visitor_id === visitorId)
      if (!allowed) return json(404, { error: 'Plan not found' })
      return json(200, { id: data.id, request: data.request, plan: data.plan, messages: data.messages || [], status: data.status, created_at: data.created_at })
    }

    if (action === 'refine') {
      const id = String(body?.id || '')
      const visitorId = body?.visitor_id ? String(body.visitor_id) : null
      const userId = body?.user_id ? String(body.user_id) : null
      const userMessage = String(body?.message || '').trim().slice(0, MAX_MESSAGE_LEN)
      if (!id) return json(400, { error: 'id is required' })
      if (!userMessage) return json(400, { error: 'message is required' })
      if (!visitorId && !userId) return json(400, { error: 'visitor_id is required' })

      const { data: existing, error: fetchError } = await supabase
        .from('trip_plans')
        .select('id, request, plan, messages, user_id, visitor_id')
        .eq('id', id)
        .maybeSingle()
      if (fetchError) throw fetchError
      if (!existing) return json(404, { error: 'Plan not found' })
      const allowed = (userId && existing.user_id === userId) || (visitorId && existing.visitor_id === visitorId)
      if (!allowed) return json(404, { error: 'Plan not found' })

      const history = (Array.isArray(existing.messages) ? existing.messages : []) as ConversationMessage[]
      if (history.filter((m) => m.role === 'user').length >= MAX_REFINEMENTS_PER_PLAN) {
        return json(429, { error: 'This trip has reached its adjustment limit. Start a new plan to keep refining.' })
      }

      const { data: rows, error: svcError } = await supabase
        .from('services')
        .select('id, title, category_id, location, meeting_point, duration_days, price, currency, itinerary, tour_highlights, slug, vendor_id, status, banner_ocr_text')
        .in('status', ['approved', 'active'])
      if (svcError) throw svcError
      const catalog = (rows || []).map(rowToCatalog).filter(isPlannerCatalogService)
      if (catalog.length === 0) return json(503, { error: 'No bookable catalog available' })

      const prompt = buildRefinePrompt(
        catalogToPromptText(catalog, parseBudget(String((existing.request as { extra_info?: string } | null)?.extra_info || ''))),
        existing.request as Record<string, unknown>,
        existing.plan as Record<string, unknown>,
        history,
        userMessage
      )
      const { text: modelText, sources } = await callPlannerModel(prompt)
      const raw = extractJsonObject(modelText)
      const plan = reconcilePlan(raw, catalog, sources)

      const now = new Date().toISOString()
      const nextMessages: ConversationMessage[] = [
        ...history,
        { role: 'user', content: userMessage, created_at: now },
        { role: 'advisor', content: plan.advisor_note || 'Updated your plan.', created_at: now },
      ]

      const { error: updateError } = await supabase
        .from('trip_plans')
        .update({ plan, messages: nextMessages })
        .eq('id', id)
      if (updateError) throw updateError

      return json(200, { id, request: existing.request, plan, messages: nextMessages })
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
      .select('id, title, category_id, location, meeting_point, duration_days, price, currency, itinerary, tour_highlights, slug, vendor_id, status, banner_ocr_text')
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

    const budget = parseBudget(request.extra_info)
    let plan
    if (shouldSkipModel(request, catalog)) {
      plan = budgetFallbackPlan(catalog, request)
    } else {
      try {
        const { text: modelText, sources } = await callPlannerModel(buildPlannerPrompt(catalogToPromptText(catalog, budget), request))
        plan = reconcilePlan(extractJsonObject(modelText), catalog, sources)
      } catch (error) {
        console.error('trip-planner model fallback:', error)
        plan = budgetFallbackPlan(catalog, request)
      }
    }

    const initialMessages: ConversationMessage[] = [
      { role: 'user', content: request.extra_info || 'Plan a trip', created_at: new Date().toISOString() },
      { role: 'advisor', content: plan.advisor_note || `Here's a first draft: ${plan.title}.`, created_at: new Date().toISOString() },
    ]

    const { data: saved, error: saveError } = await supabase
      .from('trip_plans')
      .insert({
        user_id: userId,
        visitor_id: visitorId,
        request,
        plan,
        messages: initialMessages,
        status: 'draft',
      })
      .select('id, created_at')
      .single()
    if (saveError) throw saveError

    return json(200, { id: saved.id, created_at: saved.created_at, request, plan, messages: initialMessages })
  } catch (error) {
    console.error('trip-planner error:', error)
    return json(500, { error: error instanceof Error ? error.message : 'Failed to generate plan' })
  }
})
