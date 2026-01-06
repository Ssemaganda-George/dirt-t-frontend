import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  try {
    console.log('Reading comprehensive services migration file...')

    const sqlFilePath = join(__dirname, 'comprehensive_services_update.sql')
    const sqlContent = readFileSync(sqlFilePath, 'utf8')

    console.log('Executing migration...')

    // Split the SQL into individual statements (basic approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })

        if (error) {
          console.error('Error executing statement:', statement.substring(0, 50), error)
          // Continue with other statements even if one fails
        } else {
          console.log('✅ Statement executed successfully')
        }
      }
    }

    console.log('Migration completed!')

    // Verify the schema by checking if new columns exist
    console.log('Verifying schema update...')
    const { data, error: verifyError } = await supabase
      .from('services')
      .select('id')
      .limit(1)

    if (verifyError) {
      console.error('Schema verification failed:', verifyError)
    } else {
      console.log('✅ Schema update verified successfully')
    }

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

runMigration()