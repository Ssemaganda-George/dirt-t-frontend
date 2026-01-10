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

async function fixRLS() {
  try {
    console.log('Fixing RLS policy for vendors table...')
    
    // Drop the restrictive policy
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "Admins can view all vendor records" ON vendors;'
    })
    
    if (dropError) {
      console.error('Error dropping policy:', dropError)
    }
    
    // Create a new policy that allows authenticated users
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Authenticated users can view vendor records" ON vendors
        FOR SELECT USING (auth.role() = 'authenticated');`
    })
    
    if (createError) {
      console.error('Error creating policy:', createError)
    } else {
      console.log('RLS policy updated successfully')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

fixRLS()
