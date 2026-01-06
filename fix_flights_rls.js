import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixFlightsRLS() {
  try {
    console.log('Fixing flights RLS policies...')

    // The RLS policies need to be updated to allow public read access
    // Since we can't execute raw SQL, we'll need to do this manually in Supabase dashboard
    console.log('Please run the following SQL in your Supabase SQL editor:')
    console.log(`
-- Fix RLS policies for flights table to allow public read access for active flights
-- while restricting write access to admins only

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage all flights" ON flights;

-- Allow anyone to read active flights
CREATE POLICY "Anyone can view active flights" ON flights
  FOR SELECT USING (status = 'active');

-- Admins can manage all flights (insert, update, delete)
CREATE POLICY "Admins can manage all flights" ON flights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
    `)

    console.log('After running this SQL, flights should be visible to all users.')

  } catch (error) {
    console.error('Failed to fix RLS:', error)
  }
}

fixFlightsRLS()