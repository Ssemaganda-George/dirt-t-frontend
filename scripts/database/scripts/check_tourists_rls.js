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

async function checkTouristsRLS() {
  try {
    console.log('Checking tourists table RLS status...')

    // Try to insert a test record to see if RLS allows it
    const testUserId = '00000000-0000-0000-0000-000000000000'
    const { error: testInsertError } = await supabase
      .from('tourists')
      .insert({
        user_id: testUserId,
        first_name: 'Test',
        last_name: 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (testInsertError && testInsertError.code === '42501') {
      console.log('❌ RLS is blocking inserts. You need to create proper policies.')
      console.log('\n📋 Please run the following SQL in your Supabase SQL editor:')
      console.log(`
-- Enable RLS on tourists table (if not already enabled)
ALTER TABLE tourists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tourist records" ON tourists;
DROP POLICY IF EXISTS "Users can insert their own tourist records" ON tourists;
DROP POLICY IF EXISTS "Users can update their own tourist records" ON tourists;
DROP POLICY IF EXISTS "Admins can manage all tourist records" ON tourists;

-- Create policy for users to view their own tourist records
CREATE POLICY "Users can view their own tourist records" ON tourists
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own tourist records
CREATE POLICY "Users can insert their own tourist records" ON tourists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own tourist records
CREATE POLICY "Users can update their own tourist records" ON tourists
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for admins to manage all tourist records
CREATE POLICY "Admins can manage all tourist records" ON tourists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
      `)
    } else if (testInsertError) {
      console.log('Different error occurred:', testInsertError)
    } else {
      console.log('✅ RLS policies seem to be working. Cleaning up test record...')
      // Clean up the test record
      await supabase.from('tourists').delete().eq('user_id', testUserId)
      console.log('✅ Test record cleaned up.')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

checkTouristsRLS()