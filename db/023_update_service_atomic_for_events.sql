-- Migration: Update update_service_atomic function to handle new event feature columns
-- This migration modifies the update_service_atomic function to include the new event feature boolean columns

-- Update the update_service_atomic function to handle new event columns
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
    -- Event-specific columns
    event_description = COALESCE(v_update_data->>'event_description', event_description),
    event_type = COALESCE(v_update_data->>'event_type', event_type),
    -- Safely handle event_datetime: if provided in the update JSON, parse/cast it to timestamptz
    -- otherwise keep the existing event_datetime value. This avoids COALESCE mixing text and timestamptz.
    event_datetime = CASE
      WHEN v_update_data ? 'event_datetime' THEN
        CASE
          -- treat empty strings as NULL
          WHEN trim(coalesce(v_update_data->>'event_datetime', '')) = '' THEN NULL
          -- legacy format DD/MM/YYYY, HH24:MI
          WHEN (v_update_data->>'event_datetime') ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}, [0-9]{2}:[0-9]{2}$' THEN to_timestamp(v_update_data->>'event_datetime', 'DD/MM/YYYY, HH24:MI')::timestamptz
          -- attempt to cast ISO-formatted strings to timestamptz
          ELSE (v_update_data->>'event_datetime')::timestamptz
        END
      ELSE event_datetime
    END,
    event_location = COALESCE(v_update_data->>'event_location', event_location),
    max_participants = COALESCE((v_update_data->>'max_participants')::integer, max_participants),
    minimum_age = COALESCE((v_update_data->>'minimum_age')::integer, minimum_age),
    registration_deadline = COALESCE(v_update_data->>'registration_deadline', registration_deadline),
    internal_ticketing = COALESCE((v_update_data->>'internal_ticketing')::boolean, internal_ticketing),
    ticket_types = CASE
      WHEN v_update_data ? 'ticket_types' AND jsonb_typeof(v_update_data->'ticket_types') = 'array'
      THEN v_update_data->'ticket_types'
      ELSE ticket_types
    END,
    event_highlights = CASE
      WHEN v_update_data ? 'event_highlights' AND jsonb_typeof(v_update_data->'event_highlights') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(v_update_data->'event_highlights'))
      ELSE event_highlights
    END,
    event_inclusions = CASE
      WHEN v_update_data ? 'event_inclusions' AND jsonb_typeof(v_update_data->'event_inclusions') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(v_update_data->'event_inclusions'))
      ELSE event_inclusions
    END,
    event_prerequisites = CASE
      WHEN v_update_data ? 'event_prerequisites' AND jsonb_typeof(v_update_data->'event_prerequisites') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(v_update_data->'event_prerequisites'))
      ELSE event_prerequisites
    END,
    photography_allowed = COALESCE((v_update_data->>'photography_allowed')::boolean, photography_allowed),
    recording_allowed = COALESCE((v_update_data->>'recording_allowed')::boolean, recording_allowed),
    group_discounts = COALESCE((v_update_data->>'group_discounts')::boolean, group_discounts),
    transportation_included = COALESCE((v_update_data->>'transportation_included')::boolean, transportation_included),
    meals_included = COALESCE((v_update_data->>'meals_included')::boolean, meals_included),
    certificates_provided = COALESCE((v_update_data->>'certificates_provided')::boolean, certificates_provided),
    event_cancellation_policy = COALESCE(v_update_data->>'event_cancellation_policy', event_cancellation_policy),
    updated_at = now()
  WHERE id = p_service_id;

  RETURN jsonb_build_object('success', true, 'service_id', p_service_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_service_atomic(uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_service_atomic(uuid, jsonb, uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION update_service_atomic(uuid, jsonb, uuid) IS 'Atomically updates a service with row locking, including new event feature columns';