-- Migration 036: Add pricing columns to bookings table
-- Purpose: create columns that the updated create_booking_atomic function expects
-- Adds pricing_source, pricing_reference_id, base_price, platform_fee and fee_payer to bookings

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pricing_source text CHECK (pricing_source IN ('tier', 'override')),
  ADD COLUMN IF NOT EXISTS pricing_reference_id uuid,
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_payer text CHECK (fee_payer IN ('vendor', 'tourist', 'shared'));

-- Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_bookings_pricing_source ON public.bookings(pricing_source);
CREATE INDEX IF NOT EXISTS idx_bookings_pricing_reference ON public.bookings(pricing_reference_id);

-- Backfill: where commission fields exist, set base_price/platform_fee from existing columns where sensible
-- (This is a best-effort backfill and won't overwrite existing non-null base_price)
UPDATE public.bookings
SET base_price = COALESCE(base_price, total_amount - COALESCE(commission_amount, 0)),
    platform_fee = COALESCE(platform_fee, COALESCE(commission_amount, 0))
WHERE base_price IS NULL OR platform_fee IS NULL;

-- Note: Run this migration in target DB (Supabase) before invoking booking creation that relies on these columns.
