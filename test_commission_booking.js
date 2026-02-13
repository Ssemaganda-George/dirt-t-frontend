#!/usr/bin/env node

/**
 * Test Commission Calculation in Booking Creation
 * Verifies that commission amounts are calculated and stored correctly
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables:')
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testCommissionCalculation() {
  try {
    console.log('🧪 Testing commission calculation in booking creation...')

    // First, let's get a vendor with a tier assigned
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select(`
        id,
        business_name,
        current_tier_id,
        vendor_tiers (
          id,
          name,
          commission_rate
        )
      `)
      .not('current_tier_id', 'is', null)
      .limit(1)

    if (vendorError) {
      console.error('❌ Error fetching vendors:', vendorError)
      return
    }

    if (!vendors || vendors.length === 0) {
      console.log('⚠️  No vendors with tiers found. Please ensure vendors have tiers assigned.')
      return
    }

    const vendor = vendors[0]
    console.log(`📋 Testing with vendor: ${vendor.business_name}`)
    console.log(`   Tier: ${vendor.vendor_tiers?.name} (${vendor.vendor_tiers?.commission_rate}% commission)`)

    // Get one of their services
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('id, title, price')
      .eq('vendor_id', vendor.id)
      .eq('status', 'approved')
      .limit(1)

    if (serviceError) {
      console.error('❌ Error fetching services:', serviceError)
      return
    }

    if (!services || services.length === 0) {
      console.log('⚠️  No approved services found for this vendor.')
      return
    }

    const service = services[0]
    console.log(`📋 Testing with service: ${service.title} (Price: ${service.price})`)

    // Create a test booking
    const testBooking = {
      service_id: service.id,
      booking_date: new Date().toISOString().split('T')[0], // Today's date
      service_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      guests: 2,
      total_amount: service.price || 100000, // Use service price or default
      currency: 'UGX',
      guest_name: 'Test User',
      guest_email: 'test@example.com',
      guest_phone: '+256700000000'
    }

    console.log('📋 Creating test booking...')
    console.log(`   Amount: ${testBooking.total_amount} ${testBooking.currency}`)
    console.log(`   Expected commission: ${(testBooking.total_amount * (vendor.vendor_tiers?.commission_rate || 0) / 100).toFixed(2)}`)

    // This would normally be called through the createBooking function
    // For testing, we'll call the RPC function directly
    const { data: result, error: bookingError } = await supabase.rpc('create_booking_atomic', {
      p_service_id: testBooking.service_id,
      p_vendor_id: vendor.id,
      p_booking_date: testBooking.booking_date,
      p_guests: testBooking.guests,
      p_total_amount: testBooking.total_amount,
      p_service_date: testBooking.service_date,
      p_currency: testBooking.currency,
      p_guest_name: testBooking.guest_name,
      p_guest_email: testBooking.guest_email,
      p_guest_phone: testBooking.guest_phone
    })

    if (bookingError) {
      console.error('❌ Error creating booking:', bookingError)
      return
    }

    if (!result?.success) {
      console.error('❌ Booking creation failed:', result?.error)
      return
    }

    console.log('✅ Booking created successfully!')

    // Fetch the created booking to check commission fields
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', result.booking_id)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching booking:', fetchError)
      return
    }

    console.log('📋 Booking commission details:')
    console.log(`   Commission Rate: ${booking.commission_rate_at_booking}%`)
    console.log(`   Commission Amount: ${booking.commission_amount}`)
    console.log(`   Vendor Payout: ${booking.vendor_payout_amount}`)
    console.log(`   Tourist Paid: ${booking.total_amount}`)

    // Verify calculations
    const expectedCommission = Math.round((booking.total_amount * booking.commission_rate_at_booking / 100) * 100) / 100
    const expectedPayout = booking.total_amount - expectedCommission

    if (Math.abs(booking.commission_amount - expectedCommission) < 0.01 &&
        Math.abs(booking.vendor_payout_amount - expectedPayout) < 0.01) {
      console.log('✅ Commission calculations are correct!')
    } else {
      console.log('❌ Commission calculations are incorrect!')
      console.log(`   Expected commission: ${expectedCommission}, got: ${booking.commission_amount}`)
      console.log(`   Expected payout: ${expectedPayout}, got: ${booking.vendor_payout_amount}`)
    }

    // Clean up - delete the test booking
    console.log('🧹 Cleaning up test booking...')
    await supabase.from('bookings').delete().eq('id', result.booking_id)
    console.log('✅ Test completed!')

  } catch (err) {
    console.error('❌ Error in test:', err)
  }
}

testCommissionCalculation()