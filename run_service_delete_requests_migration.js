import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read .env file manually
const envPath = join(__dirname, '.env')
const envContent = readFileSync(envPath, 'utf8')
const envLines = envContent.split('\n')
const envVars = {}

for (const line of envLines) {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Checking service_delete_requests table...')

    // Check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('service_delete_requests')
      .select('id')
      .limit(1)

    if (checkError && checkError.message.includes('does not exist')) {
      console.log('❌ Table does not exist.')
      console.log('\n📋 Please run the following SQL in your Supabase SQL Editor:')
      console.log('========================================================')
      const sqlContent = readFileSync(join(__dirname, 'create_service_delete_requests_table.sql'), 'utf8')
      console.log(sqlContent)
      console.log('========================================================')
      process.exit(1)
    } else {
      console.log('✅ Table exists!')
      console.log('Now testing if delete requests work...')

      // Test creating a dummy delete request to see if it works
      const { data: testData, error: testError } = await supabase
        .from('service_delete_requests')
        .select('*')
        .limit(1)

      if (testError) {
        console.error('❌ Error querying table:', testError)
      } else {
        console.log('✅ Table is accessible!')
        console.log('Sample data:', testData)
      }
    }

  } catch (error) {
    console.error('Migration check failed:', error)
    process.exit(1)
  }
}

runMigration()

runMigration()

runMigration()

runMigration()