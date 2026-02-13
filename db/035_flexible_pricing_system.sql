-- Migration: 035_flexible_pricing_system.sql
-- Description: Implement flexible multi-tier pricing system with service-level overrides
-- Date: 2024

-- ===========================================
-- PRICING TIERS TABLE
-- ===========================================

-- Create pricing_tiers table (replaces vendor_tiers with effective dates)
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, -- Bronze, Silver, Gold, Platinum
  commission_type text NOT NULL CHECK (commission_type IN ('percentage', 'flat')),
  commission_value numeric NOT NULL CHECK (commission_value >= 0),
  min_monthly_bookings integer NOT NULL DEFAULT 0 CHECK (min_monthly_bookings >= 0),
  min_rating numeric(2,1) CHECK (min_rating >= 0 AND min_rating <= 5),
  priority_order integer NOT NULL CHECK (priority_order > 0),
  effective_from timestamp with time zone NOT NULL DEFAULT now(),
  effective_until timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,

  -- Ensure no overlapping effective periods for same tier name (when effective_until is set)
  -- We'll use a trigger for this constraint instead of EXCLUDE

  -- Ensure effective_until is after effective_from
  CONSTRAINT pricing_tiers_valid_dates CHECK (
    effective_until IS NULL OR effective_until > effective_from
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_name_effective ON public.pricing_tiers(name, effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_active ON public.pricing_tiers(is_active, priority_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_priority ON public.pricing_tiers(priority_order);

-- Create trigger function to prevent overlapping date ranges for pricing tiers
CREATE OR REPLACE FUNCTION check_pricing_tier_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for overlaps when effective_until is set
  IF NEW.effective_until IS NOT NULL THEN
    -- Check if there's any overlapping tier with the same name
    IF EXISTS (
      SELECT 1 FROM public.pricing_tiers
      WHERE name = NEW.name
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND effective_until IS NOT NULL
        AND (
          (effective_from <= NEW.effective_from AND effective_until > NEW.effective_from) OR
          (effective_from < NEW.effective_until AND effective_until >= NEW.effective_until) OR
          (effective_from >= NEW.effective_from AND effective_until <= NEW.effective_until)
        )
    ) THEN
      RAISE EXCEPTION 'Overlapping effective date ranges not allowed for pricing tier: %', NEW.name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pricing tiers
CREATE TRIGGER pricing_tier_overlap_check
  BEFORE INSERT OR UPDATE ON public.pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION check_pricing_tier_overlap();

-- Add RLS policies
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage pricing tiers
CREATE POLICY "Admins can manage pricing tiers" ON public.pricing_tiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow vendors to read active pricing tiers
CREATE POLICY "Vendors can read active pricing tiers" ON public.pricing_tiers
  FOR SELECT USING (
    is_active = true AND
    effective_from <= now() AND
    (effective_until IS NULL OR effective_until > now()) AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'vendor'
    )
  );

-- Insert default pricing tiers (current active tiers)
INSERT INTO public.pricing_tiers (
  name,
  commission_type,
  commission_value,
  min_monthly_bookings,
  min_rating,
  priority_order,
  effective_from,
  is_active
) VALUES
  ('Bronze', 'percentage', 0.15, 0, NULL, 1, '2024-01-01 00:00:00+00', true),
  ('Silver', 'percentage', 0.12, 10, 4.0, 2, '2024-01-01 00:00:00+00', true),
  ('Gold', 'percentage', 0.10, 25, 4.5, 3, '2024-01-01 00:00:00+00', true),
  ('Platinum', 'percentage', 0.08, 50, 4.8, 4, '2024-01-01 00:00:00+00', true)
ON CONFLICT DO NOTHING;

-- ===========================================
-- SERVICE PRICING OVERRIDES TABLE
-- ===========================================

-- Create service_pricing_overrides table
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

  -- Ensure no overlapping effective periods for same service (when effective_until is set)
  -- We'll use a trigger for this constraint instead of EXCLUDE

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

-- Create trigger function to prevent overlapping date ranges for service overrides
CREATE OR REPLACE FUNCTION check_service_override_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for overlaps when effective_until is set
  IF NEW.effective_until IS NOT NULL THEN
    -- Check if there's any overlapping override for the same service
    IF EXISTS (
      SELECT 1 FROM public.service_pricing_overrides
      WHERE service_id = NEW.service_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND effective_until IS NOT NULL
        AND (
          (effective_from <= NEW.effective_from AND effective_until > NEW.effective_from) OR
          (effective_from < NEW.effective_until AND effective_until >= NEW.effective_until) OR
          (effective_from >= NEW.effective_from AND effective_until <= NEW.effective_until)
        )
    ) THEN
      RAISE EXCEPTION 'Overlapping effective date ranges not allowed for service pricing override';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for service pricing overrides
CREATE TRIGGER service_override_overlap_check
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

-- ===========================================
-- UPDATE ORDERS TABLE
-- ===========================================

-- Add new columns to orders table for detailed pricing tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS pricing_source text CHECK (pricing_source IN ('tier', 'override')),
ADD COLUMN IF NOT EXISTS pricing_reference_id uuid,
ADD COLUMN IF NOT EXISTS base_price numeric,
ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_payout numeric,
ADD COLUMN IF NOT EXISTS fee_payer text CHECK (fee_payer IN ('vendor', 'tourist'));

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_orders_pricing_source ON public.orders(pricing_source);
CREATE INDEX IF NOT EXISTS idx_orders_pricing_reference ON public.orders(pricing_reference_id);

-- ===========================================
-- CALCULATE PAYMENT FUNCTION
-- ===========================================

-- Create the calculatePayment function
CREATE OR REPLACE FUNCTION calculate_payment(
  p_service_id uuid,
  p_purchase_date timestamp with time zone DEFAULT now()
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_override record;
  v_tier record;
  v_base_price numeric;
  v_platform_fee numeric := 0;
  v_vendor_payout numeric;
  v_total_customer_payment numeric;
  v_fee_payer text;
  v_pricing_source text;
  v_pricing_reference_id uuid;
BEGIN
  -- Get service details
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Service not found'
    );
  END IF;

  v_base_price := v_service.price;

  -- Check for active service pricing override
  SELECT * INTO v_override
  FROM public.service_pricing_overrides
  WHERE service_id = p_service_id
    AND override_enabled = true
    AND effective_from <= p_purchase_date
    AND (effective_until IS NULL OR effective_until > p_purchase_date)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF FOUND THEN
    -- Use override pricing
    v_pricing_source := 'override';
    v_pricing_reference_id := v_override.id;
    v_fee_payer := v_override.fee_payer;

    IF v_override.override_type = 'flat' THEN
      v_platform_fee := v_override.override_value;
    ELSE -- percentage
      v_platform_fee := v_base_price * (v_override.override_value / 100);
    END IF;

  ELSE
    -- Use vendor tier pricing
    v_pricing_source := 'tier';
    v_fee_payer := 'vendor'; -- Default: vendor pays platform fee

    -- Get vendor's current tier
    SELECT pt.* INTO v_tier
    FROM public.vendors v
    JOIN public.pricing_tiers pt ON v.current_tier_id = pt.id
    WHERE v.id = v_service.vendor_id
      AND pt.is_active = true
      AND pt.effective_from <= p_purchase_date
      AND (pt.effective_until IS NULL OR pt.effective_until > p_purchase_date);

    IF FOUND THEN
      v_pricing_reference_id := v_tier.id;

      IF v_tier.commission_type = 'flat' THEN
        v_platform_fee := v_tier.commission_value;
      ELSE -- percentage
        v_platform_fee := v_base_price * (v_tier.commission_value / 100);
      END IF;
    ELSE
      -- No tier found, use default 15% commission
      v_platform_fee := v_base_price * 0.15;
    END IF;
  END IF;

  -- Calculate final amounts based on fee payer
  IF v_fee_payer = 'tourist' THEN
    -- Tourist pays the platform fee
    v_total_customer_payment := v_base_price + v_platform_fee;
    v_vendor_payout := v_base_price;
  ELSE
    -- Vendor pays the platform fee (default)
    v_total_customer_payment := v_base_price;
    v_vendor_payout := v_base_price - v_platform_fee;
  END IF;

  -- Return calculation results
  RETURN jsonb_build_object(
    'success', true,
    'base_price', v_base_price,
    'platform_fee', v_platform_fee,
    'vendor_payout', v_vendor_payout,
    'total_customer_payment', v_total_customer_payment,
    'fee_payer', v_fee_payer,
    'pricing_source', v_pricing_source,
    'pricing_reference_id', v_pricing_reference_id,
    'service_id', p_service_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION calculate_payment(uuid, timestamp with time zone) IS 'Calculates payment breakdown for a service including platform fees, vendor payouts, and pricing source';

-- ===========================================
-- UPDATE BOOKING CREATION FUNCTION
-- ===========================================

-- Update create_booking_atomic to use new pricing system
CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_service_id uuid,
  p_vendor_id uuid,
  p_booking_date date,
  p_guests integer,
  p_total_amount numeric,
  p_tourist_id uuid DEFAULT NULL,
  p_service_date date DEFAULT NULL,
  p_currency text DEFAULT 'UGX',
  p_special_requests text DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_dropoff_location text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_existing_bookings integer;
  v_available_capacity integer;
  v_booking record;
  v_pricing_calculation jsonb;
  v_result jsonb;
BEGIN
  -- Lock the service row for update to prevent concurrent bookings
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  -- Check if service exists and is available
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  IF v_service.status NOT IN ('approved', 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service is not available for booking');
  END IF;

  -- Check capacity if max_capacity is set
  IF v_service.max_capacity IS NOT NULL THEN
    -- Count existing confirmed bookings for this service and date
    SELECT COALESCE(SUM(guests), 0) INTO v_existing_bookings
    FROM public.bookings
    WHERE service_id = p_service_id
      AND service_date = p_service_date
      AND status IN ('confirmed', 'pending');

    v_available_capacity := v_service.max_capacity - v_existing_bookings;

    IF v_available_capacity < p_guests THEN
      RETURN jsonb_build_object('success', false, 'error', format('Insufficient capacity. Available: %s, Requested: %s', v_available_capacity, p_guests));
    END IF;
  END IF;

  -- Calculate pricing using new system
  SELECT calculate_payment(p_service_id, now()) INTO v_pricing_calculation;

  IF NOT (v_pricing_calculation->>'success')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to calculate pricing: ' || (v_pricing_calculation->>'error'));
  END IF;

  -- Create the booking with new pricing fields
  INSERT INTO public.bookings (
    service_id,
    tourist_id,
    vendor_id,
    booking_date,
    service_date,
    guests,
    total_amount,
    currency,
    status,
    payment_status,
    special_requests,
    guest_name,
    guest_email,
    guest_phone,
    pickup_location,
    dropoff_location,
    is_guest_booking,
    commission_rate_at_booking,
    commission_amount,
    vendor_payout_amount,
    pricing_source,
    pricing_reference_id,
    base_price,
    platform_fee,
    fee_payer,
    created_at,
    updated_at
  ) VALUES (
    p_service_id,
    p_tourist_id,
    p_vendor_id,
    p_booking_date,
    p_service_date,
    p_guests,
    (v_pricing_calculation->>'total_customer_payment')::numeric,
    p_currency,
    'pending',
    'pending',
    p_special_requests,
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_pickup_location,
    p_dropoff_location,
    CASE WHEN p_tourist_id IS NULL THEN true ELSE false END,
    CASE WHEN (v_pricing_calculation->>'pricing_source') = 'tier'
         THEN (v_pricing_calculation->>'platform_fee')::numeric / (v_pricing_calculation->>'base_price')::numeric
         ELSE 0 END,
    (v_pricing_calculation->>'platform_fee')::numeric,
    (v_pricing_calculation->>'vendor_payout')::numeric,
    (v_pricing_calculation->>'pricing_source'),
    (v_pricing_calculation->>'pricing_reference_id')::uuid,
    (v_pricing_calculation->>'base_price')::numeric,
    (v_pricing_calculation->>'platform_fee')::numeric,
    (v_pricing_calculation->>'fee_payer'),
    now(),
    now()
  )
  RETURNING id INTO v_booking;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'pricing_breakdown', v_pricing_calculation
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comment
COMMENT ON FUNCTION create_booking_atomic(uuid, uuid, date, integer, numeric, uuid, date, text, text, text, text, text, text, text) IS 'Atomically creates a booking with capacity validation, flexible pricing calculation, and prevents overbooking';