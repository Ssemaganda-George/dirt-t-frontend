import { supabase } from './supabaseClient'
import type { ReconciledPlan, TripRequest } from './tripPlanner/types'

const VISITOR_KEY = 'dt_planner_visitor'

export type SavedTripPlan = {
  id: string
  created_at?: string
  request: TripRequest
  plan: ReconciledPlan
  status?: string
}

export function getPlannerVisitorId(sessionId?: string | null): string {
  if (sessionId) return sessionId
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

async function invokePlanner(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('trip-planner', { body })
  const payload = (data && typeof data === 'object' ? data : null) as Record<string, unknown> | null
  if (payload?.error) throw new Error(String(payload.error))
  if (error) {
    const ctx = (error as { context?: Response }).context
    let fromBody: string | null = null
    if (ctx && typeof ctx.json === 'function') {
      try {
        const errBody = await ctx.json()
        if (errBody?.error) fromBody = String(errBody.error)
      } catch {
        fromBody = null
      }
    }
    throw new Error(fromBody || error.message || 'Trip planner request failed')
  }
  if (!payload) throw new Error('Trip planner returned an empty response')
  return payload
}

export async function generateTripPlan(
  request: TripRequest,
  ids: { visitor_id?: string | null; user_id?: string | null }
): Promise<SavedTripPlan> {
  const data = await invokePlanner({
    action: 'plan',
    visitor_id: ids.visitor_id || null,
    user_id: ids.user_id || null,
    ...request,
  })
  return data as SavedTripPlan
}

export async function fetchTripPlan(
  id: string,
  ids: { visitor_id?: string | null; user_id?: string | null }
): Promise<SavedTripPlan> {
  const data = await invokePlanner({
    action: 'get',
    id,
    visitor_id: ids.visitor_id || null,
    user_id: ids.user_id || null,
  })
  return data as SavedTripPlan
}

export async function requestWishSlot(input: {
  trip_plan_id?: string | null
  visitor_id?: string | null
  user_id?: string | null
  wish_title: string
  wish_category?: string | null
  wish_cost_band?: string | null
  location?: string | null
}): Promise<void> {
  await invokePlanner({ action: 'wish', ...input })
}
