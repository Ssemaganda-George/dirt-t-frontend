-- Migration: Allow 'shared' in fee_payer check constraint
-- Add a safe ALTER that drops the old constraint if present and replaces it with one that allows 'vendor', 'tourist', and 'shared'.
-- Run this in your Supabase SQL editor (or psql) against the target database.

BEGIN;

-- Optional: inspect rows that would violate the new constraint (if any)
-- SELECT id, fee_payer FROM public.service_pricing_overrides WHERE fee_payer NOT IN ('vendor', 'tourist', 'shared');

-- Drop existing fee_payer check (if present)
ALTER TABLE public.service_pricing_overrides
  DROP CONSTRAINT IF EXISTS service_pricing_overrides_fee_payer_check;

-- Add a permissive fee_payer check allowing 'shared'
ALTER TABLE public.service_pricing_overrides
  ADD CONSTRAINT service_pricing_overrides_fee_payer_check
  CHECK (fee_payer IN ('vendor', 'tourist', 'shared'));

COMMIT;
