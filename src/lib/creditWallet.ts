import { supabase } from './supabaseClient';
// Utility to credit a wallet by vendor_id
export async function creditWallet(vendor_id: string, amount: number, currency: string) {
  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('vendor_id', vendor_id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (wallet) {
    // Update existing wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance: (wallet.balance || 0) + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id);
    if (updateError) throw updateError;
  } else {
    // Create new wallet
    const { error: insertError } = await supabase
      .from('wallets')
      .insert({
        vendor_id,
        balance: amount,
        currency,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    if (insertError) throw insertError;
  }
}
