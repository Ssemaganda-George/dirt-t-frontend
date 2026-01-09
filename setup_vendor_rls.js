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
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupVendorRLS() {
  try {
    console.log('🚀 Setting up RLS policies for vendors table...')

    // Read the RLS setup SQL file
    const sqlFilePath = join(__dirname, 'setup_vendor_rls.sql')
    const sqlContent = readFileSync(sqlFilePath, 'utf8')

    console.log('📋 Executing RLS setup...')

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })

        if (error) {
          console.error('Error executing statement:', statement.substring(0, 50), error)
          // Continue with other statements even if one fails
        } else {
          console.log('✅ Statement executed successfully')
        }
      }
    }

    console.log('🎉 RLS setup completed!')

    // Test the policies by querying with anon key
    console.log('Testing RLS policies...')
    const testSupabase = createClient(supabaseUrl, envVars.VITE_SUPABASE_ANON_KEY)

    // This should work now if RLS is set up correctly
    const { data, error } = await testSupabase
      .from('vendors')
      .select('id, business_name')
      .limit(5)

    if (error) {
      console.log('RLS test: Expected error (no auth context):', error.message)
    } else {
      console.log('RLS test: Found vendors (unexpected):', data?.length || 0)
    }

  } catch (error) {
    console.error('RLS setup failed:', error)
  }
}

setupVendorRLS()