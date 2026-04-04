-- Fee payer on tiers (vendor / tourist / shared), mirroring service_pricing_overrides.

ALTER TABLE public.vendor_tiers
  ADD COLUMN IF NOT EXISTS fee_payer text NOT NULL DEFAULT 'vendor',
  ADD COLUMN IF NOT EXISTS tourist_percentage numeric,
  ADD COLUMN IF NOT EXISTS vendor_percentage numeric;

UPDATE public.vendor_tiers
SET fee_payer = 'vendor'
WHERE fee_payer IS NULL;

ALTER TABLE public.vendor_tiers
  DROP CONSTRAINT IF EXISTS vendor_tiers_fee_payer_check;

ALTER TABLE public.vendor_tiers
  ADD CONSTRAINT vendor_tiers_fee_payer_check
  CHECK (fee_payer IN ('vendor', 'tourist', 'shared'));

ALTER TABLE public.vendor_tiers
  DROP CONSTRAINT IF EXISTS vendor_tiers_shared_split_check;

ALTER TABLE public.vendor_tiers
  ADD CONSTRAINT vendor_tiers_shared_split_check
  CHECK (
    fee_payer <> 'shared'
    OR (
      tourist_percentage IS NOT NULL
      AND vendor_percentage IS NOT NULL
      AND tourist_percentage + vendor_percentage = 100
    )
  );

COMMENT ON COLUMN public.vendor_tiers.fee_payer IS 'Who pays the platform commission: vendor (deducted from payout), tourist (added to checkout), or shared split.';

-- Booking RPC: commission from listing base (price * guests); respect tier fee_payer for split math
-- via client-supplied p_total_amount; optional manual tier; remove legacy 15% default.
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
  p_dropoff_location text DEFAULT NULL
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

  v_base_amount := ROUND(COALESCE(v_service.price, 0) * p_guests, 2);

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
    v_commission_amount := ROUND((COALESCE(v_vendor_tier.commission_value, 0) * p_guests)::numeric, 2);
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

  IF v_base_amount > 0 THEN
    v_commission_rate := COALESCE(v_commission_amount, 0) / v_base_amount;
  ELSE
    v_commission_rate := 0;
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

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_booking_atomic(uuid, uuid, date, integer, numeric, uuid, date, text, text, text, text, text, text, text) IS
  'Creates booking; platform fee from vendor_tiers on service price * guests; manual tier when active; p_total_amount = customer pay total.';
