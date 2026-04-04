-- Service pages and checkout run calculatePayment / getPricingPreview as anon (or non-vendor users).
-- RLS previously allowed only admins and vendors to SELECT vendor_tiers, so the tier row was
-- invisible and pricingService fell back to the hardcoded 15% default.
-- Allow read of active, currently-effective tier rows for public pricing breakdowns.

CREATE POLICY "Public can read active vendor tiers for pricing"
ON public.vendor_tiers
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND effective_from <= now()
  AND (effective_until IS NULL OR effective_until > now())
);
