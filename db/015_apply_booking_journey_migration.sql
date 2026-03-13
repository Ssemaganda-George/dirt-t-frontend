BEGIN;

-- 1) Drop any existing overloaded create_booking_atomic functions to avoid signature conflicts
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'create_booking_atomic'
  LOOP
    RAISE NOTICE 'Dropping existing function: %', r.sig;
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END$$;

-- 2) Add structured journey fields to bookings (idempotent checks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trip_setoff'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN trip_setoff text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trip_setoff_lat'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN trip_setoff_lat double precision NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trip_setoff_lng'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN trip_setoff_lng double precision NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trip_destination'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN trip_destination text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trip_destination_lat'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN trip_destination_lat double precision NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trip_destination_lng'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN trip_destination_lng double precision NULL;
  END IF;

  -- JSON array of stopovers: [{label, lat, lng, durationHours}, ...]
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trip_stopovers'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN trip_stopovers jsonb NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trip_return_option'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN trip_return_option text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'journey_estimated_hours'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN journey_estimated_hours numeric(10,2) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'journey_estimated_distance'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN journey_estimated_distance numeric(10,2) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'journey_estimated_fuel'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN journey_estimated_fuel numeric(10,2) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'journey_summary'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN journey_summary text NULL;
  END IF;
END$$;

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_bookings_trip_destination ON public.bookings USING btree (trip_destination);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_setoff ON public.bookings USING btree (trip_setoff);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_stopovers_gin ON public.bookings USING gin (trip_stopovers);

-- 3) Create updated create_booking_atomic function with journey params
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

COMMIT;
