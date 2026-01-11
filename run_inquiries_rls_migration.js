import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  try {
    console.log('🚀 Starting inquiries migration...')

    console.log('📋 IMPORTANT: Please run the following SQL manually in Supabase Dashboard:')
    console.log('')
    console.log('Step 1 - Drop existing table (if it exists):')
    console.log('DROP TABLE IF EXISTS public.inquiries CASCADE;')
    console.log('')
    console.log('Step 2 - Create the inquiries table:')
    console.log('Copy and paste the entire contents of create_inquiries_table.sql')
    console.log('')
    console.log('Step 3 - Set up RLS policies:')
    console.log('Copy and paste the entire contents of add_inquiries_rls_policies.sql')
    console.log('')

    // Try to verify if the table exists
    console.log('📋 Checking current table status...')
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('id')
        .limit(1)

      if (error && error.code === 'PGRST116') {
        console.log('❌ Inquiries table does not exist. Please run the SQL migrations first.')
      } else if (!error) {
        console.log('✅ Inquiries table exists!')
      } else {
        console.log('⚠️ Table status unclear:', error.message)
      }
    } catch (verifyError) {
      console.log('❌ Could not verify table existence. Please run the SQL migrations first.')
    }

  } catch (error) {
    console.error('Migration script encountered an error:', error)
    console.log('')
    console.log('📋 To complete the migration manually:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Run: DROP TABLE IF EXISTS public.inquiries CASCADE;')
    console.log('3. Run create_inquiries_table.sql')
    console.log('4. Run add_inquiries_rls_policies.sql')
  }
}

runMigration()