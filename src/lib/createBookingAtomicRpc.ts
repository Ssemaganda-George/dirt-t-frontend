/**
 * Named arguments for `public.create_booking_atomic`.
 * Optional p_pricing_base_amount: pre-fee line total for commission (e.g. rooms×nights×price, transport total).
 * When omitted/null, DB uses service.price × guests.
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
  /** Pre-tax/pre-fee booking line amount for tier commission (not necessarily equal to total_amount when tourist pays fee). */
  p_pricing_base_amount?: number | null
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
    p_dropoff_location: input.p_dropoff_location ?? null,
    p_pricing_base_amount: input.p_pricing_base_amount ?? null
  }
}
