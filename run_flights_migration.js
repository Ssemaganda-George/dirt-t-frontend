import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  try {
    console.log('Running flights migration...')

    // First, check if flights table exists
    console.log('Checking if flights table exists...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('flights')
      .select('id')
      .limit(1)

    if (tableError && tableError.code === 'PGRST116') {
      console.log('❌ Flights table does not exist. Please create it manually in Supabase dashboard using the SQL from create_flights_table.sql')
      console.log('After creating the table, run this migration script again.')
      return
    }

    // First, add the Flights category to service_categories
    console.log('Adding Flights category...')
    const { error: categoryError } = await supabase
      .from('service_categories')
      .upsert({
        id: 'cat_flights',
        name: 'Flights',
        description: 'Air travel and flight services',
        icon: '✈️'
      })

    if (categoryError) {
      console.error('Error adding flights category:', categoryError)
    } else {
      console.log('✅ Flights category added successfully')
    }

    // Insert sample flight data
    console.log('Inserting sample flight data...')
    const sampleFlights = [
      {
        flight_number: 'KQ101',
        airline: 'Kenya Airways',
        departure_airport: 'EBB',
        arrival_airport: 'NBO',
        departure_city: 'Entebbe',
        arrival_city: 'Nairobi',
        departure_time: '2026-02-15T08:00:00+00:00',
        arrival_time: '2026-02-15T09:30:00+00:00',
        duration_minutes: 90,
        aircraft_type: 'Boeing 737',
        economy_price: 450000,
        business_price: 1200000,
        first_class_price: 2500000,
        currency: 'UGX',
        total_seats: 150,
        available_seats: 120,
        status: 'active',
        flight_class: 'economy',
        amenities: ['WiFi', 'Entertainment', 'Meals'],
        baggage_allowance: '20kg checked + 8kg carry-on'
      },
      {
        flight_number: 'UR201',
        airline: 'RwandAir',
        departure_airport: 'EBB',
        arrival_airport: 'KGL',
        departure_city: 'Entebbe',
        arrival_city: 'Kigali',
        departure_time: '2026-02-15T10:00:00+00:00',
        arrival_time: '2026-02-15T11:15:00+00:00',
        duration_minutes: 75,
        aircraft_type: 'Bombardier CRJ',
        economy_price: 280000,
        business_price: 750000,
        first_class_price: 1500000,
        currency: 'UGX',
        total_seats: 80,
        available_seats: 65,
        status: 'active',
        flight_class: 'economy',
        amenities: ['WiFi', 'Snacks'],
        baggage_allowance: '15kg checked + 7kg carry-on'
      },
      {
        flight_number: 'ET301',
        airline: 'Ethiopian Airlines',
        departure_airport: 'EBB',
        arrival_airport: 'ADD',
        departure_city: 'Entebbe',
        arrival_city: 'Addis Ababa',
        departure_time: '2026-02-15T14:00:00+00:00',
        arrival_time: '2026-02-15T16:30:00+00:00',
        duration_minutes: 150,
        aircraft_type: 'Boeing 787',
        economy_price: 650000,
        business_price: 1800000,
        first_class_price: 3500000,
        currency: 'UGX',
        total_seats: 200,
        available_seats: 180,
        status: 'active',
        flight_class: 'economy',
        amenities: ['WiFi', 'Entertainment', 'Meals', 'USB Charging'],
        baggage_allowance: '23kg checked + 8kg carry-on'
      },
      {
        flight_number: 'KL401',
        airline: 'KLM',
        departure_airport: 'EBB',
        arrival_airport: 'AMS',
        departure_city: 'Entebbe',
        arrival_city: 'Amsterdam',
        departure_time: '2026-02-15T22:00:00+00:00',
        arrival_time: '2026-02-16T08:00:00+00:00',
        duration_minutes: 540,
        aircraft_type: 'Boeing 777',
        economy_price: 2200000,
        business_price: 6500000,
        first_class_price: 12000000,
        currency: 'UGX',
        total_seats: 300,
        available_seats: 250,
        status: 'active',
        flight_class: 'economy',
        amenities: ['WiFi', 'Entertainment', 'Meals', 'Lie-flat seats', 'USB Charging'],
        baggage_allowance: '23kg checked + 8kg carry-on'
      }
    ]

    for (const flight of sampleFlights) {
      const { error: flightError } = await supabase
        .from('flights')
        .upsert(flight, { onConflict: 'flight_number' })

      if (flightError) {
        console.error(`Error inserting flight ${flight.flight_number}:`, flightError)
      } else {
        console.log(`✅ Flight ${flight.flight_number} inserted successfully`)
      }
    }

    console.log('Flights migration completed!')

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()