-- Migration: 038_unique_pricing_tier_names.sql
-- Description: Enforce one tier per name - deduplicate existing data and add unique constraint.
--              Edit updates in place; no new rows created when editing a tier.
-- Note: vendors.current_tier_id references vendor_tiers, not pricing_tiers, so no vendor updates needed.

-- ===========================================
-- STEP 1: Deduplicate pricing_tiers
-- Keep one row per name (the most recently updated).
-- ===========================================

DO $$
DECLARE
  r RECORD;
  kept_id uuid;
BEGIN
  FOR r IN (
    SELECT name FROM public.pricing_tiers GROUP BY name HAVING COUNT(*) > 1
  ) LOOP
    -- Keep the tier with the latest updated_at
    SELECT id INTO kept_id
    FROM public.pricing_tiers
    WHERE name = r.name
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    -- Delete the duplicate tiers (keep only kept_id)
    DELETE FROM public.pricing_tiers
    WHERE name = r.name AND id != kept_id;
  END LOOP;
END $$;

-- ===========================================
-- STEP 2: Add UNIQUE constraint on name
-- Prevents duplicate tier names going forward.
-- ===========================================

-- Drop if exists (allows migration re-run)
ALTER TABLE public.pricing_tiers DROP CONSTRAINT IF EXISTS pricing_tiers_name_unique;

-- Add unique constraint - one tier per name
ALTER TABLE public.pricing_tiers
  ADD CONSTRAINT pricing_tiers_name_unique UNIQUE (name);
