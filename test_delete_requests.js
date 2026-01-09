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

async function testDeleteRequestsQuery() {
  try {
    console.log('Testing basic delete requests query...')

    // Test 1: Simple select without joins
    console.log('Test 1: Basic select *')
    const { data: basicData, error: basicError } = await supabase
      .from('service_delete_requests')
      .select('*')
      .limit(1)

    if (basicError) {
      console.error('Basic query failed:', basicError)
      return
    }

    console.log('✅ Basic query works, found', basicData?.length || 0, 'records')

    // Test 2: With auth (service role)
    console.log('Test 2: With service role auth')
    const clientWithAuth = createClient(supabaseUrl, supabaseServiceKey)
    const { data: authData, error: authError } = await clientWithAuth
      .from('service_delete_requests')
      .select('*')
      .limit(1)

    if (authError) {
      console.error('Auth query failed:', authError)
      return
    }

    console.log('✅ Auth query works, found', authData?.length || 0, 'records')

    // Test 3: Check RLS status
    console.log('Test 3: Checking RLS status')
    const { data: rlsData, error: rlsError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_name', 'service_delete_requests')
      .eq('table_schema', 'public')

    if (rlsError) {
      console.error('RLS check failed:', rlsError)
    } else {
      console.log('✅ Table exists in schema')
    }

  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

testDeleteRequestsQuery()