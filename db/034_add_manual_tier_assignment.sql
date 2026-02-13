-- Migration 034: Add manual tier assignment fields to vendors table
-- This allows admins to manually assign tiers to vendors with expiration dates

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS manual_tier_id uuid REFERENCES public.vendor_tiers(id),
  ADD COLUMN IF NOT EXISTS manual_tier_assigned_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS manual_tier_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS manual_tier_reason text;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_vendors_manual_tier_id ON public.vendors(manual_tier_id);
CREATE INDEX IF NOT EXISTS idx_vendors_manual_tier_expires_at ON public.vendors(manual_tier_expires_at);

-- Add check constraint to ensure expiration date is after assignment date
ALTER TABLE public.vendors
  ADD CONSTRAINT check_manual_tier_dates
  CHECK (manual_tier_expires_at IS NULL OR manual_tier_assigned_at IS NULL OR manual_tier_expires_at > manual_tier_assigned_at);

-- Add comment
COMMENT ON COLUMN public.vendors.manual_tier_id IS 'Manually assigned tier that overrides automatic evaluation';
COMMENT ON COLUMN public.vendors.manual_tier_assigned_at IS 'When the manual tier was assigned';
COMMENT ON COLUMN public.vendors.manual_tier_expires_at IS 'When the manual tier assignment expires (NULL = permanent)';
COMMENT ON COLUMN public.vendors.manual_tier_reason IS 'Reason for manual tier assignment';
