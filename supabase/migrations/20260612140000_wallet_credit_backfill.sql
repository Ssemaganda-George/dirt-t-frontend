-- Feature 2: Credit vendor + platform wallets for historical ledger-only payment rows.
-- Idempotency marker: transactions.payout_meta->'wallet_settlement'

CREATE OR REPLACE FUNCTION public.get_default_admin_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT id
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.compute_booking_commission_amount(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_booking record;
  v_is_transport boolean := false;
  v_total numeric;
  v_commission numeric;
  v_subtotal numeric;
  v_vendor_net numeric;
BEGIN
  SELECT
    b.total_amount,
    b.commission_amount,
    b.platform_fee,
    b.commission_rate_at_booking,
    b.vendor_payout_amount,
    s.category_id
  INTO v_booking
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id = b.service_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  v_total := COALESCE(v_booking.total_amount, 0);
  v_is_transport := v_booking.category_id = 'cat_transport';

  IF v_is_transport THEN
    v_subtotal := v_total / 1.02;
    v_vendor_net := v_subtotal * 0.98;
    v_commission := GREATEST(0, v_total - v_vendor_net);
  ELSE
    v_commission := COALESCE(v_booking.commission_amount, v_booking.platform_fee, 0);

    IF v_commission = 0 AND v_booking.commission_rate_at_booking IS NOT NULL THEN
      v_commission := ROUND(v_total * v_booking.commission_rate_at_booking, 2);
    END IF;

    IF v_booking.vendor_payout_amount IS NOT NULL AND v_total > 0 THEN
      v_commission := GREATEST(0, v_total - v_booking.vendor_payout_amount);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'commission', GREATEST(0, v_commission)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_order_commission_amount(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order record;
  v_total numeric;
  v_commission numeric;
BEGIN
  SELECT total_amount, platform_fee, vendor_payout
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  v_total := COALESCE(v_order.total_amount, 0);
  v_commission := COALESCE(v_order.platform_fee, 0);

  IF v_commission = 0 AND v_order.vendor_payout IS NOT NULL THEN
    v_commission := GREATEST(0, v_total - v_order.vendor_payout);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'commission', GREATEST(0, v_commission)
  );
END;
$$;

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
  v_settlement jsonb;
BEGIN
  SELECT *
  INTO v_tx
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
    SELECT public.update_wallet_balance_atomic(
      v_tx.vendor_id,
      v_vendor_amount,
      COALESCE(v_tx.currency, 'UGX'),
      'credit'
    ) INTO v_vendor_wallet_result;

    IF NOT (v_vendor_wallet_result->>'success')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to credit vendor wallet: ' || COALESCE(v_vendor_wallet_result->>'error', 'unknown')
      );
    END IF;
  END IF;

  IF v_commission > 0 AND v_admin_id IS NOT NULL THEN
    SELECT public.update_wallet_balance_atomic(
      v_admin_id,
      v_commission,
      COALESCE(v_tx.currency, 'UGX'),
      'credit'
    ) INTO v_admin_wallet_result;

    IF NOT (v_admin_wallet_result->>'success')::boolean THEN
      IF v_vendor_amount > 0 THEN
        UPDATE public.wallets
        SET balance = balance - v_vendor_amount,
            updated_at = now()
        WHERE vendor_id = v_tx.vendor_id;
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
    'vendor_wallet_id', v_vendor_wallet_result->>'wallet_id',
    'admin_wallet_id', v_admin_wallet_result->>'wallet_id'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_wallet_credits_for_booking(
  p_booking_id uuid,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_booking record;
  v_tx record;
  v_commission_info jsonb;
  v_admin_id uuid;
BEGIN
  SELECT id, payment_status, status, payment_reference
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.payment_status <> 'paid' OR v_booking.status NOT IN ('confirmed', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is not paid or not confirmed');
  END IF;

  IF v_booking.payment_reference IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.payments WHERE reference = v_booking.payment_reference)
     AND NOT EXISTS (
       SELECT 1 FROM public.payments
       WHERE reference = v_booking.payment_reference AND status = 'completed'
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'MarzPay payment is not completed');
  END IF;

  SELECT *
  INTO v_tx
  FROM public.transactions
  WHERE booking_id = p_booking_id
    AND transaction_type = 'payment'
    AND status = 'completed'
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No completed payment transaction for booking',
      'needs_full_settlement', true
    );
  END IF;

  v_commission_info := public.compute_booking_commission_amount(p_booking_id);
  IF NOT (v_commission_info->>'success')::boolean THEN
    RETURN v_commission_info;
  END IF;

  v_admin_id := COALESCE(p_admin_id, public.get_default_admin_profile_id());

  RETURN public.apply_wallet_credits_for_transaction(
    v_tx.id,
    (v_commission_info->>'commission')::numeric,
    v_admin_id,
    (v_commission_info->>'total')::numeric
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_wallet_credits_for_order(
  p_order_id uuid,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order record;
  v_tx record;
  v_commission_info jsonb;
  v_admin_id uuid;
BEGIN
  SELECT id, status, reference
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status <> 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is not paid');
  END IF;

  IF v_order.reference IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.payments WHERE reference = v_order.reference)
     AND NOT EXISTS (
       SELECT 1 FROM public.payments
       WHERE reference = v_order.reference AND status = 'completed'
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'MarzPay payment is not completed');
  END IF;

  SELECT *
  INTO v_tx
  FROM public.transactions
  WHERE reference = v_order.reference
    AND transaction_type = 'payment'
    AND status = 'completed'
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No completed payment transaction for order',
      'needs_full_settlement', true
    );
  END IF;

  v_commission_info := public.compute_order_commission_amount(p_order_id);
  IF NOT (v_commission_info->>'success')::boolean THEN
    RETURN v_commission_info;
  END IF;

  v_admin_id := COALESCE(p_admin_id, public.get_default_admin_profile_id());

  RETURN public.apply_wallet_credits_for_transaction(
    v_tx.id,
    (v_commission_info->>'commission')::numeric,
    v_admin_id,
    (v_commission_info->>'total')::numeric
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_wallet_credits_batch(
  p_limit integer DEFAULT 100,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_admin_id uuid;
  v_booking_id uuid;
  v_order_id uuid;
  v_result jsonb;
  v_bookings_applied integer := 0;
  v_bookings_skipped integer := 0;
  v_bookings_failed integer := 0;
  v_orders_applied integer := 0;
  v_orders_skipped integer := 0;
  v_orders_failed integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  v_admin_id := COALESCE(p_admin_id, public.get_default_admin_profile_id());

  FOR v_booking_id IN
    SELECT DISTINCT b.id
    FROM public.bookings b
    JOIN public.transactions t
      ON t.booking_id = b.id
     AND t.transaction_type = 'payment'
     AND t.status = 'completed'
    WHERE b.payment_status = 'paid'
      AND b.status IN ('confirmed', 'completed')
      AND (t.payout_meta IS NULL OR NOT (t.payout_meta ? 'wallet_settlement'))
      AND (
        b.payment_reference IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.reference = b.payment_reference)
        OR EXISTS (
          SELECT 1 FROM public.payments p
          WHERE p.reference = b.payment_reference AND p.status = 'completed'
        )
      )
    ORDER BY b.id
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500))
  LOOP
    v_result := public.backfill_wallet_credits_for_booking(v_booking_id, v_admin_id);

    IF (v_result->>'success')::boolean THEN
      IF (v_result->>'skipped')::boolean THEN
        v_bookings_skipped := v_bookings_skipped + 1;
      ELSE
        v_bookings_applied := v_bookings_applied + 1;
      END IF;
    ELSE
      v_bookings_failed := v_bookings_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('booking_id', v_booking_id, 'error', v_result->>'error'));
    END IF;
  END LOOP;

  FOR v_order_id IN
    SELECT DISTINCT o.id
    FROM public.orders o
    JOIN public.transactions t
      ON t.reference = o.reference
     AND t.transaction_type = 'payment'
     AND t.status = 'completed'
    WHERE o.status = 'paid'
      AND o.reference IS NOT NULL
      AND (t.payout_meta IS NULL OR NOT (t.payout_meta ? 'wallet_settlement'))
      AND (
        NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.reference = o.reference)
        OR EXISTS (
          SELECT 1 FROM public.payments p
          WHERE p.reference = o.reference AND p.status = 'completed'
        )
      )
    ORDER BY o.id
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500))
  LOOP
    v_result := public.backfill_wallet_credits_for_order(v_order_id, v_admin_id);

    IF (v_result->>'success')::boolean THEN
      IF (v_result->>'skipped')::boolean THEN
        v_orders_skipped := v_orders_skipped + 1;
      ELSE
        v_orders_applied := v_orders_applied + 1;
      END IF;
    ELSE
      v_orders_failed := v_orders_failed + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('order_id', v_order_id, 'error', v_result->>'error'));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'bookings_applied', v_bookings_applied,
    'bookings_skipped', v_bookings_skipped,
    'bookings_failed', v_bookings_failed,
    'orders_applied', v_orders_applied,
    'orders_skipped', v_orders_skipped,
    'orders_failed', v_orders_failed,
    'errors', v_errors
  );
END;
$$;

-- When a payment tx already exists (ledger-only), credit wallets instead of skipping.
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

  v_settlement := jsonb_build_object(
    'applied_at', now(),
    'vendor_amount', v_vendor_amount,
    'commission_amount', COALESCE(p_commission_amount, 0),
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

COMMENT ON FUNCTION public.apply_wallet_credits_for_transaction IS
  'Credits vendor net + platform commission for an existing completed payment transaction. Idempotent via payout_meta.wallet_settlement.';
COMMENT ON FUNCTION public.backfill_wallet_credits_for_booking IS
  'Backfills wallet credits for a paid confirmed booking that already has a ledger payment row.';
COMMENT ON FUNCTION public.backfill_wallet_credits_batch IS
  'Batch backfill for historical ledger-only payments (bookings and orders).';

GRANT EXECUTE ON FUNCTION public.backfill_wallet_credits_for_booking(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.backfill_wallet_credits_for_order(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.backfill_wallet_credits_batch(integer, uuid) TO authenticated, service_role;
