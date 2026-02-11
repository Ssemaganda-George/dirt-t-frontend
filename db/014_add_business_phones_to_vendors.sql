-- Migration 014: Add business_phones column to vendors table
-- This column stores additional business phone numbers as JSON array

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS business_phones jsonb;

-- Add comment to explain the business phones storage
COMMENT ON COLUMN public.vendors.business_phones IS 'Additional business phone numbers stored as JSON array with phone and country_code fields';