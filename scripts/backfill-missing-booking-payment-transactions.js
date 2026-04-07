import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'X-Client-Info': 'dirt-trails-backfill-script'
    }
  }
})

const main = async () => {
  console.log('Fetching paid confirmed/completed bookings that lack completed payment transactions...')

  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('id, vendor_id, tourist_id, total_amount, currency, commission_amount, commission_rate_at_booking')
    .in('status', ['confirmed', 'completed'])
    .eq('payment_status', 'paid')

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError)
    process.exit(1)
  }

  if (!bookings || bookings.length === 0) {
    console.log('No paid confirmed/completed bookings found.')
    return
  }

  const bookingIds = bookings.map((b) => b.id)

  const { data: existingTransactions, error: txError } = await supabase
    .from('transactions')
    .select('booking_id')
    .in('booking_id', bookingIds)
    .eq('transaction_type', 'payment')
    .eq('status', 'completed')

  if (txError) {
    console.error('Error fetching existing transactions:', txError)
    process.exit(1)
  }

  const existingBookingIds = new Set((existingTransactions || []).map((t) => t.booking_id))
  const missingBookings = bookings.filter((b) => !existingBookingIds.has(b.id))

  if (missingBookings.length === 0) {
    console.log('All paid bookings already have completed payment transactions.')
    return
  }

  console.log(`Processing ${missingBookings.length} missing payment booking(s)...`)

  const { data: adminProfiles, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .limit(1)
    .single()

  if (adminError) {
    console.error('Error fetching admin profile for commission processing:', adminError)
    process.exit(1)
  }

  const adminId = adminProfiles?.id || null
  let processedCount = 0

  for (const booking of missingBookings) {
    try {
      const reference = `BACKFILL_PMT_${booking.id.slice(0, 8)}_${Date.now()}`
      const commissionAmount = Number(booking.commission_amount) || 0
      const commissionRate = Number(booking.commission_rate_at_booking) || 0
      const resolvedCommission = commissionAmount || Math.round(Number(booking.total_amount || 0) * commissionRate * 100) / 100

      let rpcResult = null
      let rpcError = null

      if (resolvedCommission > 0 && adminId) {
        const rpcRes = await supabase.rpc('process_payment_with_commission', {
          p_vendor_id: booking.vendor_id,
          p_total_amount: booking.total_amount,
          p_commission_amount: resolvedCommission,
          p_admin_id: adminId,
          p_booking_id: booking.id,
          p_tourist_id: booking.tourist_id || null,
          p_currency: booking.currency || 'UGX',
          p_payment_method: 'card',
          p_reference: reference
        })
        rpcResult = rpcRes.data
        rpcError = rpcRes.error
      } else {
        const rpcRes = await supabase.rpc('process_payment_atomic', {
          p_vendor_id: booking.vendor_id,
          p_amount: booking.total_amount,
          p_booking_id: booking.id,
          p_tourist_id: booking.tourist_id || null,
          p_currency: booking.currency || 'UGX',
          p_payment_method: 'card',
          p_reference: reference
        })
        rpcResult = rpcRes.data
        rpcError = rpcRes.error
      }

      if (rpcError) {
        throw rpcError
      }
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Failed to process backfill payment')
      }

      processedCount += 1
      console.log('Backfilled payment for booking', booking.id)
    } catch (err) {
      console.error('Failed to backfill booking', booking.id, err)
    }
  }

  console.log(`Processed ${processedCount} backfilled payment(s).`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
