-- 017_add_booking_id_to_trees.sql
-- Add an optional booking_id column to public.trees so trees can be attached to bookings/services.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='trees' AND column_name='booking_id'
  ) THEN
    ALTER TABLE public.trees
      ADD COLUMN booking_id uuid NULL;
  END IF;
END$$;

-- add an index to speed up lookups by booking_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename='trees' AND indexname='idx_trees_booking_id'
  ) THEN
    CREATE INDEX idx_trees_booking_id ON public.trees (booking_id);
  END IF;
END$$;

-- Optional: add a foreign key if your bookings table exists and you want referential integrity.
-- Uncomment and adjust the reference below if you have a 'bookings' table with primary key 'id'.
-- ALTER TABLE public.trees
--   ADD CONSTRAINT fk_trees_bookings FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
