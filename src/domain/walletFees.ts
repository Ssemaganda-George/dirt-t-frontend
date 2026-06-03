/** Booking columns joined for admin finance (platform fee + commission). */
export interface BookingFeeSnapshot {
  id: string
  total_amount?: number | string | null
  platform_fee?: number | string | null
  commission_amount?: number | string | null
  fee_payer?: string | null
}

/** Platform earnings for one booking row (fee + commission fields are mutually exclusive in practice). */
export function platformTakeFromBooking(booking: BookingFeeSnapshot | null | undefined): number {
  if (!booking) return 0
  return (Number(booking.platform_fee) || 0) + (Number(booking.commission_amount) || 0)
}

export function platformTakeFromTransaction(transaction: { bookings?: BookingFeeSnapshot | null }): number {
  return platformTakeFromBooking(transaction.bookings)
}
