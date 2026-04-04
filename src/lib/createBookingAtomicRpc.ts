/**
 * Named arguments for `public.create_booking_atomic` (14-parameter overload).
 * Use this shape everywhere so PostgREST/Postgres resolve a single function.
 *
 * Identity order in Postgres: service → vendor → booking_date → guests → total_amount
 * → tourist → service_date → currency → special_requests → guest fields → locations.
 */
export interface CreateBookingAtomicRpcInput {
  p_service_id: string
  p_vendor_id: string
  p_booking_date: string
  p_guests: number
  p_total_amount: number
  p_tourist_id?: string | null
  p_service_date?: string | null
  p_currency?: string
  p_special_requests?: string | null
  p_guest_name?: string | null
  p_guest_email?: string | null
  p_guest_phone?: string | null
  p_pickup_location?: string | null
  p_dropoff_location?: string | null
}

export function buildCreateBookingAtomicRpcPayload(
  input: CreateBookingAtomicRpcInput
): Record<string, string | number | null> {
  return {
    p_service_id: input.p_service_id,
    p_vendor_id: input.p_vendor_id,
    p_booking_date: input.p_booking_date,
    p_guests: input.p_guests,
    p_total_amount: input.p_total_amount,
    p_tourist_id: input.p_tourist_id ?? null,
    p_service_date: input.p_service_date ?? null,
    p_currency: input.p_currency ?? 'UGX',
    p_special_requests: input.p_special_requests ?? null,
    p_guest_name: input.p_guest_name ?? null,
    p_guest_email: input.p_guest_email ?? null,
    p_guest_phone: input.p_guest_phone ?? null,
    p_pickup_location: input.p_pickup_location ?? null,
    p_dropoff_location: input.p_dropoff_location ?? null
  }
}
