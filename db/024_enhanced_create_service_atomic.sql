-- Migration: Create enhanced create_service_atomic function for events
-- This migration creates a new version of create_service_atomic that can handle all event fields

-- Create an enhanced create_service_atomic function that accepts all service fields
CREATE OR REPLACE FUNCTION create_service_atomic(
  p_vendor_id uuid,
  p_category_id text,
  p_title text,
  p_description text,
  p_price numeric DEFAULT 0,
  p_currency text DEFAULT 'UGX',
  p_images text[] DEFAULT '{}',
  p_location text DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_max_capacity integer DEFAULT NULL,
  p_amenities text[] DEFAULT '{}',
  p_status text DEFAULT 'pending',
  -- Event-specific parameters
  p_event_description text DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_event_datetime text DEFAULT NULL,
  p_event_location text DEFAULT NULL,
  p_max_participants integer DEFAULT NULL,
  p_minimum_age integer DEFAULT NULL,
  p_registration_deadline text DEFAULT NULL,
  p_internal_ticketing boolean DEFAULT false,
  p_ticket_types jsonb DEFAULT NULL,
  p_event_highlights text[] DEFAULT '{}',
  p_event_inclusions text[] DEFAULT '{}',
  p_event_prerequisites text[] DEFAULT '{}',
  p_photography_allowed boolean DEFAULT false,
  p_recording_allowed boolean DEFAULT false,
  p_group_discounts boolean DEFAULT false,
  p_transportation_included boolean DEFAULT false,
  p_meals_included boolean DEFAULT false,
  p_certificates_provided boolean DEFAULT false,
  p_event_cancellation_policy text DEFAULT NULL
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
    -- Event-specific columns
    event_description,
    event_type,
    event_datetime,
    event_location,
    max_participants,
    minimum_age,
    registration_deadline,
    internal_ticketing,
    ticket_types,
    event_highlights,
    event_inclusions,
    event_prerequisites,
    photography_allowed,
    recording_allowed,
    group_discounts,
    transportation_included,
    meals_included,
    certificates_provided,
    event_cancellation_policy,
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
    -- Event-specific values
    p_event_description,
    p_event_type,
    -- convert human-friendly strings (DD/MM/YYYY, HH24:MI) to timestamptz, or accept ISO strings
    CASE
      WHEN p_event_datetime IS NULL OR length(trim(p_event_datetime)) = 0 THEN NULL
      WHEN p_event_datetime ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}, [0-9]{2}:[0-9]{2}$' THEN to_timestamp(p_event_datetime, 'DD/MM/YYYY, HH24:MI')::timestamptz
      ELSE p_event_datetime::timestamptz
    END,
    p_event_location,
    p_max_participants,
    p_minimum_age,
    p_registration_deadline,
    p_internal_ticketing,
    p_ticket_types,
    p_event_highlights,
    p_event_inclusions,
    p_event_prerequisites,
    p_photography_allowed,
    p_recording_allowed,
    p_group_discounts,
    p_transportation_included,
    p_meals_included,
    p_certificates_provided,
    p_event_cancellation_policy,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_service_atomic(uuid, text, text, text, numeric, text, text[], text, numeric, integer, text[], text, text, text, text, integer, integer, text, boolean, jsonb, text[], text[], text[], boolean, boolean, boolean, boolean, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_service_atomic(uuid, text, text, text, numeric, text, text[], text, numeric, integer, text[], text, text, text, text, integer, integer, text, boolean, jsonb, text[], text[], text[], boolean, boolean, boolean, boolean, boolean, boolean, text) TO service_role;

-- Add comment
COMMENT ON FUNCTION create_service_atomic(uuid, text, text, text, numeric, text, text[], text, numeric, integer, text[], text, text, text, text, integer, integer, text, boolean, jsonb, text[], text[], text[], boolean, boolean, boolean, boolean, boolean, boolean, text) IS 'Atomically creates a new service with all fields including event-specific columns';

-- Keep the old function signature for backward compatibility
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
BEGIN
  -- Call the enhanced function with default values
  RETURN create_service_atomic(
    p_vendor_id, p_category_id, p_title, p_description, p_price, p_currency,
    p_images, p_location, p_duration_hours, p_max_capacity, p_amenities, p_status,
    NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, '{}', '{}', '{}',
    false, false, false, false, false, false, NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for backward compatibility function
GRANT EXECUTE ON FUNCTION create_service_atomic(uuid, text, text, text, numeric, text, text[], text, numeric, integer, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_service_atomic(uuid, text, text, text, numeric, text, text[], text, numeric, integer, text[], text) TO service_role;