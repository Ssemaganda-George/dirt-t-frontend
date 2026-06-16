-- Feature 4: Pending vs available wallet buckets with per-booking/order holds.

ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS pending_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_balance numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.wallets.pending_balance IS 'Vendor earnings not yet eligible for withdrawal (service not delivered).';
COMMENT ON COLUMN public.wallets.available_balance IS 'Vendor earnings eligible for withdrawal.';

-- Existing balances were withdrawable before this feature.
UPDATE public.wallets
SET
  available_balance = COALESCE(balance, 0),
  pending_balance = 0
WHERE COALESCE(available_balance, 0) = 0
  AND COALESCE(pending_balance, 0) = 0
  AND COALESCE(balance, 0) <> 0;

UPDATE public.wallets
SET balance = COALESCE(pending_balance, 0) + COALESCE(available_balance, 0)
WHERE balance IS DISTINCT FROM (COALESCE(pending_balance, 0) + COALESCE(available_balance, 0));

CREATE TABLE IF NOT EXISTS public.vendor_balance_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  booking_id uuid NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_id uuid NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'UGX',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'cancelled')),
  release_after timestamptz NOT NULL,
  released_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_balance_holds_booking_pending
  ON public.vendor_balance_holds (booking_id)
  WHERE booking_id IS NOT NULL AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_balance_holds_order_pending
  ON public.vendor_balance_holds (order_id)
  WHERE order_id IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_vendor_balance_holds_release
  ON public.vendor_balance_holds (status, release_after);

