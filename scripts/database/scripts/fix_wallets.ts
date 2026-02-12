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

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY);

async function fixWalletVendorIds() {
  console.log('Fixing wallet vendor_ids...');

  // Get all wallets
  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('id, vendor_id');

  if (error) {
    console.error('Error fetching wallets:', error);
    return;
  }

  for (const wallet of wallets || []) {
    // Check if vendor_id is actually a user_id (by checking if it exists in vendors table as user_id)
    const { data: vendor, error: vError } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', wallet.vendor_id)
      .single();

    if (!vError && vendor) {
      console.log(`Updating wallet ${wallet.id} from user_id ${wallet.vendor_id} to vendor_id ${vendor.id}`);

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ vendor_id: vendor.id })
        .eq('id', wallet.id);

      if (updateError) {
        console.error('Error updating wallet:', updateError);
      }
    }
  }

  console.log('Done fixing wallets');
}

fixWalletVendorIds();