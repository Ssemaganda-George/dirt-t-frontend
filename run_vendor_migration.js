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

async function migrateVendors() {
  try {
    console.log('🚀 Starting vendor migration from profiles...')

    // First, get all vendor profiles that don't have vendor records
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, status')
      .eq('role', 'vendor')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }

    console.log(`Found ${profiles?.length || 0} vendor profiles`)

    // Check which profiles already have vendor records
    const { data: existingVendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('user_id')

    if (vendorsError) {
      console.error('Error fetching existing vendors:', vendorsError)
      return
    }

    const existingUserIds = new Set(existingVendors?.map(v => v.user_id) || [])

    // Filter profiles that need vendor records
    const profilesNeedingVendors = profiles?.filter(p => !existingUserIds.has(p.id)) || []

    console.log(`Need to create ${profilesNeedingVendors.length} vendor records`)

    // Create vendor records
    for (const profile of profilesNeedingVendors) {
      const vendorData = {
        user_id: profile.id,
        business_name: profile.full_name || 'Business Name',
        business_description: 'Please update your business description',
        business_email: profile.email,
        status: profile.status === 'approved' ? 'approved' :
                profile.status === 'pending' ? 'pending' :
                profile.status === 'rejected' ? 'rejected' :
                profile.status === 'suspended' ? 'suspended' : 'pending'
      }

      const { error: insertError } = await supabase
        .from('vendors')
        .insert(vendorData)

      if (insertError) {
        console.error(`Error creating vendor for ${profile.email}:`, insertError)
      } else {
        console.log(`✅ Created vendor record for ${profile.email}`)
      }
    }

    console.log('🎉 Vendor migration completed!')

    // Verify the migration
    const { data: finalVendors, error: finalError } = await supabase
      .from('vendors')
      .select('id, user_id, business_name, status')
      .limit(10)

    if (finalError) {
      console.error('Migration verification failed:', finalError)
    } else {
      console.log(`✅ Migration verified! Found ${finalVendors?.length || 0} vendor records:`)
      finalVendors?.forEach(vendor => {
        console.log(`  - ${vendor.business_name} (${vendor.status})`)
      })
    }

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrateVendors()