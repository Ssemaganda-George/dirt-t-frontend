-- Migration 017: Add payout_meta column to transactions and helper RPC
-- Adds a jsonb column to store payout metadata (bank or mobile money) for withdrawal requests

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payout_meta jsonb;

COMMENT ON COLUMN public.transactions.payout_meta IS 'JSON object storing payout metadata for withdrawals, e.g. { type: "bank", name, account_name, account_number, branch, swift } or { type: "mobile_money", provider, country_code, phone, name }';

-- Create a helper atomic function that creates a withdrawal transaction including payout_meta.
-- This function is separate so we don't need to change the existing create_transaction_atomic signature immediately.
CREATE OR REPLACE FUNCTION process_withdrawal_create_with_payout_meta(
  p_vendor_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'UGX',
  p_payment_method text DEFAULT 'bank_transfer',
  p_reference text DEFAULT NULL,
  p_payout_meta jsonb DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_wallet_result jsonb;
  v_transaction record;
  v_result jsonb;
BEGIN
  -- First debit the wallet using existing atomic helper
  SELECT update_wallet_balance_atomic(
    p_vendor_id,
    p_amount,
    p_currency,
    'debit'
  ) INTO v_wallet_result;

  IF NOT (v_wallet_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to debit wallet: ' || (v_wallet_result->>'error'));
  END IF;

  -- Generate reference if not provided
  IF p_reference IS NULL THEN
    p_reference := UPPER('withdrawal_' || encode(gen_random_bytes(4), 'hex') || '_' || EXTRACT(epoch FROM now())::text);
  END IF;

  -- Insert transaction including payout_meta
  INSERT INTO public.transactions (
    booking_id,
    vendor_id,
    tourist_id,
    amount,
    currency,
    transaction_type,
    status,
    payment_method,
    reference,
    payout_meta,
    created_at
  ) VALUES (
    NULL,
    p_vendor_id,
    NULL,
    p_amount,
    p_currency,
    'withdrawal',
    'pending',
    p_payment_method,
    p_reference,
    p_payout_meta,
    now()
  ) RETURNING id INTO v_transaction;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction.id, 'reference', p_reference, 'wallet_id', v_wallet_result->>'wallet_id', 'new_balance', v_wallet_result->>'new_balance');

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback wallet debit if any error occurs
    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE vendor_id = p_vendor_id;

    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION process_withdrawal_create_with_payout_meta(uuid, numeric, text, text, text, jsonb) TO authenticated;

-- Create a variant of create_transaction_atomic that accepts payout_meta for use when creating pending withdrawals
CREATE OR REPLACE FUNCTION create_transaction_with_meta_atomic(
  p_booking_id uuid DEFAULT NULL,
  p_vendor_id uuid DEFAULT NULL,
  p_tourist_id uuid DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_currency text DEFAULT 'UGX',
  p_transaction_type text DEFAULT 'payment',
  p_status text DEFAULT 'pending',
  p_payment_method text DEFAULT 'card',
  p_reference text DEFAULT NULL,
  p_payout_meta jsonb DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_transaction record;
BEGIN
  -- Generate reference if not provided
  IF p_reference IS NULL THEN
    p_reference := UPPER(p_transaction_type || '_' || encode(gen_random_bytes(4), 'hex') || '_' || EXTRACT(epoch FROM now())::text);
  END IF;

  -- Insert transaction atomically, including payout_meta if provided
  INSERT INTO public.transactions (
    booking_id,
    vendor_id,
    tourist_id,
    amount,
    currency,
    transaction_type,
    status,
    payment_method,
    reference,
    payout_meta,
    created_at
  ) VALUES (
    p_booking_id,
    p_vendor_id,
    p_tourist_id,
    p_amount,
    p_currency,
    p_transaction_type,
    p_status,
    p_payment_method,
    p_reference,
    p_payout_meta,
    now()
  )
  RETURNING id INTO v_transaction;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction.id, 'reference', p_reference);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_transaction_with_meta_atomic(uuid, uuid, uuid, numeric, text, text, text, text, text, jsonb) TO authenticated;
