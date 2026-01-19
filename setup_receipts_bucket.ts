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
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupReceiptsStorage() {
  try {
    console.log('Setting up receipts storage bucket...');

    // Create the receipts bucket
    const { data, error } = await supabase.storage.createBucket('receipts', {
      public: false,
      allowedMimeTypes: ['image/*', 'application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Receipts bucket already exists');
      } else {
        console.error('Error creating receipts bucket:', error);
        return;
      }
    } else {
      console.log('✅ Receipts bucket created successfully');
    }

    // Set up RLS policies for the receipts bucket
    console.log('Setting up storage policies...');

    // Note: Storage policies are typically set up via SQL in Supabase dashboard
    // The policies in setup_receipts_storage.sql should be run manually

    console.log('🎉 Receipts storage setup completed!');
    console.log('📋 Next steps:');
    console.log('1. Run the SQL in setup_receipts_storage.sql in your Supabase SQL editor');
    console.log('2. Test the receipt upload functionality in the Finance page');

  } catch (err) {
    console.error('Exception during setup:', err);
  }
}

setupReceiptsStorage();