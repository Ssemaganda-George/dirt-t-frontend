// Vendor orchestration — real Supabase calls for vendor wallet/withdrawal flows.
// The localStorage-based seed helpers remain in src/store/vendorStore.ts.
import { supabase } from '../lib/supabaseClient'
import type { Transaction } from '../types'

export async function requestWithdrawal(
  vendorId: string,
  amount: number,
  currency: string,
  payout?: { id?: string; type?: string; meta?: any }
): Promise<Transaction> {
  const paymentMethod = payout?.type === 'bank' ? 'bank_transfer' : 'mobile_money'
  let data: any = null
  let error: any = null

  if (payout?.meta) {
    const rpcRes = await supabase.rpc('process_withdrawal_create_with_payout_meta', {
      p_vendor_id: vendorId,
      p_amount: amount,
      p_currency: currency,
      p_payment_method: paymentMethod,
      p_reference: `WD_${Math.random().toString(36).slice(2, 8)}`,
      p_payout_meta: payout.meta,
    })
    data = rpcRes.data
    error = rpcRes.error
  } else {
    const rpcRes = await supabase.rpc('process_withdrawal_atomic', {
      p_vendor_id: vendorId,
      p_amount: amount,
      p_currency: currency,
      p_payment_method: paymentMethod,
      p_reference: `WD_${Math.random().toString(36).slice(2, 8)}`,
    })
    data = rpcRes.data
    error = rpcRes.error
  }

  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Failed to process withdrawal')

  return {
    id: data.transaction_id,
    vendor_id: vendorId,
    amount,
    currency,
    transaction_type: 'withdrawal',
    status: 'completed',
    payment_method: 'mobile_money',
    reference: data.reference,
    created_at: new Date().toISOString(),
  }
}