ALTER TABLE public.vendor_balance_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_vendor_balance_holds" ON public.vendor_balance_holds;
CREATE POLICY "service_role_all_vendor_balance_holds"
ON public.vendor_balance_holds
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.sync_wallet_total_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.balance := COALESCE(NEW.pending_balance, 0) + COALESCE(NEW.available_balance, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_wallet_total_balance ON public.wallets;
CREATE TRIGGER trg_sync_wallet_total_balance
BEFORE INSERT OR UPDATE OF pending_balance, available_balance ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.sync_wallet_total_balance();

CREATE OR REPLACE FUNCTION public.compute_booking_release_after(p_booking_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_booking record;
  v_service_day date;
BEGIN
  SELECT b.status, b.service_date, b.booking_date, s.category_id
  INTO v_booking
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id = b.service_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN now() + interval '1 day';
  END IF;

  IF v_booking.status = 'completed' THEN
    RETURN now();
  END IF;

  v_service_day := COALESCE(v_booking.service_date, v_booking.booking_date)::date;

  IF v_booking.category_id = 'cat_transport' THEN
    RETURN (v_service_day + 1)::timestamptz;
  END IF;

  RETURN (v_service_day + 1)::timestamptz;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_order_release_after(p_order_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT status, created_at INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN now() + interval '1 day';
  END IF;

  IF v_order.status = 'completed' THEN
    RETURN now();
  END IF;

  RETURN (v_order.created_at::date + 1)::timestamptz;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wallet_balance_atomic(
  p_vendor_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'UGX',
  p_operation text DEFAULT 'credit',
  p_bucket text DEFAULT 'available'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_wallet record;
  v_new_pending numeric;
  v_new_available numeric;
  v_bucket text;
BEGIN
  v_bucket := lower(COALESCE(p_bucket, 'available'));
  IF v_bucket NOT IN ('pending', 'available') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid bucket. Must be pending or available');
  END IF;

  IF p_operation = 'debit' THEN
    v_bucket := 'available';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE vendor_id = p_vendor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_operation = 'debit' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Wallet not found and cannot debit from non-existent wallet');
    END IF;

    INSERT INTO public.wallets (
      vendor_id,
      pending_balance,
      available_balance,
      balance,
      currency,
      created_at,
      updated_at
    ) VALUES (
      p_vendor_id,
      CASE WHEN v_bucket = 'pending' THEN p_amount ELSE 0 END,
      CASE WHEN v_bucket = 'available' THEN p_amount ELSE 0 END,
      p_amount,
      p_currency,
      now(),
      now()
    )
    RETURNING * INTO v_wallet;

    RETURN jsonb_build_object(
      'success', true,
      'wallet_id', v_wallet.id,
      'new_balance', v_wallet.balance,
      'pending_balance', v_wallet.pending_balance,
      'available_balance', v_wallet.available_balance,
      'action', 'created'
    );
  END IF;

  IF v_wallet.currency != p_currency THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Currency mismatch: wallet is %s, operation is %s', v_wallet.currency, p_currency)
    );
  END IF;

  v_new_pending := COALESCE(v_wallet.pending_balance, 0);
  v_new_available := COALESCE(v_wallet.available_balance, 0);

  IF p_operation = 'credit' THEN
    IF v_bucket = 'pending' THEN
      v_new_pending := v_new_pending + p_amount;
    ELSE
      v_new_available := v_new_available + p_amount;
    END IF;
  ELSIF p_operation = 'debit' THEN
    v_new_available := v_new_available - p_amount;
    IF v_new_available < 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Insufficient available funds: available %s, debit amount %s', v_wallet.available_balance, p_amount)
      );
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid operation. Must be credit or debit');
  END IF;

  UPDATE public.wallets
  SET
    pending_balance = v_new_pending,
    available_balance = v_new_available,
    updated_at = now()
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', v_wallet.id,
    'old_balance', v_wallet.balance,
    'new_balance', v_wallet.balance,
    'pending_balance', v_wallet.pending_balance,
    'available_balance', v_wallet.available_balance,
    'action', 'updated'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_vendor_pending_with_hold(
  p_vendor_id uuid,
  p_amount numeric,
  p_currency text,
  p_transaction_id uuid,
  p_booking_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_existing_hold uuid;
  v_release_after timestamptz;
  v_wallet_result jsonb;
  v_hold_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'zero_amount');
  END IF;

  IF p_booking_id IS NOT NULL THEN
    SELECT id INTO v_existing_hold
    FROM public.vendor_balance_holds
    WHERE booking_id = p_booking_id
      AND status = 'pending'
    LIMIT 1;

    IF v_existing_hold IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'skipped', true, 'hold_id', v_existing_hold, 'reason', 'hold_exists');
    END IF;

    v_release_after := public.compute_booking_release_after(p_booking_id);
  ELSIF p_order_id IS NOT NULL THEN
    SELECT id INTO v_existing_hold
    FROM public.vendor_balance_holds
    WHERE order_id = p_order_id
      AND status = 'pending'
    LIMIT 1;

    IF v_existing_hold IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'skipped', true, 'hold_id', v_existing_hold, 'reason', 'hold_exists');
    END IF;

    v_release_after := public.compute_order_release_after(p_order_id);
  ELSE
    v_release_after := now() + interval '1 day';
  END IF;

  SELECT public.update_wallet_balance_atomic(
    p_vendor_id,
    p_amount,
    p_currency,
    'credit',
    'pending'
  ) INTO v_wallet_result;

  IF NOT (v_wallet_result->>'success')::boolean THEN
    RETURN v_wallet_result;
  END IF;

  INSERT INTO public.vendor_balance_holds (
    vendor_id,
    booking_id,
    order_id,
    transaction_id,
    amount,
    currency,
    status,
    release_after
  ) VALUES (
    p_vendor_id,
    p_booking_id,
    p_order_id,
    p_transaction_id,
    p_amount,
    p_currency,
    'pending',
    v_release_after
  )
  RETURNING id INTO v_hold_id;

  RETURN jsonb_build_object(
    'success', true,
    'hold_id', v_hold_id,
    'release_after', v_release_after,
    'pending_balance', v_wallet_result->>'pending_balance',
    'available_balance', v_wallet_result->>'available_balance'
  );

