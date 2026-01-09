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
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVendorStatus() {
  try {
    console.log('Checking vendor status in database...');

    // Check vendor profiles with status
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('role', 'vendor')
      .limit(20);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    console.log('Vendor profiles found:', profiles?.length || 0);
    profiles?.forEach(profile => {
      console.log(`- ${profile.email}: role=${profile.role}, status=${profile.status}`);
    });

    // Check vendors table
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, user_id, business_name, status')
      .limit(20);

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError);
      return;
    }

    console.log('\nVendor records found:', vendors?.length || 0);
    vendors?.forEach(vendor => {
      console.log(`- ${vendor.business_name}: user_id=${vendor.user_id}, status=${vendor.status}`);
    });

  } catch (error) {
    console.error('Check error:', error);
  }
}

checkVendorStatus();