-- Migration: 039_vendor_tiers_flat_commission.sql
-- Description: Add commission_type and commission_value to vendor_tiers to support flat commissions.
-- Keeps commission_rate for backward compatibility (percentage tiers); flat tiers use commission_value.

-- Add new columns
ALTER TABLE public.vendor_tiers
  ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat')),
  ADD COLUMN IF NOT EXISTS commission_value numeric DEFAULT 0 CHECK (commission_value >= 0);

-- Migrate existing data: set commission_value from commission_rate (stored as 0-1, e.g. 0.15 -> 15)
UPDATE public.vendor_tiers
SET commission_value = commission_rate * 100
WHERE commission_type = 'percentage' AND (commission_value IS NULL OR commission_value = 0);
