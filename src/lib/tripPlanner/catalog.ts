import {
  RESTAURANT_CATEGORY,
  SHOP_CATEGORY,
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

export function catalogToPromptText(services: CatalogService[]): string {
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