EXCEPTION
  WHEN OTHERS THEN
    PERFORM public.update_wallet_balance_atomic(p_vendor_id, p_amount, p_currency, 'debit', 'pending');
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_vendor_balance_hold(p_hold_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_hold record;
  v_wallet record;
BEGIN
  SELECT * INTO v_hold
  FROM public.vendor_balance_holds
  WHERE id = p_hold_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hold not found');
  END IF;

  IF v_hold.status = 'released' THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'hold_id', v_hold.id);
  END IF;

  IF v_hold.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hold is not pending');
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE vendor_id = v_hold.vendor_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_wallet.pending_balance, 0) < v_hold.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient pending balance for hold release');
  END IF;

  UPDATE public.wallets
  SET
    pending_balance = COALESCE(pending_balance, 0) - v_hold.amount,
    available_balance = COALESCE(available_balance, 0) + v_hold.amount,
    updated_at = now()
  WHERE id = v_wallet.id;

  UPDATE public.vendor_balance_holds
  SET status = 'released', released_at = now(), updated_at = now()
  WHERE id = v_hold.id;

  RETURN jsonb_build_object(
    'success', true,
    'hold_id', v_hold.id,
    'amount', v_hold.amount,
    'vendor_id', v_hold.vendor_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_eligible_vendor_holds(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_hold_id uuid;
  v_result jsonb;
  v_released integer := 0;
  v_skipped integer := 0;
  v_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  FOR v_hold_id IN
    SELECT h.id
    FROM public.vendor_balance_holds h
    LEFT JOIN public.bookings b ON b.id = h.booking_id
    LEFT JOIN public.orders o ON o.id = h.order_id
    WHERE h.status = 'pending'
      AND (
        h.release_after <= now()
        OR b.status = 'completed'
        OR o.status = 'completed'
      )
    ORDER BY h.release_after ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500))
  LOOP
    v_result := public.release_vendor_balance_hold(v_hold_id);

    IF (v_result->>'success')::boolean THEN
      IF (v_result->>'skipped')::boolean THEN
        v_skipped := v_skipped + 1;
      ELSE
        v_released := v_released + 1;
      END IF;
    ELSE
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('hold_id', v_hold_id, 'error', v_result->>'error'));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'released', v_released,
    'skipped', v_skipped,
    'failed', v_failed,
    'errors', v_errors
  );
END;
$$;

-- Vendor settlement credits pending; platform commission credits available.
CREATE OR REPLACE FUNCTION public.apply_wallet_credits_for_transaction(
  p_transaction_id uuid,
  p_commission_amount numeric,
  p_admin_id uuid DEFAULT NULL,
  p_total_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_tx record;
  v_admin_id uuid;
  v_total numeric;
  v_commission numeric;
  v_vendor_amount numeric;
  v_vendor_wallet_result jsonb;
  v_admin_wallet_result jsonb;
  v_order_id uuid;
  v_settlement jsonb;
BEGIN
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  IF v_tx.transaction_type <> 'payment' OR v_tx.status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction is not a completed payment');
  END IF;

  IF v_tx.payout_meta IS NOT NULL AND v_tx.payout_meta ? 'wallet_settlement' THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'transaction_id', v_tx.id,
      'reason', 'wallet_settlement_already_applied'
    );
  END IF;

  v_admin_id := COALESCE(p_admin_id, public.get_default_admin_profile_id());
  v_total := COALESCE(p_total_amount, v_tx.amount, 0);
  v_commission := GREATEST(0, COALESCE(p_commission_amount, 0));
  v_vendor_amount := GREATEST(0, v_total - v_commission);

  IF v_vendor_amount > 0 THEN
    IF v_tx.booking_id IS NOT NULL THEN
      v_vendor_wallet_result := public.credit_vendor_pending_with_hold(
        v_tx.vendor_id,
        v_vendor_amount,
        COALESCE(v_tx.currency, 'UGX'),
        v_tx.id,
        v_tx.booking_id,
        NULL
      );
    ELSE
      SELECT id INTO v_order_id
      FROM public.orders
      WHERE reference = v_tx.reference
      LIMIT 1;

      v_vendor_wallet_result := public.credit_vendor_pending_with_hold(
        v_tx.vendor_id,
        v_vendor_amount,
        COALESCE(v_tx.currency, 'UGX'),
        v_tx.id,
        NULL,
        v_order_id
      );
    END IF;

    IF NOT (v_vendor_wallet_result->>'success')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to credit vendor pending wallet: ' || COALESCE(v_vendor_wallet_result->>'error', 'unknown')
      );
    END IF;
  END IF;

  IF v_commission > 0 AND v_admin_id IS NOT NULL THEN
    SELECT public.update_wallet_balance_atomic(
      v_admin_id,
      v_commission,
      COALESCE(v_tx.currency, 'UGX'),
      'credit',
      'available'
    ) INTO v_admin_wallet_result;

    IF NOT (v_admin_wallet_result->>'success')::boolean THEN
      IF v_vendor_amount > 0 AND NOT (v_vendor_wallet_result->>'skipped')::boolean THEN
        PERFORM public.update_wallet_balance_atomic(
          v_tx.vendor_id,
          v_vendor_amount,
          COALESCE(v_tx.currency, 'UGX'),
          'debit',
          'pending'
        );
        UPDATE public.vendor_balance_holds
        SET status = 'cancelled', updated_at = now()
        WHERE transaction_id = v_tx.id AND status = 'pending';
      END IF;

      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to credit admin wallet: ' || COALESCE(v_admin_wallet_result->>'error', 'unknown')
      );
    END IF;
  END IF;

  v_settlement := jsonb_build_object(
    'applied_at', now(),
    'vendor_amount', v_vendor_amount,
    'commission_amount', v_commission,
    'vendor_bucket', 'pending',
    'backfill', true
  );

  UPDATE public.transactions
  SET payout_meta = COALESCE(payout_meta, '{}'::jsonb) || jsonb_build_object('wallet_settlement', v_settlement),
      updated_at = now()
  WHERE id = v_tx.id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx.id,
    'vendor_amount', v_vendor_amount,
    'commission_amount', v_commission,
    'hold_id', v_vendor_wallet_result->>'hold_id',
    'pending_balance', v_vendor_wallet_result->>'pending_balance',
    'available_balance', v_vendor_wallet_result->>'available_balance'
  );
