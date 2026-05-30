/**
 * Hybrid booking: simple categories use inline drawer on ServiceDetail;
 * complex categories navigate to full /service/:slug/book/:category pages.
 */

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
  transportZone: 'within' | 'upcountry' | ''
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
    default:
      return undefined
  }
}
