-- Item 4: get_effective_pricing RPC
-- Replaces 3 sequential client-side queries (services → service_pricing_overrides →
-- vendors + vendor_tiers) with a single server-side function call.
-- Reduces checkout DB load from 3 round-trips/user to 1.

DROP FUNCTION IF EXISTS public.get_effective_pricing(uuid, numeric, timestamptz);
DROP FUNCTION IF EXISTS public.get_effective_pricing(uuid, numeric);

CREATE OR REPLACE FUNCTION public.get_effective_pricing(
  p_service_id    uuid,
  p_base_price    numeric,          -- pass the unit price; NULL → use services.price
  p_purchase_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_vendor_id        uuid;
  v_service_price    numeric;
  v_base             numeric;
  v_override         record;
  v_vendor           record;
  v_tier             record;
  v_tier_id          uuid;
  v_platform_fee     numeric  := 0;
  v_fee_payer        text     := 'vendor';
  v_tourist_pct      numeric  := NULL;
  v_vendor_pct       numeric  := NULL;
  v_pricing_source   text     := 'tier';
  v_pricing_ref_id   uuid     := NULL;
  v_tourist_fee      numeric  := 0;
  v_vendor_fee       numeric  := 0;
  v_total_customer   numeric;
  v_vendor_payout    numeric;
BEGIN
  -- Fetch vendor_id (and service price as fallback when p_base_price is NULL)
  SELECT vendor_id, price
    INTO v_vendor_id, v_service_price
    FROM services
   WHERE id = p_service_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  v_base := COALESCE(p_base_price, v_service_price, 0);

  -- Check for active service pricing override
  SELECT *
    INTO v_override
    FROM service_pricing_overrides
   WHERE service_id      = p_service_id
     AND override_enabled = true
     AND effective_from  <= p_purchase_date
     AND (effective_until IS NULL OR effective_until >= p_purchase_date)
   ORDER BY effective_from DESC
   LIMIT 1;

  IF FOUND THEN
    v_platform_fee := CASE
      WHEN v_override.override_type = 'flat' THEN v_override.override_value
      ELSE v_base * (v_override.override_value / 100.0)
    END;
    v_fee_payer      := COALESCE(v_override.fee_payer, 'vendor');
    v_tourist_pct    := v_override.tourist_percentage;
    v_vendor_pct     := v_override.vendor_percentage;
    v_pricing_source := 'override';
    v_pricing_ref_id := v_override.id;
  ELSE
    -- Resolve vendor tier (manual tier wins when active)
    SELECT current_tier_id, manual_tier_id, manual_tier_expires_at
      INTO v_vendor
      FROM vendors
     WHERE id = v_vendor_id;

    IF FOUND THEN
      v_tier_id := CASE
        WHEN v_vendor.manual_tier_id IS NOT NULL
             AND (v_vendor.manual_tier_expires_at IS NULL
                  OR v_vendor.manual_tier_expires_at > now())
        THEN v_vendor.manual_tier_id
        ELSE v_vendor.current_tier_id
      END;

      IF v_tier_id IS NOT NULL THEN
        SELECT *
          INTO v_tier
          FROM vendor_tiers
         WHERE id           = v_tier_id
           AND is_active    = true
           AND effective_from <= p_purchase_date
           AND (effective_until IS NULL OR effective_until >= p_purchase_date);

        IF FOUND THEN
          v_platform_fee := CASE
            WHEN v_tier.commission_type = 'flat' THEN
              v_tier.commission_value
            ELSE
              v_base * (
                CASE WHEN v_tier.commission_value > 1
                     THEN v_tier.commission_value / 100.0
                     ELSE v_tier.commission_value
                END
              )
          END;
          v_fee_payer      := COALESCE(v_tier.fee_payer, 'vendor');
          v_tourist_pct    := v_tier.tourist_percentage;
          v_vendor_pct     := v_tier.vendor_percentage;
          v_pricing_ref_id := v_tier.id;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Apply fee-payer split
  IF v_fee_payer = 'tourist' THEN
    v_tourist_fee    := v_platform_fee;
    v_vendor_fee     := 0;
    v_total_customer := v_base + v_platform_fee;
    v_vendor_payout  := v_base;
  ELSIF v_fee_payer = 'shared' THEN
    v_tourist_fee    := v_platform_fee * (COALESCE(v_tourist_pct, 0) / 100.0);
    v_vendor_fee     := v_platform_fee * (COALESCE(v_vendor_pct,  0) / 100.0);
    v_total_customer := v_base + v_tourist_fee;
    v_vendor_payout  := v_base - v_vendor_fee;
  ELSE -- vendor pays
    v_tourist_fee    := 0;
    v_vendor_fee     := v_platform_fee;
    v_total_customer := v_base;
    v_vendor_payout  := v_base - v_platform_fee;
  END IF;

  RETURN jsonb_build_object(
    'success',               true,
    'base_price',            v_base,
    'platform_fee',          v_platform_fee,
    'tourist_fee',           v_tourist_fee,
    'vendor_fee',            v_vendor_fee,
    'vendor_payout',         v_vendor_payout,
    'total_customer_payment', v_total_customer,
    'fee_payer',             v_fee_payer,
    'pricing_source',        v_pricing_source,
    'pricing_reference_id',  v_pricing_ref_id,
    'service_id',            p_service_id
  );
END;
$$;

COMMENT ON FUNCTION public.get_effective_pricing(uuid, numeric, timestamptz) IS
  'Returns the effective pricing breakdown for a service in a single DB round-trip. '
  'Checks service_pricing_overrides first, then vendor_tiers. '
  'Called by marzpay-collect and the frontend pricingService.';

GRANT EXECUTE ON FUNCTION public.get_effective_pricing(uuid, numeric, timestamptz) TO authenticated, anon;
