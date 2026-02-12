-- Update atomic functions to support custom_fields parameter
-- This extends the existing create_service_atomic and update_service_atomic functions

-- Drop and recreate create_service_atomic with custom_fields support
DROP FUNCTION IF EXISTS create_service_atomic(uuid, uuid, text, text, numeric, text, text[], text, numeric, integer, text[], text);

CREATE OR REPLACE FUNCTION create_service_atomic(
  p_vendor_id uuid,
  p_category_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text DEFAULT 'UGX',
  p_images text[] DEFAULT '{}',
  p_location text DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_max_capacity integer DEFAULT NULL,
  p_amenities text[] DEFAULT '{}',
  p_status text DEFAULT 'pending',
  p_custom_fields jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_result jsonb;
BEGIN
  -- Lock services table to prevent concurrent service creation conflicts
  LOCK TABLE public.services IN SHARE ROW EXCLUSIVE MODE;

  -- Insert new service
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
    custom_fields,
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
    p_custom_fields,
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

-- Update comment
COMMENT ON FUNCTION create_service_atomic(uuid, uuid, text, text, numeric, text, text[], text, numeric, integer, text[], text, jsonb) IS 'Atomically creates a new service with proper locking and custom fields support';

-- Update update_service_atomic to handle custom_fields in JSONB updates
-- The function already accepts JSONB updates, so custom_fields can be passed in p_updates
-- We just need to ensure it's handled in the UPDATE statement

CREATE OR REPLACE FUNCTION update_service_atomic(
  p_service_id uuid,
  p_updates jsonb,
  p_vendor_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_service record;
  v_update_data jsonb;
  v_result jsonb;
BEGIN
  -- Lock the service row for update to prevent concurrent modifications
  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
  FOR UPDATE;

  -- Check if service exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Service not found');
  END IF;

  -- Check authorization (vendor owns service or is admin)
  IF p_vendor_id IS NOT NULL AND v_service.vendor_id != p_vendor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Service does not belong to this vendor');
  END IF;

  -- Prepare update data with timestamp
  v_update_data := p_updates || jsonb_build_object('updated_at', now());

  -- Update service atomically
  UPDATE public.services
  SET
    title = COALESCE(v_update_data->>'title', title),
    description = COALESCE(v_update_data->>'description', description),
    price = COALESCE((v_update_data->>'price')::numeric, price),
    currency = COALESCE(v_update_data->>'currency', currency),
    images = COALESCE((v_update_data->>'images')::text[], images),
    location = COALESCE(v_update_data->>'location', location),
    duration_hours = COALESCE((v_update_data->>'duration_hours')::numeric, duration_hours),
    max_capacity = COALESCE((v_update_data->>'max_capacity')::integer, max_capacity),
    amenities = COALESCE((v_update_data->>'amenities')::text[], amenities),
    status = COALESCE(v_update_data->>'status', status),
    scan_enabled = COALESCE((v_update_data->>'scan_enabled')::boolean, scan_enabled),
    custom_fields = COALESCE((v_update_data->'custom_fields')::jsonb, custom_fields),
    updated_at = now()
  WHERE id = p_service_id;

  RETURN jsonb_build_object('success', true, 'service_id', p_service_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION update_service_atomic(uuid, jsonb, uuid) IS 'Atomically updates a service with row locking to prevent concurrent modifications. Supports custom_fields updates via JSONB.';
