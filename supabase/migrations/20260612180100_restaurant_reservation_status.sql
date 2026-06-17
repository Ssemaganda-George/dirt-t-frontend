-- Feature 5: Restaurants are reservations only — no marketplace settlement or wallet credit.
-- Requires 20260612180000_add_reserved_booking_status.sql applied first.

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text, 'not_required'::text]));

CREATE OR REPLACE FUNCTION public.booking_skips_marketplace_settlement(p_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.services s ON s.id = b.service_id
    WHERE b.id = p_booking_id
      AND (
        b.status = 'reserved'
        OR b.payment_status = 'not_required'
        OR s.category_id = 'cat_restaurants'
      )
  );
$$;

COMMENT ON FUNCTION public.booking_skips_marketplace_settlement(uuid) IS
  'True for restaurant table reservations that must not run MarzPay settlement or wallet credit.';

-- Count reserved tables toward capacity (same as confirmed).
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_service_id uuid,
  p_vendor_id uuid,
  p_booking_date date,
  p_guests integer,
  p_total_amount numeric,
  p_tourist_id uuid DEFAULT NULL,
  p_service_date date DEFAULT NULL,
  p_currency text DEFAULT 'UGX',
  p_special_requests text DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_dropoff_location text DEFAULT NULL,
  p_pricing_base_amount numeric DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_existing_bookings integer;
  v_available_capacity integer;
  v_booking uuid;
  v_vendor_tier record;
  v_commission_rate numeric;
  v_commission_amount numeric;
  v_vendor_payout_amount numeric;
  v_now timestamptz := timezone('utc'::text, now());
  v_base_amount numeric;
  v_unit_price numeric;
BEGIN
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  IF v_service.status NOT IN ('approved', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service is not available for booking');
  END IF;

  IF v_service.max_capacity IS NOT NULL THEN
    SELECT COALESCE(SUM(guests), 0) INTO v_existing_bookings
    FROM public.bookings
    WHERE service_id = p_service_id
      AND service_date = p_service_date
      AND status IN ('confirmed', 'pending', 'reserved');

    v_available_capacity := v_service.max_capacity - v_existing_bookings;

    IF v_available_capacity < p_guests THEN
      RETURN jsonb_build_object('success', false, 'error', format('Insufficient capacity. Available: %s, Requested: %s', v_available_capacity, p_guests));
    END IF;
  END IF;

  v_unit_price := COALESCE(v_service.price, 0);

  IF p_pricing_base_amount IS NOT NULL THEN
    v_base_amount := ROUND(p_pricing_base_amount, 2);
  ELSE
    v_base_amount := ROUND(v_unit_price * p_guests, 2);
  END IF;

  SELECT
    vt.commission_value,
    vt.commission_type,
    vt.id AS tier_id,
    COALESCE(vt.fee_payer, 'vendor') AS fee_payer,
    vt.tourist_percentage,
    vt.vendor_percentage
  INTO v_vendor_tier
  FROM public.vendors v
  LEFT JOIN public.vendor_tiers vt ON vt.id = (
    CASE
      WHEN v.manual_tier_id IS NOT NULL
       AND (v.manual_tier_expires_at IS NULL OR v.manual_tier_expires_at > v_now)
      THEN v.manual_tier_id
      ELSE v.current_tier_id
    END
  )
  AND vt.is_active = true
  AND vt.effective_from <= v_now
  AND (vt.effective_until IS NULL OR vt.effective_until >= v_now)
  WHERE v.id = p_vendor_id;

  IF v_vendor_tier.tier_id IS NULL OR v_vendor_tier.commission_type IS NULL THEN
    v_commission_amount := 0;
    v_commission_rate := 0;
  ELSIF v_vendor_tier.commission_type = 'flat' THEN
    IF p_pricing_base_amount IS NOT NULL AND v_unit_price > 0 THEN
      v_commission_amount := ROUND((COALESCE(v_vendor_tier.commission_value, 0) * v_base_amount / v_unit_price)::numeric, 2);
    ELSE
      v_commission_amount := ROUND((COALESCE(v_vendor_tier.commission_value, 0) * p_guests)::numeric, 2);
    END IF;
  ELSIF v_vendor_tier.commission_type = 'percentage' THEN
    IF v_vendor_tier.commission_value > 1 THEN
      v_commission_amount := ROUND((v_base_amount * v_vendor_tier.commission_value / 100), 2);
    ELSE
      v_commission_amount := ROUND((v_base_amount * v_vendor_tier.commission_value), 2);
    END IF;
  ELSE
    v_commission_amount := 0;
    v_commission_rate := 0;
  END IF;

  IF p_total_amount > 0 THEN
    v_commission_rate := ROUND(COALESCE(v_commission_amount, 0) / p_total_amount, 2);
  ELSE
    v_commission_rate := 0;
  END IF;

  v_commission_amount := ROUND(p_total_amount * v_commission_rate, 2);
  v_vendor_payout_amount := p_total_amount - v_commission_amount;

  INSERT INTO public.bookings (
    service_id,
    tourist_id,
    vendor_id,
    booking_date,
    service_date,
    guests,
    total_amount,
    currency,
    status,
    payment_status,
    special_requests,
    guest_name,
    guest_email,
    guest_phone,
    pickup_location,
    dropoff_location,
    is_guest_booking,
    commission_rate_at_booking,
    commission_amount,
    vendor_payout_amount,
    created_at,
    updated_at
  ) VALUES (
    p_service_id,
    p_tourist_id,
    p_vendor_id,
    p_booking_date,
    p_service_date,
    p_guests,
    p_total_amount,
    p_currency,
    'pending',
    'pending',
    p_special_requests,
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_pickup_location,
    p_dropoff_location,
    CASE WHEN p_tourist_id IS NULL THEN true ELSE false END,
    v_commission_rate,
    v_commission_amount,
    v_vendor_payout_amount,
    now(),
    now()
  )
  RETURNING id INTO v_booking;

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  IF public.booking_skips_marketplace_settlement(p_booking_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Restaurant reservations do not use wallet settlement'
    );
  END IF;

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
    IF public.booking_skips_marketplace_settlement(p_booking_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Restaurant reservations do not use marketplace settlement'
      );
    END IF;

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

UPDATE public.bookings b
SET
  status = 'reserved',
  payment_status = 'not_required',
  total_amount = 0,
  platform_fee = 0,
  commission_amount = 0,
  vendor_payout_amount = 0,
  updated_at = now()
FROM public.services s
WHERE s.id = b.service_id
  AND s.category_id = 'cat_restaurants'
  AND b.payment_status IN ('pending', 'paid')
  AND COALESCE(b.total_amount, 0) = 0
  AND b.status IN ('pending', 'confirmed');

COMMENT ON FUNCTION public.process_payment_with_commission IS
  'Settles paid bookings/orders; skips restaurant reservations (status reserved / payment not_required).';
