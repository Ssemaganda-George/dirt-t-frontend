/**
 * Named arguments for `public.create_booking_atomic`.
 * Optional p_pricing_base_amount: pre-fee line total for commission (e.g. rooms×nights×price, transport total).
 * When omitted/null, DB uses service.price × guests.
 * Platform fee / commission are applied by the RPC or patched on the booking row after insert.
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
  const payload: Record<string, string | number | null> = {
    p_service_id: input.p_service_id,
    p_vendor_id: input.p_vendor_id,
    p_booking_date: input.p_booking_date,
    p_guests: input.p_guests,
    p_total_amount: input.p_total_amount,
  }

  if (input.p_tourist_id != null) payload.p_tourist_id = input.p_tourist_id
  if (input.p_service_date != null) payload.p_service_date = input.p_service_date
  if (input.p_currency != null) payload.p_currency = input.p_currency
  if (input.p_special_requests != null) payload.p_special_requests = input.p_special_requests
  if (input.p_guest_name != null) payload.p_guest_name = input.p_guest_name
  if (input.p_guest_email != null) payload.p_guest_email = input.p_guest_email
  if (input.p_guest_phone != null) payload.p_guest_phone = input.p_guest_phone
  if (input.p_pickup_location != null) payload.p_pickup_location = input.p_pickup_location
  if (input.p_dropoff_location != null) payload.p_dropoff_location = input.p_dropoff_location
  if (input.p_pricing_base_amount != null) payload.p_pricing_base_amount = Number(input.p_pricing_base_amount)

  return payload
}
