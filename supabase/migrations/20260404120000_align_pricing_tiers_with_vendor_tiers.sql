-- Align public.pricing_tiers commission rules with public.vendor_tiers (vendor FKs point there).
-- Safe to re-run only if values still need syncing.

UPDATE public.pricing_tiers SET
  commission_type = 'flat',
  commission_value = 2000,
  updated_at = now()
WHERE name = 'Bronze';

UPDATE public.pricing_tiers SET
  commission_type = 'percentage',
  commission_value = 12,
  updated_at = now()
WHERE name = 'Silver';

UPDATE public.pricing_tiers SET
  commission_type = 'percentage',
  commission_value = 10,
  updated_at = now()
WHERE name = 'Gold';

UPDATE public.pricing_tiers SET
  commission_type = 'percentage',
  commission_value = 8,
  updated_at = now()
WHERE name = 'Platinum';
