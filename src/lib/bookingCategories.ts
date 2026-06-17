export const RESTAURANT_CATEGORY_IDS = ['cat_restaurants'] as const

export function isRestaurantCategory(
  categoryId?: string | null,
  categoryName?: string | null,
  mappedBookingCategory?: string | null,
): boolean {
  if (mappedBookingCategory === 'restaurants') return true
  if (categoryId && (RESTAURANT_CATEGORY_IDS as readonly string[]).includes(categoryId)) {
    return true
  }
  const name = (categoryName || '').toLowerCase()
  return name === 'restaurants' || name === 'restaurant'
}

export function isRestaurantService(service: {
  category_id?: string | null
  slug?: string | null
  service_categories?: { id?: string; name?: string } | null
} | null | undefined): boolean {
  if (!service) return false
  const mapped = (service.service_categories?.name || '').toLowerCase()
  return (
    isRestaurantCategory(service.category_id, mapped) ||
    isRestaurantCategory(service.service_categories?.id, mapped) ||
    Boolean(service.slug && /restaurant/i.test(service.slug))
  )
}

/** Table reservations — no MarzPay settlement or wallet credit. */
export function isReservationBooking(booking: {
  status?: string | null
  payment_status?: string | null
}): boolean {
  return booking.status === 'reserved' || booking.payment_status === 'not_required'
}

export function shouldSendReservationEmails(booking: {
  status?: string | null
  payment_status?: string | null
}): boolean {
  return isReservationBooking(booking)
}
