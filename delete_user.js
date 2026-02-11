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

async function deleteUserByEmail(email) {
  try {
    console.log(`Looking for user with email: ${email}`)

    // First, find the user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }

    const user = authUsers.users.find(u => u.email === email)

    if (!user) {
      console.log(`User with email ${email} not found in auth.users`)
      return
    }

    console.log(`Found user: ${user.id} (${user.email})`)

    // Get the user's profile to see their role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching user profile:', profileError)
    } else if (profile) {
      console.log(`User role: ${profile.role}, Name: ${profile.full_name}`)
    } else {
      console.log('User has no profile (incomplete signup)')
    }

    // Confirm deletion
    console.log(`\n⚠️  This will permanently delete user ${user.email} and all their data!`)
    console.log('This action cannot be undone.')

    // Ask for confirmation (in a real script, you'd want user input)
    console.log('\nTo delete this user, run this SQL in Supabase SQL Editor:')
    console.log(`DELETE FROM auth.users WHERE id = '${user.id}';`)

    console.log('\nAlternatively, if you want to use the application\'s delete function:')
    console.log(`// In your application code:`)
    console.log(`import { deleteUser } from './src/lib/database'`)
    console.log(`await deleteUser('${user.id}')`)

  } catch (error) {
    console.error('Error:', error)
  }
}

// Get email from command line argument
const email = process.argv[2]
if (!email) {
  console.log('Usage: node delete_user.js <email>')
  process.exit(1)
}

deleteUserByEmail(email)