END;
$$;

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
  v_order_id uuid;
  v_settlement jsonb;
BEGIN
  IF p_reference IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.transactions
    WHERE reference = p_reference
      AND transaction_type = 'payment'
      AND status = 'completed'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN public.apply_wallet_credits_for_transaction(
        v_existing_id,
        COALESCE(p_commission_amount, 0),
        p_admin_id,
        p_total_amount
      );
    END IF;

    IF EXISTS (SELECT 1 FROM public.payments WHERE reference = p_reference) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.payments
        WHERE reference = p_reference AND status = 'completed'
      ) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'MarzPay payment is not completed for this reference'
        );
      END IF;
    END IF;
  END IF;

  IF p_booking_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.id = p_booking_id
        AND b.payment_status = 'paid'
        AND b.status IN ('confirmed', 'completed')
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Booking is not paid or not in a confirmed state'
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
    IF p_booking_id IS NOT NULL THEN
      v_vendor_wallet_result := public.credit_vendor_pending_with_hold(
        p_vendor_id,
        v_vendor_amount,
        p_currency,
        v_transaction_id,
        p_booking_id,
        NULL
      );
    ELSE
      SELECT id INTO v_order_id
      FROM public.orders
      WHERE reference = p_reference
      LIMIT 1;

      v_vendor_wallet_result := public.credit_vendor_pending_with_hold(
        p_vendor_id,
        v_vendor_amount,
        p_currency,
        v_transaction_id,
        NULL,
        v_order_id
      );
    END IF;

    IF NOT (v_vendor_wallet_result->>'success')::boolean THEN
      UPDATE public.transactions SET status = 'failed' WHERE id = v_transaction_id;
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to credit vendor pending wallet: ' || COALESCE(v_vendor_wallet_result->>'error', 'unknown')
      );
    END IF;
  END IF;

  IF COALESCE(p_commission_amount, 0) > 0 AND p_admin_id IS NOT NULL THEN
    SELECT public.update_wallet_balance_atomic(
      p_admin_id,
      p_commission_amount,
      p_currency,
      'credit',
      'available'
    ) INTO v_admin_wallet_result;

    IF NOT (v_admin_wallet_result->>'success')::boolean THEN
      UPDATE public.transactions SET status = 'failed' WHERE id = v_transaction_id;

      IF v_vendor_amount > 0 AND NOT (v_vendor_wallet_result->>'skipped')::boolean THEN
        PERFORM public.update_wallet_balance_atomic(p_vendor_id, v_vendor_amount, p_currency, 'debit', 'pending');
        UPDATE public.vendor_balance_holds
        SET status = 'cancelled', updated_at = now()
        WHERE transaction_id = v_transaction_id AND status = 'pending';
      END IF;

      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to credit admin wallet: ' || COALESCE(v_admin_wallet_result->>'error', 'unknown')
      );
    END IF;
  END IF;

  v_settlement := jsonb_build_object(
    'applied_at', now(),
    'vendor_amount', v_vendor_amount,
    'commission_amount', COALESCE(p_commission_amount, 0),
    'vendor_bucket', 'pending',
    'backfill', false
  );

  UPDATE public.transactions
  SET payout_meta = COALESCE(payout_meta, '{}'::jsonb) || jsonb_build_object('wallet_settlement', v_settlement),
      updated_at = now()
  WHERE id = v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'reference', v_transaction_result->>'reference',
    'vendor_amount', v_vendor_amount,
    'commission_amount', COALESCE(p_commission_amount, 0),
    'hold_id', v_vendor_wallet_result->>'hold_id',
    'pending_balance', v_vendor_wallet_result->>'pending_balance',
    'available_balance', v_vendor_wallet_result->>'available_balance'
  );

