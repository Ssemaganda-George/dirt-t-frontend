import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client with your project URL and anon key
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAdminAccount() {
  try {
    console.log('Creating admin account...')

    // Create the user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'safaris.dirttrails@gmail.com',
      password: 'DirtTrails@DirTrails',
      options: {
        data: {
          full_name: 'Dirt Trails Admin'
        }
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError.message)
      return
    }

    console.log('Auth user created successfully:', authData.user?.email)

    // Wait a moment for the profile to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Update the profile to set admin role
    if (authData.user?.id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Error updating profile role:', profileError.message)
        return
      }

      console.log('Admin role assigned successfully!')
      console.log('Admin account created with email: safaris.dirttrails@gmail.com')
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createAdminAccount()