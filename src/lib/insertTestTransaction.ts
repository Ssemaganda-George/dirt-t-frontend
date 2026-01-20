import { supabase } from './supabaseClient';

// Run this script once to insert a test transaction for vendor wallet debugging
async function insertTestTransaction() {
  const vendorId = '71bdfb65-8e52-4cc0-888b-2e31a5f484de';
  const reference = `TEST_${Date.now()}`;
  const { data, error } = await supabase
    .from('transactions')
    .insert([
      {
        vendor_id: vendorId,
        amount: 100000,
        currency: 'UGX',
        transaction_type: 'payment',
        status: 'completed',
        payment_method: 'card',
        reference,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select();
  if (error) {
    console.error('Error inserting test transaction:', error);
  } else {
    console.log('Inserted test transaction:', data);
  }
}

insertTestTransaction();
