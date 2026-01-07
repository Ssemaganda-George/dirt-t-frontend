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

async function checkDatabase() {
  try {
    console.log('Testing getServiceById for the specific service...');
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(`
        *,
        vendors (
          id,
          business_name,
          business_description,
          business_email,
          status
        ),
        service_categories (
          id,
          name,
          icon
        )
      `)
      .eq('id', '9cb73f36-04c6-44c0-9e71-82399617c20b')
      .maybeSingle();

    if (serviceError) {
      console.error('Error fetching service:', serviceError);
    } else {
      console.log('Service found:', service);
    }

    console.log('\nChecking services...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, status, vendor_id')
      .limit(10);

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
    } else {
      console.log('Services found:', services?.length || 0);
      console.log('Services:', services);
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

checkDatabase();