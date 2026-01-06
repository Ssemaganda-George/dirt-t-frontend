import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Use service role key like the migration script
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testFlights() {
  try {
    console.log('Testing flights fetch with service role key...')

    // First check if table exists and what data is there
    const { data: allFlights, error: allError } = await supabase
      .from('flights')
      .select('*')

    if (allError) {
      console.error('Error fetching all flights:', allError)
      return
    }

    console.log(`Total flights in database: ${allFlights?.length || 0}`)
    allFlights?.forEach(flight => {
      console.log(`- ${flight.flight_number}: ${flight.status}, departure: ${flight.departure_time}`)
    })

    // Now test the filtered query
    const { data: activeFlights, error: activeError } = await supabase
      .from('flights')
      .select('*')
      .eq('status', 'active')
      .gte('departure_time', new Date().toISOString())
      .order('departure_time', { ascending: true })

    if (activeError) {
      console.error('Error fetching active flights:', activeError)
      return
    }

    console.log(`\nActive future flights: ${activeFlights?.length || 0}`)
    activeFlights?.forEach(flight => {
      console.log(`- ${flight.flight_number}: ${flight.departure_city} → ${flight.arrival_city} (${new Date(flight.departure_time).toLocaleDateString()})`)
    })

  } catch (error) {
    console.error('Test failed:', error)
  }
}

testFlights()