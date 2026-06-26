/** Shop commerce mode stored on services.listing_type (shops category only). */
export type ShopListingType = 'buy' | 'hire' | 'buy_and_hire'

/** Resolved mode for guest UI — dual means Buy/Hire toggle. */
export type ShopListingMode = 'buy' | 'hire' | 'dual'

export type ShopListingService = {
  listing_type?: string | null
  type?: string | null
  buy_price?: number | string | null
  rental_price_per_day?: number | string | null
  price?: number | string | null
}

function positiveNum(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Map legacy shop values (experience) to buy_and_hire for vendor forms. */
export function normalizeShopListingType(raw?: string | null): ShopListingType | '' {
  if (!raw) return ''
  if (raw === 'experience') return 'buy_and_hire'
  if (raw === 'buy' || raw === 'hire' || raw === 'buy_and_hire') return raw
  return ''
}

export function shopHasBuyPrice(service: ShopListingService): boolean {
  return positiveNum(service.buy_price) != null || positiveNum(service.price) != null
}

export function shopHasRentalPrice(service: ShopListingService): boolean {
  return positiveNum(service.rental_price_per_day) != null
}

/** Single source of truth for guest + checkout shop behavior. */
export function getShopListingMode(service: ShopListingService): ShopListingMode {
  const stored = normalizeShopListingType(service.listing_type || service.type)
  const hasBuy = shopHasBuyPrice(service)
  const hasRent = shopHasRentalPrice(service)

  if (stored === 'hire' || (hasRent && !hasBuy)) return 'hire'
  if (stored === 'buy_and_hire' || (hasBuy && hasRent)) return 'dual'
  return 'buy'
}

export function isShopDualListing(service: ShopListingService): boolean {
  return getShopListingMode(service) === 'dual'
}

/** Default Buy/Hire tab on product page. */
export function defaultShopCheckoutListingType(service: ShopListingService): 'buy' | 'hire' {
  const mode = getShopListingMode(service)
  if (mode === 'hire') return 'hire'
  return 'buy'
}

export function getShopPurchasePath(slug: string): string {
  return `/service/${slug}/purchase`
}

export function getShopUnitPrice(service: ShopListingService, checkoutMode: 'buy' | 'hire'): number {
  if (checkoutMode === 'hire') {
    return positiveNum(service.rental_price_per_day) ?? positiveNum(service.price) ?? 0
  }
  return positiveNum(service.buy_price) ?? positiveNum(service.price) ?? 0
}

export function calcShopRentalDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1
  return Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
}

export interface ShopPurchasePrefill {
  listingType?: 'buy' | 'hire'
  quantity?: number
  startDate?: string
  endDate?: string
  deliveryNote?: string
}
