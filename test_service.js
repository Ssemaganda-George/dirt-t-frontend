import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function testServiceCreation() {
  try {
    // Load environment variables
    const envContent = fs.readFileSync('.env', 'utf8');
    const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1];
    const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1];

    if (!supabaseUrl || !supabaseKey) {
      console.log('Missing Supabase credentials');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Not authenticated');
      return;
    }
    console.log('User ID:', user.id);

    // Check vendor
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (vendorError) {
      console.log('Vendor error:', vendorError);
      return;
    }
    console.log('Vendor:', vendor);

    // Try to create a simple service
    const { data, error } = await supabase
      .from('services')
      .insert([{
        vendor_id: vendor.id,
        category_id: 'cat_tour',
        title: 'Test Service',
        description: 'Test Description',
        price: 100,
        currency: 'UGX'
      }])
      .select();

    if (error) {
      console.log('Service creation error:', error);
    } else {
      console.log('Service created:', data);
    }
  } catch (err) {
    console.log('Error:', err);
  }
}

testServiceCreation();