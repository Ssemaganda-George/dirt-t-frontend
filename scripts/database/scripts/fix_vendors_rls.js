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
    console.log('Fixing RLS policies for vendors and profiles tables...')

    // Read the SQL file
    const sqlPath = join(__dirname, 'fix_vendors_rls.sql')
    const sql = readFileSync(sqlPath, 'utf8')

    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`)

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement.trim() + ';'
        })

        if (error) {
          console.log(`Note: ${error.message}`)
        } else {
          console.log('✅ Statement executed successfully')
        }
      }
    }

    console.log('RLS policies setup completed!')

  } catch (error) {
    console.error('Error:', error)
  }
}

fixRLS()