import { formatBudget, parseBudget } from './budget'
import type { TripRequest } from './types'

export function buildPlannerPrompt(catalogText: string, request: TripRequest): string {
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
