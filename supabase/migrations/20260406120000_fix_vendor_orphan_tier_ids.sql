-- After pricing_tiers removal, some vendors may still hold old UUIDs or NULL current_tier_id.
-- Normalize to a valid vendor_tiers row (Bronze by name).

WITH bronze AS (
  SELECT id, commission_type, commission_rate
  FROM public.vendor_tiers
  WHERE name = 'Bronze' AND is_active = true
  ORDER BY priority_order
  LIMIT 1
)
UPDATE public.vendors v
SET
  current_tier_id = (SELECT id FROM bronze),
  current_commission_rate = COALESCE(
    (
      SELECT CASE
        WHEN vt.commission_type = 'flat' THEN 0::numeric
        ELSE LEAST(1::numeric, GREATEST(0::numeric, vt.commission_rate))
      END
      FROM public.vendor_tiers vt
      WHERE vt.id = (SELECT id FROM bronze)
    ),
    0::numeric
  )
WHERE (SELECT id FROM bronze) IS NOT NULL
  AND (
    v.current_tier_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.vendor_tiers vt WHERE vt.id = v.current_tier_id
    )
  );

-- Clear manual tier if it points at a deleted/foreign id
UPDATE public.vendors v
SET
  manual_tier_id = NULL,
  manual_tier_expires_at = NULL,
  manual_tier_assigned_at = NULL,
  manual_tier_reason = NULL
WHERE v.manual_tier_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.vendor_tiers vt WHERE vt.id = v.manual_tier_id
  );
