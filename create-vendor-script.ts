import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  // 1. Sign up the user
  const email = 'ssemagandageorge480@gmail.com';
  const password = 'DirtTrails123';

  // Try minimal metadata to test trigger
  const full_name = 'Random Vendor';
  const role = 'vendor';
  const rawMeta = { full_name, role };
  console.log('Sending user metadata:', rawMeta);
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: rawMeta
    }
  });

  if (signupError) {
    console.error('Signup error:', signupError.message);
    console.error('Full error:', signupError);
    return;
  }

  const user = signupData.user;
  if (!user) {
    console.error('No user returned from signup.');
    return;
  }

  // 2. Insert into vendors table
  const vendor = {
    user_id: user.id,
    business_name: 'Random Business ' + Math.floor(Math.random() * 10000),
    business_description: 'Random description',
    business_address: 'Random address',
    business_phone: '+256700000000',
    business_email: email,
    business_license: 'RANDOM-LICENSE',
    tax_id: 'RANDOM-TAXID',
    status: 'pending',
    approved_at: null,
    approved_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: vendorData, error: vendorError } = await supabase.from('vendors').insert([vendor]).select().single();
  if (vendorError) {
    console.error('Vendor insert error:', vendorError.message);
    return;
  }

  console.log('Vendor created:', vendorData);
}

main();
