import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAndCreateVendor() {
  console.log('Authenticating user...')

  // First authenticate as the user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'safaris.dirttrails@gmail.com',
    password: 'DirtTrails@DirtTrails'
  })

  if (authError) {
    console.error('Authentication failed:', authError)
    return
  }

  console.log('Authenticated successfully. User ID:', authData.user?.id)

  if (!authData.user?.id) {
    console.error('No user ID returned')
    return
  }

  // Check if vendor already exists
  console.log('Checking if vendor exists...')
  const { data: existingVendor, error: checkError } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (existingVendor) {
    console.log('Vendor already exists:', JSON.stringify(existingVendor, null, 2))
    return
  }

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking vendor:', checkError)
  }

  // Create vendor record
  console.log('Creating vendor record...')
  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert([{
      user_id: authData.user.id,
      business_name: 'Dirt Trails Safaris',
      business_description: 'Professional safari and tour services in Uganda',
      business_email: 'safaris.dirttrails@gmail.com',
      status: 'approved'
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating vendor:', error);
  } else {
    console.log('Vendor created successfully:', JSON.stringify(vendor, null, 2));
  }
}

checkAndCreateVendor()