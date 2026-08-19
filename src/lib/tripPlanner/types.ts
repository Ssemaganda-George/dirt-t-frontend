export const SHOP_CATEGORY = 'cat_shops'
export const RESTAURANT_CATEGORY = 'cat_restaurants'
export const TOUR_CATEGORY = 'cat_tour_packages'

export type SlotKind = 'bookable' | 'wish' | 'reservation' | 'unavailable'

export type CatalogService = {
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

export type TripRequest = {
  countries: string[]
  activities: string[]
  days: number
  start_date?: string | null
  adults: number
  children: number
  extra_info?: string | null
}

export type RawSlot = {
  kind?: string
  service_id?: string | null
  time?: string | null
  guests?: number | null
  why?: string | null
  wish_title?: string | null
  wish_category?: string | null
  wish_cost_band?: string | null
}

export type RawDay = {
  day?: number
  date?: string | null
  location?: string | null
  slots?: RawSlot[]
}

export type RawPlan = {
  title?: string
  days?: RawDay[]
}

export type ReconciledSlot = {
  kind: SlotKind
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

export type ReconciledDay = {
  day: number
  date: string | null
  location: string | null
  slots: ReconciledSlot[]
}

export type ReconciledPlan = {
  title: string
  days: ReconciledDay[]
}
