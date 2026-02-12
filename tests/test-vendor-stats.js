import { getVendorStats } from './src/lib/database.ts'

async function testVendorStats() {
  console.log('Testing getVendorStats function...')

  try {
    const result = await getVendorStats('test-vendor-id')
    console.log('Function executed successfully:', result)
    console.log('Services count:', result.servicesCount)
    console.log('Pending bookings:', result.pendingBookings)
    console.log('Completed bookings:', result.completedBookings)
  } catch (error) {
    console.error('Function failed:', error)
  }
}

testVendorStats()