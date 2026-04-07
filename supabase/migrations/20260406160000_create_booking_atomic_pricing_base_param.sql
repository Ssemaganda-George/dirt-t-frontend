-- Optional pre-fee line total for commission (% / flat scaling). When NULL, keep behavior: service.price * guests.
-- Needed for hotels (rooms × nights), transport (computed trip total), and explicit activity bases.

DROP FUNCTION IF EXISTS public.create_booking_atomic(
  uuid,
  uuid,
  date,
  integer,
  numeric,
  uuid,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text
);

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
      AND status IN ('confirmed', 'pending');

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

COMMENT ON FUNCTION public.create_booking_atomic(uuid, uuid, date, integer, numeric, uuid, date, text, text, text, text, text, text, text, numeric) IS
  'Creates booking; commission from vendor_tiers on pricing base (p_pricing_base_amount or price×guests); p_total_amount = customer pay total.';
