-- Migration: Update create_booking_atomic to accept structured journey fields
-- This migration replaces the existing create_booking_atomic function with a version
-- that accepts trip/journey fields and stores them in the bookings table.

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
  p_dropoff_location text DEFAULT NULL,
  p_trip_setoff text DEFAULT NULL,
  p_trip_setoff_lat double precision DEFAULT NULL,
  p_trip_setoff_lng double precision DEFAULT NULL,
  p_trip_destination text DEFAULT NULL,
  p_trip_destination_lat double precision DEFAULT NULL,
  p_trip_destination_lng double precision DEFAULT NULL,
  p_trip_stopovers jsonb DEFAULT NULL,
  p_trip_return_option text DEFAULT NULL,
  p_journey_estimated_hours numeric DEFAULT NULL,
  p_journey_estimated_distance numeric DEFAULT NULL,
  p_journey_estimated_fuel numeric DEFAULT NULL,
  p_journey_summary text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_existing_bookings integer;
  v_available_capacity integer;
  v_booking record;
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

  -- Create the booking with journey fields
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
    trip_setoff,
    trip_setoff_lat,
    trip_setoff_lng,
    trip_destination,
    trip_destination_lat,
    trip_destination_lng,
    trip_stopovers,
    trip_return_option,
    journey_estimated_hours,
    journey_estimated_distance,
    journey_estimated_fuel,
    journey_summary,
    is_guest_booking,
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
    p_trip_setoff,
    p_trip_setoff_lat,
    p_trip_setoff_lng,
    p_trip_destination,
    p_trip_destination_lat,
    p_trip_destination_lng,
    p_trip_stopovers,
    p_trip_return_option,
    p_journey_estimated_hours,
    p_journey_estimated_distance,
    p_journey_estimated_fuel,
    p_journey_summary,
    CASE WHEN p_tourist_id IS NULL THEN true ELSE false END,
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

COMMENT ON FUNCTION create_booking_atomic(uuid, uuid, date, integer, numeric, uuid, date, text, text, text, text, text, text, text, text, double precision, double precision, text, double precision, double precision, double precision, jsonb, text, numeric, numeric, numeric, text) IS 'Atomically creates a booking with capacity validation and persists journey fields';
