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
    console.log('Fixing RLS policies for vendors table...')
    
    // Drop existing policies
    const policiesToDrop = [
      'Admins can view all vendor records',
      'Authenticated users can view vendor records',
      'Users can insert their own vendor records',
      'Users can update their own vendor records',
      'Users can view their own vendor records'
    ]
    
    for (const policy of policiesToDrop) {
      const { error: dropError } = await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${policy}" ON vendors;`
      })
      if (dropError) {
        console.log(`Note: Could not drop policy "${policy}":`, dropError.message)
      }
    }
    
    // Enable RLS on vendors table
    const { error: enableError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;'
    })
    if (enableError) {
      console.log('Note: RLS may already be enabled:', enableError.message)
    }
    
    // Create policy for users to view their own vendor records
    const { error: selectError } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can view their own vendor records" ON vendors
        FOR SELECT USING (auth.uid() = user_id);`
    })
    if (selectError) {
      console.error('Error creating SELECT policy:', selectError)
    } else {
      console.log('✅ Created SELECT policy for vendors')
    }
    
    // Create policy for users to insert their own vendor records
    const { error: insertError } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can insert their own vendor records" ON vendors
        FOR INSERT WITH CHECK (auth.uid() = user_id);`
    })
    if (insertError) {
      console.error('Error creating INSERT policy:', insertError)
    } else {
      console.log('✅ Created INSERT policy for vendors')
    }
    
    // Create policy for users to update their own vendor records
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can update their own vendor records" ON vendors
        FOR UPDATE USING (auth.uid() = user_id);`
    })
    if (updateError) {
      console.error('Error creating UPDATE policy:', updateError)
    } else {
      console.log('✅ Created UPDATE policy for vendors')
    }
    
    // Create policy for admins to manage all vendor records
    const { error: adminError } = await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Admins can manage all vendor records" ON vendors
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
          )
        );`
    })
    if (adminError) {
      console.error('Error creating admin policy:', adminError)
    } else {
      console.log('✅ Created admin policy for vendors')
    }
    
    console.log('RLS policies updated successfully!')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

fixRLS()
