-- Add shop_type column to services for product category filtering
-- Values: clothing | footwear | sun_bug | souvenir | gadgets | camping_gear | handmade_crafts | sustainable | other

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS shop_type text NULL
    CONSTRAINT services_shop_type_check CHECK (
      shop_type IS NULL OR shop_type = ANY (ARRAY[
        'clothing'::text,
        'footwear'::text,
        'sun_bug'::text,
        'souvenir'::text,
        'gadgets'::text,
        'camping_gear'::text,
        'handmade_crafts'::text,
        'sustainable'::text,
        'other'::text
      ])
    );

CREATE INDEX IF NOT EXISTS idx_services_shop_type
  ON public.services USING btree (shop_type)
  TABLESPACE pg_default;
