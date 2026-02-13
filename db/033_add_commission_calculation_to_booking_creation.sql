-- Migration: 033_add_commission_calculation_to_booking_creation.sql
-- Description: Update create_booking_atomic function to calculate and store commission amounts
-- Date: 2024

-- Update the create_booking_atomic function to include commission calculations
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
  v_result jsonb;
BEGIN
  -- Lock the service row for update to prevent concurrent bookings
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  -- Check if service exists and is available
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  IF v_service.status NOT IN ('approved', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service is not available for booking');
  END IF;

  -- Check capacity if max_capacity is set
  IF v_service.max_capacity IS NOT NULL THEN
    -- Count existing confirmed bookings for this service and date
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

  -- Get vendor's current tier and commission rate
  SELECT
    vt.commission_rate,
    vt.id as tier_id
  INTO v_vendor_tier
  FROM public.vendors v
  JOIN public.vendor_tiers vt ON v.current_tier_id = vt.id
  WHERE v.id = p_vendor_id;

  -- If no tier found, use default commission rate of 0
  IF NOT FOUND THEN
    v_commission_rate := 0;
  ELSE
    v_commission_rate := COALESCE(v_vendor_tier.commission_rate, 0);
  END IF;

  -- Calculate commission and vendor payout
  -- commission_rate is stored as a fraction (e.g. 0.15 for 15%), so do NOT divide by 100 here
  v_commission_amount := ROUND((p_total_amount * v_commission_rate), 2);
  v_vendor_payout_amount := p_total_amount - v_commission_amount;

  -- Create the booking with commission fields
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

-- Update the comment for the updated function
COMMENT ON FUNCTION create_booking_atomic(uuid, uuid, date, integer, numeric, uuid, date, text, text, text, text, text, text, text) IS 'Atomically creates a booking with capacity validation, commission calculation, and prevents overbooking';