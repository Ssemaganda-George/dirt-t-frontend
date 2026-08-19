import { RESTAURANT_CATEGORY } from './types'
import type {
  CatalogService,
  PlanSource,
  RawPlan,
  ReconciledDay,
  ReconciledPlan,
  ReconciledSlot,
  SlotKind,
} from './types'

const COST_BANDS = new Set(['budget', 'mid', 'luxury'])

function costBand(raw: string | null | undefined): 'budget' | 'mid' | 'luxury' | null {
  const v = String(raw || '').trim().toLowerCase()
  if (COST_BANDS.has(v)) return v as 'budget' | 'mid' | 'luxury'
  return null
}

function byId(catalog: CatalogService[]): Map<string, CatalogService> {
  return new Map(catalog.map((s) => [s.id, s]))
}

function emptySlotBase(): Omit<ReconciledSlot, 'kind' | 'title'> {
  return {
    service_id: null,
    time: null,
    guests: null,
    why: null,
    wish_title: null,
    wish_category: null,
    wish_cost_band: null,
    price: null,
    currency: null,
    slug: null,
    itinerary: [],
  }
}

function reconcileSlot(
  raw: NonNullable<NonNullable<RawPlan['days']>[number]['slots']>[number],
  catalog: Map<string, CatalogService>
): ReconciledSlot | null {
  const kind = String(raw.kind || '').toLowerCase()
  const base = emptySlotBase()
  base.time = raw.time ? String(raw.time) : null
  base.guests = typeof raw.guests === 'number' && Number.isFinite(raw.guests) ? raw.guests : null
  base.why = raw.why ? String(raw.why) : null

  if (kind === 'wish') {
    const title = String(raw.wish_title || '').trim()
    if (!title) return null
    return {
      ...base,
      kind: 'wish',
      title,
      wish_title: title,
      wish_category: raw.wish_category ? String(raw.wish_category) : null,
      wish_cost_band: costBand(raw.wish_cost_band),
    }
  }

  const id = String(raw.service_id || '').trim()
  if (!id) return null
  const svc = catalog.get(id)
  if (!svc) return null

  if (svc.category_id === RESTAURANT_CATEGORY) {
    return {
      ...base,
      kind: 'reservation',
      service_id: svc.id,
      title: svc.title.trim(),
      slug: svc.slug || null,
      price: null,
      currency: null,
    }
  }

  return {
    ...base,
    kind: 'bookable' satisfies SlotKind,
    service_id: svc.id,
    title: svc.title.trim(),
    slug: svc.slug || null,
    price: Number(svc.price),
    currency: svc.currency,
    itinerary: svc.itinerary || [],
  }
}

export function reconcilePlan(raw: RawPlan, catalog: CatalogService[], sources: PlanSource[] = []): ReconciledPlan {
  const index = byId(catalog)
  const days: ReconciledDay[] = []
  for (const day of raw.days || []) {
    const slots = (day.slots || [])
      .map((slot) => reconcileSlot(slot, index))
      .filter((s): s is ReconciledSlot => s != null)
    days.push({
      day: typeof day.day === 'number' ? day.day : days.length + 1,
      date: day.date ? String(day.date) : null,
      location: day.location ? String(day.location) : null,
      narrative: day.narrative ? String(day.narrative).trim() : null,
      slots,
    })
  }

  const totals = new Map<string, number>()
  for (const day of days) {
    for (const slot of day.slots) {
      if (slot.kind !== 'bookable' || slot.price == null || !slot.currency) continue
      totals.set(slot.currency, (totals.get(slot.currency) || 0) + slot.price)
    }
  }
  const cost_summary = Array.from(totals.entries()).map(([currency, bookable_total]) => ({
    currency,
    bookable_total,
  }))

  return {
    title: String(raw.title || 'Your DirtTrails trip').trim() || 'Your DirtTrails trip',
    advisor_note: raw.advisor_note ? String(raw.advisor_note).trim() : null,
    cost_summary,
    sources,
    days,
  }
}
