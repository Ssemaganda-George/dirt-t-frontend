#!/usr/bin/env node

// Script to create test flight data
// Usage: node create_test_flights.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Supabase environment variables not found in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestFlights() {
  try {
    console.log('✈️ Setting up flights table and creating test data...');

    // First, try to create the flights table
    console.log('📋 Checking/creating flights table...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.flights (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          flight_number VARCHAR(20) NOT NULL UNIQUE,
          airline VARCHAR(100) NOT NULL,
          departure_airport VARCHAR(10) NOT NULL,
          arrival_airport VARCHAR(10) NOT NULL,
          departure_city VARCHAR(100) NOT NULL,
          arrival_city VARCHAR(100) NOT NULL,
          departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
          arrival_time TIMESTAMP WITH TIME ZONE NOT NULL,
          duration_minutes INTEGER NOT NULL,
          aircraft_type VARCHAR(50),
          economy_price DECIMAL(10,2) NOT NULL,
          business_price DECIMAL(10,2),
          first_class_price DECIMAL(10,2),
          currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
          total_seats INTEGER NOT NULL,
          available_seats INTEGER NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'delayed', 'completed')),
          flight_class VARCHAR(20) NOT NULL DEFAULT 'economy' CHECK (flight_class IN ('economy', 'business', 'first_class')),
          amenities TEXT[] DEFAULT '{}',
          baggage_allowance VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Note: We can't run raw SQL with the JS client, so we'll try to create flights and see if the table exists
    console.log('🔍 Checking if flights table exists by attempting to query...');

    // Check if flights already exist
    const { data: existingFlights, error: checkError } = await supabase
      .from('flights')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === 'PGRST205') {
      console.log('❌ Flights table does not exist. Please run the SQL script manually:');
      console.log('📄 create_flights_table.sql');
      console.log('');
      console.log('Or execute this SQL in your Supabase SQL editor:');
      console.log(createTableSQL);
      return;
    }

    if (checkError) {
      console.error('❌ Error checking existing flights:', checkError);
      return;
    }

    if (existingFlights && existingFlights.length > 0) {
      console.log('ℹ️ Flights already exist in database. Skipping creation.');
      return;
    }

    const testFlights = [
      {
        flight_number: 'DT101',
        airline: 'DirtTrails Airlines',
        departure_airport: 'EBB',
        arrival_airport: 'JUB',
        departure_city: 'Entebbe',
        arrival_city: 'Juba',
        departure_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        arrival_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // Tomorrow + 2 hours
        duration_minutes: 120,
        aircraft_type: 'Boeing 737',
        economy_price: 150000,
        business_price: 300000,
        first_class_price: 500000,
        currency: 'UGX',
        total_seats: 150,
        available_seats: 120,
        status: 'active',
        flight_class: 'economy',
        amenities: ['WiFi', 'Meals', 'Entertainment'],
        baggage_allowance: '20kg'
      },
      {
        flight_number: 'DT202',
        airline: 'DirtTrails Airlines',
        departure_airport: 'EBB',
        arrival_airport: 'KGL',
        departure_city: 'Entebbe',
        arrival_city: 'Kigali',
        departure_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        arrival_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000).toISOString(), // Day after tomorrow + 1.5 hours
        duration_minutes: 90,
        aircraft_type: 'Airbus A320',
        economy_price: 120000,
        business_price: 250000,
        currency: 'UGX',
        total_seats: 180,
        available_seats: 150,
        status: 'active',
        flight_class: 'economy',
        amenities: ['WiFi', 'Snacks'],
        baggage_allowance: '15kg'
      },
      {
        flight_number: 'DT303',
        airline: 'DirtTrails Airlines',
        departure_airport: 'EBB',
        arrival_airport: 'DAR',
        departure_city: 'Entebbe',
        arrival_city: 'Dar es Salaam',
        departure_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        arrival_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // 3 days + 3 hours
        duration_minutes: 180,
        aircraft_type: 'Boeing 787',
        economy_price: 200000,
        business_price: 400000,
        first_class_price: 700000,
        currency: 'UGX',
        total_seats: 200,
        available_seats: 180,
        status: 'active',
        flight_class: 'business',
        amenities: ['WiFi', 'Meals', 'Entertainment', 'Premium Seating'],
        baggage_allowance: '30kg'
      }
    ];

    for (const flight of testFlights) {
      const { data, error } = await supabase
        .from('flights')
        .insert(flight)
        .select();

      if (error) {
        console.error(`❌ Error creating flight ${flight.flight_number}:`, error);
      } else {
        console.log(`✅ Created flight ${flight.flight_number}: ${flight.departure_city} → ${flight.arrival_city}`);
        console.log(`   Departure: ${new Date(flight.departure_time).toLocaleString()}`);
        console.log(`   Price: ${flight.currency} ${flight.economy_price.toLocaleString()}`);
        console.log('');
      }
    }

    console.log('🎉 Test flights created successfully!');
    console.log('You should now see flights on the Flights page.');

  } catch (error) {
    console.error('❌ Error creating test flights:', error);
  }
}

// Run the function
createTestFlights();