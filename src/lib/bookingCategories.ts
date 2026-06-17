export const RESTAURANT_CATEGORY_IDS = ['cat_restaurants'] as const

export function isRestaurantCategory(
  categoryId?: string | null,
  categoryName?: string | null,
): boolean {
  if (categoryId && (RESTAURANT_CATEGORY_IDS as readonly string[]).includes(categoryId)) {
    return true
  }
  const name = (categoryName || '').toLowerCase()
  return name === 'restaurants' || name === 'restaurant'
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
