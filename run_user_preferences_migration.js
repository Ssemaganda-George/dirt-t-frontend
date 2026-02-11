import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Running user_preferences migration...')

    // Read the migration file
    const migrationSQL = readFileSync('./db/004_user_preferences.sql', 'utf8')

    console.log('📋 Migration SQL:')
    console.log(migrationSQL)
    console.log('')

    // For Supabase, we need to run this through the SQL editor in the dashboard
    // or use the Supabase CLI. For now, let's try to execute it using raw SQL
    console.log('⚠️  Please run the following SQL in your Supabase SQL Editor:')
    console.log('')
    console.log('='.repeat(80))
    console.log(migrationSQL)
    console.log('='.repeat(80))
    console.log('')
    console.log('Or use the Supabase CLI:')
    console.log('supabase db push')
    console.log('')
    console.log('After running the migration, test the preferences functionality.')

  } catch (error) {
    console.error('❌ Migration script failed:', error)
    process.exit(1)
  }
}

runMigration()