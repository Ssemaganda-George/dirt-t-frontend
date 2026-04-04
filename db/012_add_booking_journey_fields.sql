BEGIN;

-- Add structured journey fields to bookings to persist user-set trip details and coordinates
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

-- Indexes to help querying
CREATE INDEX IF NOT EXISTS idx_bookings_trip_destination ON public.bookings USING btree (trip_destination);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_setoff ON public.bookings USING btree (trip_setoff);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_stopovers_gin ON public.bookings USING gin (trip_stopovers);

COMMIT;
