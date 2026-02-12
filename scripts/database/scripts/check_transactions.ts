import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const envContent = readFileSync(join(process.cwd(), '.env'), 'utf8');
const envLines = envContent.split('\n');
const envVars: { [key: string]: string } = {};

for (const line of envLines) {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
}

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function checkTransactions() {
  console.log('Checking transactions table...');
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id')
    .limit(1);

  console.log('Transactions exist:', !!transactions, 'Error:', error?.message);

  if (transactions) {
    // Try the specific query that's failing
    const vendorId = '71bdfb65-8e52-4cc0-888b-2e31a5f484de';
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('*, bookings (services (title))')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Transaction query result:', !!txData, 'Error:', txError?.message);
  }
}

checkTransactions();