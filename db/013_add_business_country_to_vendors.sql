-- Migration 013: Add business_country column to vendors table
-- This ensures that when users select a business city, the corresponding country is automatically stored

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS business_country text;

-- Add comment to explain the automatic country determination
COMMENT ON COLUMN public.vendors.business_country IS 'Country automatically determined from business city selection';