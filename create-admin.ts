import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// Create Supabase client for Node.js
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('❌ Missing VITE_SUPABASE_URL environment variable')
  console.error('Make sure your .env file contains the Supabase URL')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY')
  console.error('For best results, add your service role key to the .env file')
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key')
  process.exit(1)
}

console.log('🔗 Connecting to Supabase...')
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Profile service functions for Node.js
const profileService = {
  async getById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async create(profile: any) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

async function createAdminUser() {
  const email = 'safaris.dirttrails@gmail.com'
  const password = 'DirtTrails@DirtTrails'

  try {
    console.log('Creating admin user...')
    console.log('Email:', email)
    console.log('Password:', password)

    // Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: 'Dirt Trails Admin',
          role: 'admin'
        }
      }
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      return
    }

    if (!authData.user) {
      console.error('No user data returned')
      return
    }

    console.log('✅ User created successfully:', authData.user.id)

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Check if profile exists
    let profile
    try {
      profile = await profileService.getById(authData.user.id)
      console.log('✅ Profile found:', profile)
    } catch (error) {
      console.log('Profile not found, creating manually...')
      // Create profile manually if trigger didn't work
      profile = await profileService.create({
        id: authData.user.id,
        email,
        full_name: 'Dirt Trails Admin',
        role: 'admin'
      })
      console.log('✅ Profile created manually:', profile)
    }

    console.log('\n🎉 Admin user creation completed successfully!')
    console.log('📧 Email:', email)
    console.log('🔒 Password:', password)
    console.log('👤 Role: admin')
    console.log('🆔 User ID:', authData.user.id)

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  }
}

// Run the function
createAdminUser()