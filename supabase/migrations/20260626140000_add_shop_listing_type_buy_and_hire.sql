-- Add explicit buy_and_hire for dual-mode shop listings; keep experience for legacy non-shop rows.

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_listing_type_check;

ALTER TABLE public.services ADD CONSTRAINT services_listing_type_check
  CHECK (listing_type = ANY (ARRAY[
    'experience'::text,
    'buy'::text,
    'hire'::text,
    'buy_and_hire'::text
  ]));

COMMENT ON COLUMN public.services.listing_type IS
  'Shops: buy=purchase only, hire=rental only, buy_and_hire=both. experience=legacy default on older non-shop rows.';

UPDATE public.services
SET listing_type = 'buy_and_hire'
WHERE category_id = 'cat_shops'
  AND buy_price IS NOT NULL
  AND rental_price_per_day IS NOT NULL;

UPDATE public.services
SET listing_type = 'buy'
WHERE category_id = 'cat_shops'
  AND listing_type = 'experience';
