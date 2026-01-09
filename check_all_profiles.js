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

async function checkAllProfiles() {
  try {
    console.log('Checking all profiles...')

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status')
      .order('email')

    if (error) {
      console.error('Error fetching profiles:', error)
      return
    }

    console.log(`Found ${profiles?.length || 0} profiles:`)
    profiles?.forEach(profile => {
      console.log(`- ${profile.email}: role=${profile.role}, status=${profile.status}, id=${profile.id}`)
    })

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkAllProfiles()