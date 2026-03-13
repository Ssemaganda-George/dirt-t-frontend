-- Migration: Add transport-specific fields (vehicle_features and ensure transport columns exist)
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'vehicle_features'
  ) THEN
    ALTER TABLE public.services ADD COLUMN vehicle_features text[] NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'vehicle_ccs'
  ) THEN
    ALTER TABLE public.services ADD COLUMN vehicle_ccs integer NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'fuel_type'
  ) THEN
    ALTER TABLE public.services ADD COLUMN fuel_type text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'fuel_km_per_liter'
  ) THEN
    ALTER TABLE public.services ADD COLUMN fuel_km_per_liter numeric(6,2) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'vehicle_engine'
  ) THEN
    ALTER TABLE public.services ADD COLUMN vehicle_engine text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'booking_notice_hours'
  ) THEN
    ALTER TABLE public.services ADD COLUMN booking_notice_hours integer NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'license_required'
  ) THEN
    ALTER TABLE public.services ADD COLUMN license_required text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE public.services ADD COLUMN vehicle_type text NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'vehicle_capacity'
  ) THEN
    ALTER TABLE public.services ADD COLUMN vehicle_capacity integer NULL;
  END IF;
END$$;

-- Index for querying features
CREATE INDEX IF NOT EXISTS idx_services_vehicle_features_gin ON public.services USING gin (vehicle_features);

COMMIT;
