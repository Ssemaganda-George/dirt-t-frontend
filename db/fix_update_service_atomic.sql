-- =============================================================================
-- Fix PGRST203 & type mismatch errors for service atomic functions
-- =============================================================================
-- Issues fixed:
-- 1. update_service_atomic: Duplicate overloaded functions (PGRST203)
-- 2. update_service_atomic: jsonb cannot be cast to text[] for images/amenities
-- 3. create_service_atomic: p_category_id is uuid but category_id column is text
-- =============================================================================

-- =============================================
-- PART 1: Fix update_service_atomic
-- =============================================

-- Step 1a: Drop ALL overloads of update_service_atomic
DROP FUNCTION IF EXISTS update_service_atomic(uuid, jsonb, uuid);

DO $$
DECLARE
  func_oid oid;
BEGIN
  FOR func_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'update_service_atomic'
      AND n.nspname = 'public'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
  END LOOP;
END $$;

-- Step 1b: Recreate a single clean version
CREATE OR REPLACE FUNCTION update_service_atomic(
  p_service_id uuid,
  p_updates jsonb,
  p_vendor_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_update_data jsonb;
BEGIN
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  IF p_vendor_id IS NOT NULL AND v_service.vendor_id != p_vendor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Service does not belong to this vendor');
  END IF;

  v_update_data := p_updates || jsonb_build_object('updated_at', now());

  UPDATE public.services
  SET
    title = COALESCE(v_update_data->>'title', title),
    description = COALESCE(v_update_data->>'description', description),
    price = COALESCE((v_update_data->>'price')::numeric, price),
    currency = COALESCE(v_update_data->>'currency', currency),
    images = CASE
      WHEN v_update_data ? 'images' AND jsonb_typeof(v_update_data->'images') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(v_update_data->'images'))
      ELSE images
    END,
    location = COALESCE(v_update_data->>'location', location),
    duration_hours = COALESCE((v_update_data->>'duration_hours')::numeric, duration_hours),
    max_capacity = COALESCE((v_update_data->>'max_capacity')::integer, max_capacity),
    amenities = CASE
      WHEN v_update_data ? 'amenities' AND jsonb_typeof(v_update_data->'amenities') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(v_update_data->'amenities'))
      ELSE amenities
    END,
    status = COALESCE(v_update_data->>'status', status),
    scan_enabled = COALESCE((v_update_data->>'scan_enabled')::boolean, scan_enabled),
    updated_at = now()
  WHERE id = p_service_id;

  RETURN jsonb_build_object('success', true, 'service_id', p_service_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_service_atomic(uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_service_atomic(uuid, jsonb, uuid) TO service_role;
COMMENT ON FUNCTION update_service_atomic(uuid, jsonb, uuid) IS 'Atomically updates a service with row locking';

-- =============================================
-- PART 2: Fix create_service_atomic
-- =============================================
-- The category_id column in the services table is TEXT (e.g. 'cat_transport'),
-- but the function was defined with p_category_id uuid, causing:
--   "invalid input syntax for type uuid: cat_transport"

-- Step 2a: Drop ALL overloads of create_service_atomic
DROP FUNCTION IF EXISTS create_service_atomic(uuid, uuid, text, text, numeric, text, text[], text, numeric, integer, text[], text);

DO $$
DECLARE
  func_oid oid;
BEGIN
  FOR func_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_service_atomic'
      AND n.nspname = 'public'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_oid::regprocedure || ' CASCADE';
  END LOOP;
END $$;

-- Step 2b: Recreate with p_category_id as TEXT (matches the actual column type)
CREATE OR REPLACE FUNCTION create_service_atomic(
  p_vendor_id uuid,
  p_category_id text,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text DEFAULT 'UGX',
  p_images text[] DEFAULT '{}',
  p_location text DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_max_capacity integer DEFAULT NULL,
  p_amenities text[] DEFAULT '{}',
  p_status text DEFAULT 'pending'
) RETURNS jsonb AS $$
DECLARE
  v_service record;
BEGIN
  INSERT INTO public.services (
    vendor_id,
    category_id,
    title,
    description,
    price,
    currency,
    images,
    location,
    duration_hours,
    max_capacity,
    amenities,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_vendor_id,
    p_category_id,
    p_title,
    p_description,
    p_price,
    p_currency,
    p_images,
    p_location,
    p_duration_hours,
    p_max_capacity,
    p_amenities,
    p_status,
    now(),
    now()
  )
  RETURNING id INTO v_service;

  RETURN jsonb_build_object('success', true, 'service_id', v_service.id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_service_atomic(uuid, text, text, text, numeric, text, text[], text, numeric, integer, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_service_atomic(uuid, text, text, text, numeric, text, text[], text, numeric, integer, text[], text) TO service_role;
COMMENT ON FUNCTION create_service_atomic(uuid, text, text, text, numeric, text, text[], text, numeric, integer, text[], text) IS 'Atomically creates a new service';
