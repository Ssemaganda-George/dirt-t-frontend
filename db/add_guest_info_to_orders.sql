-- Migration to add guest information fields to orders table
-- This ensures we can create bookings for guest ticket purchases

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS guest_name text,
ADD COLUMN IF NOT EXISTS guest_email text,
ADD COLUMN IF NOT EXISTS guest_phone text;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.guest_name IS 'Guest buyer name for orders without user_id';
COMMENT ON COLUMN public.orders.guest_email IS 'Guest buyer email for orders without user_id';
COMMENT ON COLUMN public.orders.guest_phone IS 'Guest buyer phone for orders without user_id';