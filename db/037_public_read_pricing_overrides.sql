-- Migration: Add public read access to active service pricing overrides
-- This allows the frontend pricing calculation to work for all users

-- Allow public read access to active service pricing overrides
CREATE POLICY "Public can read active service pricing overrides" ON public.service_pricing_overrides
  FOR SELECT USING (
    override_enabled = true
    AND effective_from <= now()
    AND (effective_until IS NULL OR effective_until >= now())
  );