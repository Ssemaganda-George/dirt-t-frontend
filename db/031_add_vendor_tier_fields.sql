-- Migration 031: Add tier-related fields to vendors table
-- This adds commission tracking and tier management fields to the vendors table

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS current_tier_id uuid REFERENCES public.vendor_tiers(id),
  ADD COLUMN IF NOT EXISTS current_commission_rate decimal(3,2) DEFAULT 0.15 CHECK (current_commission_rate >= 0 AND current_commission_rate <= 1),
  ADD COLUMN IF NOT EXISTS average_rating decimal(2,1) CHECK (average_rating >= 0 AND average_rating <= 5),
  ADD COLUMN IF NOT EXISTS monthly_booking_count integer DEFAULT 0 CHECK (monthly_booking_count >= 0),
  ADD COLUMN IF NOT EXISTS lifetime_booking_count integer DEFAULT 0 CHECK (lifetime_booking_count >= 0),
  ADD COLUMN IF NOT EXISTS last_tier_evaluated_at timestamp with time zone;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendors_current_tier_id ON public.vendors(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_vendors_average_rating ON public.vendors(average_rating);
CREATE INDEX IF NOT EXISTS idx_vendors_monthly_booking_count ON public.vendors(monthly_booking_count);

-- Set default tier (Bronze) for existing vendors
UPDATE public.vendors
SET
  current_tier_id = (SELECT id FROM public.vendor_tiers WHERE name = 'Bronze' LIMIT 1),
  current_commission_rate = 0.15
WHERE current_tier_id IS NULL;

-- Calculate initial average ratings from reviews (if reviews table exists)
-- This is a placeholder - actual calculation would depend on the reviews table structure
-- For now, we'll set a default rating of 4.0 for vendors with approved status
UPDATE public.vendors
SET average_rating = 4.0
WHERE status = 'approved' AND average_rating IS NULL;