-- Migration: Create service_pricing_overrides table with one-override-per-service constraint
-- This creates the missing table for pricing overrides and enforces that each service can have only one override

-- First, drop existing trigger if it exists
DROP TRIGGER IF EXISTS service_override_single_check ON public.service_pricing_overrides;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage service pricing overrides" ON public.service_pricing_overrides;
DROP POLICY IF EXISTS "Vendors can read their service overrides" ON public.service_pricing_overrides;

-- Create service_pricing_overrides table (this will be skipped if table already exists)
CREATE TABLE IF NOT EXISTS public.service_pricing_overrides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  override_enabled boolean NOT NULL DEFAULT false,
  override_type text NOT NULL CHECK (override_type IN ('flat', 'percentage')),
  override_value numeric NOT NULL CHECK (override_value >= 0),
  fee_payer text NOT NULL CHECK (fee_payer IN ('vendor', 'tourist', 'shared')),
  tourist_percentage numeric(5,2) DEFAULT 0 CHECK (tourist_percentage >= 0 AND tourist_percentage <= 100),
  vendor_percentage numeric(5,2) DEFAULT 0 CHECK (vendor_percentage >= 0 AND vendor_percentage <= 100),
  effective_from timestamp with time zone NOT NULL DEFAULT now(),
  effective_until timestamp with time zone,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,

  -- Ensure effective_until is after effective_from
  CONSTRAINT service_overrides_valid_dates CHECK (
    effective_until IS NULL OR effective_until > effective_from
  ),

  -- Ensure percentages add up to 100% for shared fees
  CONSTRAINT service_overrides_shared_percentages CHECK (
    fee_payer != 'shared' OR (tourist_percentage + vendor_percentage = 100)
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_overrides_service_id ON public.service_pricing_overrides(service_id);
CREATE INDEX IF NOT EXISTS idx_service_overrides_effective ON public.service_pricing_overrides(service_id, effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_service_overrides_active ON public.service_pricing_overrides(service_id, effective_from, effective_until) WHERE override_enabled = true;

-- Create trigger function to prevent multiple overrides per service
CREATE OR REPLACE FUNCTION check_service_override_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already any override for this service (only one override allowed per service)
  IF EXISTS (
    SELECT 1 FROM public.service_pricing_overrides
    WHERE service_id = NEW.service_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Only one pricing override is allowed per service. Edit the existing override instead of creating a new one.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce one override per service
CREATE TRIGGER service_override_single_check
  BEFORE INSERT OR UPDATE ON public.service_pricing_overrides
  FOR EACH ROW EXECUTE FUNCTION check_service_override_overlap();

-- Add RLS policies
ALTER TABLE public.service_pricing_overrides ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage service pricing overrides
CREATE POLICY "Admins can manage service pricing overrides" ON public.service_pricing_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow vendors to read their own service overrides
CREATE POLICY "Vendors can read their service overrides" ON public.service_pricing_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.services s
      JOIN public.profiles p ON s.vendor_id = p.id
      WHERE s.id = service_pricing_overrides.service_id
      AND p.id = auth.uid()
      AND p.role = 'vendor'
    )
  );