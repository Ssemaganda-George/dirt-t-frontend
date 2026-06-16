-- Deploy process_payment_with_commission (was in db/005 but missing from production).
-- Credits vendor wallet (net of commission) and platform admin wallet (commission).

CREATE OR REPLACE FUNCTION public.process_payment_with_commission(
  p_vendor_id uuid,
  p_total_amount numeric,
  p_commission_amount numeric,
  p_admin_id uuid,
  p_booking_id uuid DEFAULT NULL,
  p_tourist_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'UGX',
  p_payment_method text DEFAULT 'card',
  p_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_vendor_amount numeric;
  v_transaction_result jsonb;
  v_vendor_wallet_result jsonb;
  v_admin_wallet_result jsonb;
  v_transaction_id uuid;
  v_existing_id uuid;
BEGIN
  -- Idempotency: same payment reference must not double-settle
  IF p_reference IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.transactions
    WHERE reference = p_reference
      AND transaction_type = 'payment'
      AND status = 'completed'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'skipped', true,
        'transaction_id', v_existing_id,
        'reference', p_reference
      );
    END IF;
  END IF;

  v_vendor_amount := p_total_amount - COALESCE(p_commission_amount, 0);

  IF v_vendor_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commission amount cannot exceed total payment amount');
  END IF;

  SELECT public.create_transaction_atomic(
    p_booking_id,
    p_vendor_id,
    p_tourist_id,
    p_total_amount,
    p_currency,
    'payment',
    'completed',
    p_payment_method,
    p_reference
  ) INTO v_transaction_result;

  IF NOT (v_transaction_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create transaction: ' || COALESCE(v_transaction_result->>'error', 'unknown')
    );
  END IF;

  v_transaction_id := (v_transaction_result->>'transaction_id')::uuid;

  IF v_vendor_amount > 0 THEN
    SELECT public.update_wallet_balance_atomic(
      p_vendor_id,
      v_vendor_amount,
      p_currency,
      'credit'
    ) INTO v_vendor_wallet_result;

    IF NOT (v_vendor_wallet_result->>'success')::boolean THEN
      UPDATE public.transactions SET status = 'failed' WHERE id = v_transaction_id;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to credit vendor wallet: ' || COALESCE(v_vendor_wallet_result->>'error', 'unknown')
      );
    END IF;
  END IF;

  IF COALESCE(p_commission_amount, 0) > 0 AND p_admin_id IS NOT NULL THEN
    SELECT public.update_wallet_balance_atomic(
      p_admin_id,
      p_commission_amount,
      p_currency,
      'credit'
    ) INTO v_admin_wallet_result;

    IF NOT (v_admin_wallet_result->>'success')::boolean THEN
      UPDATE public.transactions SET status = 'failed' WHERE id = v_transaction_id;

      IF v_vendor_amount > 0 THEN
        UPDATE public.wallets
        SET balance = balance - v_vendor_amount,
            updated_at = now()
        WHERE vendor_id = p_vendor_id;
      END IF;

      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to credit admin wallet: ' || COALESCE(v_admin_wallet_result->>'error', 'unknown')
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'reference', v_transaction_result->>'reference',
    'vendor_wallet_id', v_vendor_wallet_result->>'wallet_id',
    'admin_wallet_id', v_admin_wallet_result->>'wallet_id',
    'vendor_amount', v_vendor_amount,
    'commission_amount', COALESCE(p_commission_amount, 0),
    'vendor_new_balance', v_vendor_wallet_result->>'new_balance',
    'admin_new_balance', v_admin_wallet_result->>'new_balance'
  );

EXCEPTION
  WHEN OTHERS THEN
    IF v_transaction_id IS NOT NULL THEN
      UPDATE public.transactions SET status = 'failed' WHERE id = v_transaction_id;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.process_payment_with_commission IS
  'Settles a payment: ledger row (gross), vendor wallet (net), platform wallet (commission). Idempotent on p_reference.';
