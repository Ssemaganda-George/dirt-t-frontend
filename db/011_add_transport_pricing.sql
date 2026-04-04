BEGIN;

-- Add transport-specific pricing columns if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'price_within_town'
  ) THEN
    ALTER TABLE public.services ADD COLUMN price_within_town numeric(10,2) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'price_upcountry'
  ) THEN
    ALTER TABLE public.services ADD COLUMN price_upcountry numeric(10,2) NULL;
  END IF;
END$$;

-- For existing transport services, default the new fields to the current `price` where not already set.
UPDATE public.services
SET
  price_within_town = COALESCE(price_within_town, price),
  price_upcountry = COALESCE(price_upcountry, price)
WHERE category_id = 'cat_transport' AND price IS NOT NULL;

-- Create indexes to support queries/filtering by the new columns
CREATE INDEX IF NOT EXISTS idx_services_price_within_town ON public.services USING btree (price_within_town);
CREATE INDEX IF NOT EXISTS idx_services_price_upcountry ON public.services USING btree (price_upcountry);

COMMIT;
