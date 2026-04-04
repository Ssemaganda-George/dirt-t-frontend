-- Historical: aligned pricing_tiers to vendor_tiers before single-table consolidation.
-- If pricing_tiers no longer exists (after 20260404140000), skip quietly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pricing_tiers'
  ) THEN
    UPDATE public.pricing_tiers SET commission_type = 'flat', commission_value = 2000, updated_at = now() WHERE name = 'Bronze';
    UPDATE public.pricing_tiers SET commission_type = 'percentage', commission_value = 12, updated_at = now() WHERE name = 'Silver';
    UPDATE public.pricing_tiers SET commission_type = 'percentage', commission_value = 10, updated_at = now() WHERE name = 'Gold';
    UPDATE public.pricing_tiers SET commission_type = 'percentage', commission_value = 8, updated_at = now() WHERE name = 'Platinum';
  END IF;
END $$;
