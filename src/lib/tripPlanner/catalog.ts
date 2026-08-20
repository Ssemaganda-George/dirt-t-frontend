import { type NamedBudget, serviceFitsBudget } from './budget'
import {
  RESTAURANT_CATEGORY,
  SHOP_CATEGORY,
  TOUR_CATEGORY,
  type CatalogService,
} from './types'

const LISTABLE_STATUS = new Set(['approved', 'active'])

export function isPlannerCatalogService(service: CatalogService): boolean {
  if (!LISTABLE_STATUS.has(service.status)) return false
  if (service.category_id === SHOP_CATEGORY) return false
  if (service.category_id === RESTAURANT_CATEGORY) return true
  return Number(service.price) > 0
}

export function filterPlannerCatalog(services: CatalogService[]): CatalogService[] {
  return services.filter(isPlannerCatalogService)
}

export function catalogToPromptText(services: CatalogService[], budget?: NamedBudget | null): string {
  const sorted = [...services].sort((a, b) => {
    const aFit = serviceFitsBudget(a, budget || null) ? 0 : 1
    const bFit = serviceFitsBudget(b, budget || null) ? 0 : 1
    return aFit - bFit
  })
  return sorted
    .map((s) => {
      const inBudget = serviceFitsBudget(s, budget || null)
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
