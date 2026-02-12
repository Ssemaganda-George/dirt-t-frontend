// Test script to verify referral submission works
// Run with: node test_referral_submission.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralSubmission() {
  console.log('🧪 Testing referral submission...');

  // First, check if the table exists
  console.log('🔍 Checking if partner_requests table exists...');
  try {
    const { data: tableCheck, error: tableError } = await supabase
      .from('partner_requests')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === 'PGRST116') {
      console.log('❌ Table does not exist. Please run the migration: create_partner_requests_table.sql');
      console.log('📄 Migration file location: ./create_partner_requests_table.sql');
      return false;
    }

    console.log('✅ Table exists, proceeding with test...');
  } catch (error) {
    console.log('⚠️  Could not verify table existence, proceeding anyway...');
  }

  const testReferral = {
    referrer_name: 'Test User',
    referrer_email: 'test@example.com',
    referrer_phone: '+256123456789',
    name: 'Test Business',
    email: 'business@test.com',
    phone: '+256987654321',
    company: 'Test Business Ltd',
    contact_person: 'John Doe',
    business_location: 'Kampala, Uganda',
    message: 'This is a test business referral for DirtTrails platform.'
  };

  try {
    console.log('📤 Submitting referral...');
    const insertData = {
      name: testReferral.name,
      email: testReferral.email,
      phone: testReferral.phone,
      company: testReferral.company,
      message: `Business Referral Submitted

Referrer Information:
- Name: ${testReferral.referrer_name}
- Email: ${testReferral.referrer_email}
${testReferral.referrer_phone ? `- Phone: ${testReferral.referrer_phone}` : ''}

Business Information:
- Business Name: ${testReferral.name}
- Location: ${testReferral.business_location || 'Not specified'}
- Contact Person: ${testReferral.contact_person || 'Not specified'}
- Contact Email: ${testReferral.email}
${testReferral.phone ? `- Contact Phone: ${testReferral.phone}` : ''}

Business Description:
${testReferral.message || 'No description provided'}

Submitted via DirtTrails referral form.`,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    console.log('Insert data:', JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from('partner_requests')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Referral submission failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Referral submitted successfully!');
    console.log('📋 Referral ID:', data.id);
    console.log('📄 Referral data:', JSON.stringify(data, null, 2));

    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('partner_requests')
      .delete()
      .eq('id', data.id);

    if (deleteError) {
      console.warn('⚠️  Could not clean up test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up');
    }

    return true;
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    console.error('Exception details:', error);
    return false;
  }
}

// Run the test
testReferralSubmission().then(success => {
  console.log(success ? '🎉 All tests passed!' : '💥 Tests failed!');
  process.exit(success ? 0 : 1);
});