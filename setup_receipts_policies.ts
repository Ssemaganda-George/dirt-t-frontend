import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env file manually
const envPath = join(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const envVars: { [key: string]: string } = {};

for (const line of envLines) {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupReceiptsPolicies() {
  try {
    console.log('Setting up receipts storage policies...');

    // Note: We can't create storage policies programmatically via the JS client
    // These need to be run in the Supabase SQL editor
    console.log('📋 Please run the following SQL in your Supabase SQL editor:');
    console.log('');

    const sql = readFileSync(join(process.cwd(), 'setup_receipts_storage.sql'), 'utf8');
    console.log(sql);

    console.log('');
    console.log('🎉 After running the SQL, the receipts storage will be fully configured!');
    console.log('You can then test the receipt upload functionality in the Finance page.');

  } catch (err) {
    console.error('Exception during setup:', err);
  }
}

setupReceiptsPolicies();