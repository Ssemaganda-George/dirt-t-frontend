import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndFixProfiles() {
  try {
    console.log('Checking for users without profiles...')

    // Get all users from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }

    console.log(`Found ${users.users.length} users`)

    // Check each user for a profile
    for (const user of users.users) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log(`Creating profile for user: ${user.email} (ID: ${user.id})`)

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email,
            role: user.email === 'safaris.dirttrails@gmail.com' ? 'admin' : 'tourist'
          })

        if (insertError) {
          console.error(`Error creating profile for ${user.email}:`, insertError)
        } else {
          console.log(`✓ Profile created for ${user.email}`)
        }
      } else if (profile) {
        console.log(`✓ Profile exists for ${user.email} (role: ${profile.role})`)
      } else {
        console.error(`Error checking profile for ${user.email}:`, profileError)
      }
    }

    console.log('Profile check complete!')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkAndFixProfiles()