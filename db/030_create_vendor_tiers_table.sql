-- Migration 030: Create vendor_tiers table for commission system
-- This table manages vendor tier configurations with commission rates and eligibility criteria

CREATE TABLE IF NOT EXISTS public.vendor_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  commission_rate decimal(3,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
  min_monthly_bookings integer NOT NULL DEFAULT 0 CHECK (min_monthly_bookings >= 0),
  min_rating decimal(2,1) CHECK (min_rating >= 0 AND min_rating <= 5),
  priority_order integer NOT NULL UNIQUE CHECK (priority_order > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_tiers_priority_order ON public.vendor_tiers(priority_order);
CREATE INDEX IF NOT EXISTS idx_vendor_tiers_active ON public.vendor_tiers(is_active) WHERE is_active = true;

-- Add RLS policies
ALTER TABLE public.vendor_tiers ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage tiers
CREATE POLICY "Admins can manage vendor tiers" ON public.vendor_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow vendors to read active tiers (for dashboard display)
CREATE POLICY "Vendors can read active vendor tiers" ON public.vendor_tiers
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'vendor'
    )
  );

-- Insert default tiers
INSERT INTO public.vendor_tiers (name, commission_rate, min_monthly_bookings, min_rating, priority_order, is_active) VALUES
  ('Bronze', 0.15, 0, NULL, 1, true),
  ('Silver', 0.12, 10, 4.0, 2, true),
  ('Gold', 0.10, 25, 4.5, 3, true),
  ('Platinum', 0.08, 50, 4.8, 4, true)
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_vendor_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendor_tiers_updated_at
  BEFORE UPDATE ON public.vendor_tiers
  FOR EACH ROW EXECUTE FUNCTION update_vendor_tiers_updated_at();