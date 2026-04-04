BEGIN;

-- Add vehicle/engine/fuel fields to services for transport listings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'vehicle_engine'
  ) THEN
    ALTER TABLE public.services ADD COLUMN vehicle_engine text NULL;
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
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'fuel_consumption_per_100km'
  ) THEN
    ALTER TABLE public.services ADD COLUMN fuel_consumption_per_100km numeric(6,2) NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_services_vehicle_engine ON public.services USING btree (vehicle_engine);
CREATE INDEX IF NOT EXISTS idx_services_fuel_type ON public.services USING btree (fuel_type);

COMMIT;
