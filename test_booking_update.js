const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testBookingUpdate() {
  console.log('Testing booking update functionality...');

  // First, let's get a sample booking
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, status, payment_status')
    .limit(1);

  if (error) {
    console.error('Error fetching bookings:', error);
    return;
  }

  if (!bookings || bookings.length === 0) {
    console.log('No bookings found to test with');
    return;
  }

  const testBooking = bookings[0];
  console.log('Test booking:', testBooking);

  // Test updating the booking status
  const { data: updatedBooking, error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      updated_at: new Date().toISOString()
    })
    .eq('id', testBooking.id)
    .select('id, status, payment_status')
    .single();

  if (updateError) {
    console.error('Error updating booking:', updateError);
    return;
  }

  console.log('Booking updated successfully:', updatedBooking);

  // Reset the booking to original state
  const { error: resetError } = await supabase
    .from('bookings')
    .update({
      status: testBooking.status,
      payment_status: testBooking.payment_status,
      updated_at: new Date().toISOString()
    })
    .eq('id', testBooking.id);

  if (resetError) {
    console.error('Error resetting booking:', resetError);
  } else {
    console.log('Booking reset to original state');
  }
}

testBookingUpdate().catch(console.error);