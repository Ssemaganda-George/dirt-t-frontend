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

async function checkTourists() {
  try {
    console.log('Checking tourist profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('role', 'tourist')
      .limit(10);

    if (profilesError) {
      console.error('Error fetching tourist profiles:', profilesError);
      return;
    }

    console.log('Tourist profiles found:', profiles?.length || 0);
    profiles?.forEach(profile => {
      console.log(`- ${profile.email}: role=${profile.role}, status=${profile.status}`);
    });

    console.log('\nChecking tourists table...');
    const { data: tourists, error: touristsError } = await supabase
      .from('tourists')
      .select('user_id, first_name, last_name')
      .limit(10);

    if (touristsError) {
      console.error('Error fetching tourists:', touristsError);
      return;
    }

    console.log('Tourist records found:', tourists?.length || 0);
    tourists?.forEach(tourist => {
      console.log(`- user_id=${tourist.user_id}, name=${tourist.first_name} ${tourist.last_name}`);
    });

  } catch (error) {
    console.error('Check error:', error);
  }
}

checkTourists();