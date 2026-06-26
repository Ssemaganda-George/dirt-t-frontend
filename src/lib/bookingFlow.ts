/**
 * Hybrid booking: simple categories use inline drawer on ServiceDetail;
 * complex categories navigate to full /service/:slug/book/:category pages.
 * Shops use /service/:slug/purchase (retail order flow).
 */

import { getShopPurchasePath, type ShopPurchasePrefill } from './shopListingMode'
export const INLINE_DRAWER_BOOKING_CATEGORIES = new Set([
  'activities',
  'restaurants',
])

export function usesInlineBookingDrawer(mappedCategory: string): boolean {
  return INLINE_DRAWER_BOOKING_CATEGORIES.has(mappedCategory)
}

export interface ServiceDetailBookingPrefill {
  selectedDate: string
  checkInDate: string
  checkOutDate: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  guests: number
  quantity: number
  transportZone: 'within' | 'upcountry' | ''
  listingType?: string | null
}

/** Map service category labels to booking route segment */
export function mapCategoryToBookingFlow(categoryName: string): string {
  const categoryMap: Record<string, string> = {
    hotels: 'hotels',
    hotel: 'hotels',
    accommodation: 'hotels',
    transport: 'transport',
    transportation: 'transport',
    'car rental': 'transport',
    tours: 'tours',
    tour: 'tours',
    'guided tour': 'tours',
    restaurants: 'restaurants',
    restaurant: 'restaurants',
    dining: 'restaurants',
    activities: 'activities',
    activity: 'activities',
    experience: 'activities',
    events: 'activities',
    event: 'activities',
    flights: 'flights',
    flight: 'flights',
    'air travel': 'flights',
    shops: 'shops',
    shop: 'shops',
  }
  return categoryMap[categoryName.toLowerCase()] || 'activities'
}

/** Build router state for continuing a saved cart item into checkout */
export function buildBookingStateFromCartItem(
  category: string,
  bookingData: Record<string, unknown>
): Record<string, unknown> | undefined {
  const mappedCategory = mapCategoryToBookingFlow(category)
  return buildBookingNavigateState(mappedCategory, {
    selectedDate: String(bookingData.date || bookingData.selectedDate || ''),
    checkInDate: String(bookingData.checkInDate || ''),
    checkOutDate: String(bookingData.checkOutDate || ''),
    startDate: String(bookingData.startDate || bookingData.date || ''),
    endDate: String(bookingData.endDate || ''),
    startTime: String(bookingData.startTime || ''),
    endTime: String(bookingData.endTime || ''),
    guests: Number(bookingData.guests || 1),
    quantity: Number(bookingData.quantity || 1),
    transportZone: (bookingData.transportZone as 'within' | 'upcountry' | '') || '',
    listingType: (bookingData.listingType as string | null) || undefined,
  })
}

export function buildShopPurchaseStateFromCart(
  bookingData: Record<string, unknown>
): ShopPurchasePrefill {
  return {
    listingType: bookingData.listingType === 'hire' ? 'hire' : 'buy',
    quantity: Number(bookingData.quantity || bookingData.guests || 1),
    startDate: String(bookingData.startDate || ''),
    endDate: String(bookingData.endDate || ''),
  }
}

export function getCartBookingPath(serviceSlug: string, category: string): string {
  const mappedCategory = mapCategoryToBookingFlow(category)
  if (mappedCategory === 'shops') return getShopPurchasePath(serviceSlug)
  return `/service/${serviceSlug}/book/${mappedCategory}`
}

/** Pass sidebar selections into full-page booking flows via react-router location.state */
export function buildBookingNavigateState(
  mappedCategory: string,
  prefill: ServiceDetailBookingPrefill
): Record<string, unknown> | undefined {
  switch (mappedCategory) {
    case 'hotels':
      return {
        checkInDate: prefill.checkInDate,
        checkOutDate: prefill.checkOutDate,
        guests: prefill.guests,
      }
    case 'transport':
      return {
        startDate: prefill.startDate,
        endDate: prefill.endDate,
        startTime: prefill.startTime,
        endTime: prefill.endTime,
        transportZone: prefill.transportZone || undefined,
        passengers: prefill.guests,
      }
    case 'tours':
      return {
        selectedDate: prefill.selectedDate,
        guests: prefill.guests,
      }
    case 'flights':
      return {
        departureDate: prefill.selectedDate,
        passengers: prefill.guests,
      }
    case 'shops':
      return {
        listingType: prefill.listingType === 'hire' ? 'hire' : 'buy',
        quantity: prefill.quantity,
        startDate: prefill.startDate,
        endDate: prefill.endDate,
      }
    default:
      if (prefill.listingType) {
        return {
          selectedDate: prefill.selectedDate,
          guests: prefill.guests,
          quantity: prefill.quantity,
          listingType: prefill.listingType,
        }
      }
      return undefined
  }
}
