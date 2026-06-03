// Booking orchestration — use these instead of calling supabase.from('bookings') directly in pages.
import { supabase } from '../lib/supabaseClient'

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
  if (error) throw error
}

// Used when a payment fails — keeps payment_status as 'pending' for retry
export async function cancelBookingOnPaymentFailure(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', payment_status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
  if (error) throw error
}

// Only cancels if the booking is still in 'pending' state (safe for pre-payment cancellations)
export async function cancelPendingBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'pending')
  if (error) throw error
}
