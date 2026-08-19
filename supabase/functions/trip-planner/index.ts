import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHOP_CATEGORY = 'cat_shops'
const RESTAURANT_CATEGORY = 'cat_restaurants'
const MAX_PLANS_PER_DAY = 5
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

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isPlannerCatalogService(service: CatalogService): boolean {
  if (!LISTABLE_STATUS.has(service.status)) return false
  if (service.category_id === SHOP_CATEGORY) return false
  if (service.category_id === RESTAURANT_CATEGORY) return true
  return Number(service.price) > 0
}

function catalogToPromptText(services: CatalogService[]): string {
  return services
    .map((s) => {
      const loc = s.meeting_point || s.location || 'unspecified'
      const days = s.duration_days ? `${s.duration_days}d` : 'duration unknown'
      const itinerary = (s.itinerary || []).slice(0, 14).join(' | ')
      const highlights = (s.tour_highlights || []).slice(0, 6).join(', ')
      return [
        `id=${s.id}`,
        `category=${s.category_id}`,
        `title=${s.title.trim()}`,
        `location=${loc}`,
        `duration=${days}`,
        `price=${s.price} ${s.currency}`,
        highlights ? `highlights=${highlights}` : null,
        itinerary ? `itinerary=${itinerary}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
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

function reconcilePlan(raw: Record<string, unknown>, catalog: CatalogService[]) {
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
      slots: reconciledSlots,
    }
  })
  return {
    title: String(raw.title || 'Your DirtTrails trip').trim() || 'Your DirtTrails trip',
    days,
  }
}

function buildPlannerPrompt(catalogText: string, request: Record<string, unknown>): string {
  const countries = Array.isArray(request.countries) && request.countries.length
    ? (request.countries as string[]).join(', ')
    : 'East Africa'
  const activities = Array.isArray(request.activities) && request.activities.length
    ? (request.activities as string[]).join(', ')
    : 'safari'
  const statement = String(request.extra_info || '').trim() || 'none'
  return `You are the DirtTrails trip planner. You compose trips ONLY from the catalog below.

Rules:
- The traveler's statement is the request. Infer destination, duration, party size, and budget from it.
- If they named a budget, do not pick a BOOKABLE package whose listed catalog price is above that budget. Put the overshoot in WISH slots instead. Never invent a cheaper price.
- Prefer ONE matching tour package as the spine of the trip (one service_id for the whole tour). Do not break a multi-day package into fake daily bookings.
- Only stitch hotels/transport around a package when no package fits the countries/days.
- Never use shops. Never invent a service_id.
- Restaurants are reservations, not bookable, not priced.
- BOOKABLE slots: kind="bookable" and a catalog service_id.
- WISH slots: experiences/lodges DirtTrails does not sell. kind="wish", wish_title, wish_category, wish_cost_band (budget|mid|luxury). Never a number.
- Output JSON only, matching:
{"title": string, "days":[{"day": number, "date": string|null, "location": string|null, "slots":[{"kind":"bookable"|"wish"|"reservation","service_id": string|null,"time": string|null,"guests": number|null,"why": string|null,"wish_title": string|null,"wish_category": string|null,"wish_cost_band":"budget"|"mid"|"luxury"|null}]}]}

Traveler statement:
${statement}

Structured hints (may be empty; statement wins):
countries=${countries}
activities=${activities}
days=${request.days || 7}
start_date=${request.start_date || 'flexible'}
adults=${request.adults || 1}
children=${request.children || 0}

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
  }
}

async function callGemma(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  const model = Deno.env.get('GEMMA_MODEL') || 'gemma-4-26b-a4b-it'
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set on the trip-planner function')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
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
      const { data, error } = await supabase.from('trip_plans').select('id, request, plan, status, created_at, user_id, visitor_id').eq('id', id).maybeSingle()
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

    const request = {
      countries: Array.isArray(body?.countries) ? body.countries.map(String) : [],
      activities: Array.isArray(body?.activities) ? body.activities.map(String) : [],
      days: Math.max(1, Math.min(30, Number(body?.days) || 7)),
      start_date: body?.start_date || null,
      adults: Math.max(1, Number(body?.adults) || 1),
      children: Math.max(0, Number(body?.children) || 0),
      extra_info: body?.extra_info ? String(body.extra_info).slice(0, 1000) : null,
    }

    const prompt = buildPlannerPrompt(catalogToPromptText(catalog), request)
    const modelText = await callGemma(prompt)
    const raw = extractJsonObject(modelText)
    const plan = reconcilePlan(raw, catalog)

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