EXCEPTION
  WHEN OTHERS THEN
    IF v_transaction_id IS NOT NULL THEN
      UPDATE public.transactions SET status = 'failed' WHERE id = v_transaction_id;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_withdrawal_atomic(
  p_vendor_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'UGX',
  p_payment_method text DEFAULT 'bank_transfer',
  p_reference text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_wallet_result jsonb;
  v_transaction_result jsonb;
BEGIN
  SELECT public.update_wallet_balance_atomic(
    p_vendor_id,
    p_amount,
    p_currency,
    'debit',
    'available'
  ) INTO v_wallet_result;

  IF NOT (v_wallet_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to debit wallet: ' || (v_wallet_result->>'error'));
  END IF;

  SELECT public.create_transaction_atomic(
    NULL,
    p_vendor_id,
    NULL,
    p_amount,
    p_currency,
    'withdrawal',
    'completed',
    p_payment_method,
    p_reference
  ) INTO v_transaction_result;

  IF NOT (v_transaction_result->>'success')::boolean THEN
    PERFORM public.update_wallet_balance_atomic(p_vendor_id, p_amount, p_currency, 'credit', 'available');

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to create withdrawal transaction: ' || (v_transaction_result->>'error')
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_result->>'transaction_id',
    'reference', v_transaction_result->>'reference',
    'wallet_id', v_wallet_result->>'wallet_id',
    'new_balance', v_wallet_result->>'new_balance',
    'available_balance', v_wallet_result->>'available_balance'
  );

EXCEPTION
  WHEN OTHERS THEN
    PERFORM public.update_wallet_balance_atomic(p_vendor_id, p_amount, p_currency, 'credit', 'available');
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_withdrawal_create_with_payout_meta(
  p_vendor_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'UGX',
  p_payment_method text DEFAULT 'bank_transfer',
  p_reference text DEFAULT NULL,
  p_payout_meta jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_wallet_result jsonb;
  v_transaction_id uuid;
BEGIN
  SELECT public.update_wallet_balance_atomic(
    p_vendor_id,
    p_amount,
    p_currency,
    'debit',
    'available'
  ) INTO v_wallet_result;

  IF NOT (v_wallet_result->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to debit wallet: ' || (v_wallet_result->>'error'));
  END IF;

  IF p_reference IS NULL THEN
    p_reference := UPPER('withdrawal_' || encode(gen_random_bytes(4), 'hex') || '_' || EXTRACT(epoch FROM now())::text);
  END IF;

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
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'reference', p_reference,
    'wallet_id', v_wallet_result->>'wallet_id',
    'new_balance', v_wallet_result->>'new_balance',
    'available_balance', v_wallet_result->>'available_balance'
  );

EXCEPTION
  WHEN OTHERS THEN
    PERFORM public.update_wallet_balance_atomic(p_vendor_id, p_amount, p_currency, 'credit', 'available');
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.release_eligible_vendor_holds IS
  'Moves pending vendor earnings to available when release_after passed or booking/order completed.';
GRANT EXECUTE ON FUNCTION public.release_eligible_vendor_holds(integer) TO service_role;
