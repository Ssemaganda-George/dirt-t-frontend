-- Single source of truth: public.vendor_tiers only. Drops public.pricing_tiers.
-- Extends vendor_tiers with effective dates + audit; fixes create_booking_atomic JOIN.

ALTER TABLE public.vendor_tiers
  ADD COLUMN IF NOT EXISTS effective_from timestamp with time zone DEFAULT timezone('utc'::text, now());

ALTER TABLE public.vendor_tiers
  ADD COLUMN IF NOT EXISTS effective_until timestamp with time zone;

ALTER TABLE public.vendor_tiers
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

UPDATE public.vendor_tiers
SET effective_from = COALESCE(effective_from, created_at, now());

ALTER TABLE public.vendor_tiers
  ALTER COLUMN effective_from SET DEFAULT timezone('utc'::text, now());

ALTER TABLE public.vendor_tiers
  ALTER COLUMN effective_from SET NOT NULL;

-- Booking RPC: vendors.current_tier_id always references vendor_tiers
CREATE OR REPLACE FUNCTION create_booking_atomic(
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
  p_dropoff_location text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_existing_bookings integer;
  v_available_capacity integer;
  v_booking record;
  v_vendor_tier record;
  v_commission_rate numeric;
  v_commission_amount numeric;
  v_vendor_payout_amount numeric;
  v_now timestamptz := timezone('utc'::text, now());
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

  SELECT
    vt.commission_value,
    vt.commission_type,
    vt.id AS tier_id
  INTO v_vendor_tier
  FROM public.vendors v
  LEFT JOIN public.vendor_tiers vt ON v.current_tier_id = vt.id
    AND vt.is_active = true
    AND vt.effective_from <= v_now
    AND (vt.effective_until IS NULL OR vt.effective_until >= v_now)
  WHERE v.id = p_vendor_id;

  IF v_vendor_tier.commission_type = 'flat' THEN
    v_commission_amount := v_vendor_tier.commission_value;
  ELSIF v_vendor_tier.commission_type = 'percentage' THEN
    IF v_vendor_tier.commission_value > 1 THEN
      v_commission_amount := ROUND((p_total_amount * v_vendor_tier.commission_value / 100), 2);
    ELSE
      v_commission_amount := ROUND((p_total_amount * v_vendor_tier.commission_value), 2);
    END IF;
  ELSE
    v_commission_amount := ROUND((p_total_amount * 0.15), 2);
  END IF;

  IF v_vendor_tier.commission_type = 'percentage' THEN
    IF v_vendor_tier.commission_value > 1 THEN
      v_commission_rate := v_vendor_tier.commission_value / 100;
    ELSE
      v_commission_rate := v_vendor_tier.commission_value;
    END IF;
  ELSE
    v_commission_rate := CASE WHEN p_total_amount > 0 THEN v_commission_amount / p_total_amount ELSE 0 END;
  END IF;

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

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking.id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_booking_atomic(uuid, uuid, date, integer, numeric, uuid, date, text, text, text, text, text, text, text) IS 'Atomically creates a booking; commission from vendor_tiers.';

DROP TABLE IF EXISTS public.pricing_tiers CASCADE;
