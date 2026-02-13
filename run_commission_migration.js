#!/usr/bin/env node

/**
 * Run Commission Migration Script
 * Updates the create_booking_atomic function to include commission calculations
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Running commission calculation migration...')

    // Read the migration SQL
    const migrationPath = join(__dirname, 'db', '033_add_commission_calculation_to_booking_creation.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')

    console.log('📋 Executing migration SQL...')

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('The create_booking_atomic function now includes commission calculations.')

  } catch (err) {
    console.error('❌ Error running migration:', err)
    process.exit(1)
  }
}

runMigration()