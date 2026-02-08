import { supabase } from './supabaseClient';
// Utility to credit a wallet by vendor_id
export async function creditWallet(vendor_id: string, amount: number, currency: string) {
  try {
    // Use atomic function to update wallet balance
    const { data, error } = await supabase.rpc('update_wallet_balance_atomic', {
      p_vendor_id: vendor_id,
      p_amount: amount,
      p_currency: currency,
      p_operation: 'credit'
    });

    if (error) throw error;

    if (!data?.success) {
      throw new Error(data.error || 'Failed to credit wallet');
    }

    console.log('Wallet credited successfully:', data);
    return data;
  } catch (error) {
    console.error('Error crediting wallet:', error);
    throw error;
  }
}
