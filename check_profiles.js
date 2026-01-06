import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')

  if (error) {
    console.error('Error fetching profiles:', error)
  } else {
    console.log('Current profiles:')
    console.table(data)
  }
}

checkProfiles()