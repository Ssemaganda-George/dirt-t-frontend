-- =====================================================
-- Migration 010: Add reviewer city & country to service_reviews
--                Add home city & country to profiles
-- =====================================================

-- =====================================================
-- PART A: service_reviews columns
-- =====================================================

-- 1. Add columns
ALTER TABLE public.service_reviews
  ADD COLUMN IF NOT EXISTS reviewer_city text,
  ADD COLUMN IF NOT EXISTS reviewer_country text;

-- 2. Recreate the create_service_review RPC to accept the new fields
CREATE OR REPLACE FUNCTION create_service_review(
  p_service_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_visitor_session_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_visitor_name text DEFAULT NULL,
  p_visitor_email text DEFAULT NULL,
  p_rating numeric DEFAULT 0,
  p_kpi_ratings jsonb DEFAULT NULL,
  p_comment text DEFAULT NULL,
  p_is_verified_booking boolean DEFAULT false,
  p_reviewer_city text DEFAULT NULL,
  p_reviewer_country text DEFAULT NULL
)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  INSERT INTO public.service_reviews (
    service_id, user_id, visitor_session_id, ip_address,
    visitor_name, visitor_email, rating, kpi_ratings,
    comment, is_verified_booking, status,
    reviewer_city, reviewer_country
  ) VALUES (
    p_service_id, p_user_id, p_visitor_session_id, p_ip_address,
    p_visitor_name, p_visitor_email, p_rating, p_kpi_ratings,
    p_comment, p_is_verified_booking, 'pending',
    p_reviewer_city, p_reviewer_country
  )
  RETURNING row_to_json(service_reviews.*) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART B: profiles columns
-- =====================================================

-- 3. Add home_city and home_country to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_city text,
  ADD COLUMN IF NOT EXISTS home_country text;

-- 4. Update create_user_profile_atomic to accept city & country
CREATE OR REPLACE FUNCTION create_user_profile_atomic(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_role text DEFAULT 'tourist',
  p_home_city text DEFAULT NULL,
  p_home_country text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_profile record;
BEGIN
  -- Lock profiles table to prevent concurrent profile creation
  LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;

  -- Check if profile already exists
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF FOUND THEN
    -- Update existing profile
    UPDATE public.profiles
    SET
      email = p_email,
      full_name = p_full_name,
      role = p_role,
      home_city = COALESCE(p_home_city, home_city),
      home_country = COALESCE(p_home_country, home_country),
      updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'action', 'updated', 'profile_id', p_user_id);
  ELSE
    -- Create new profile
    INSERT INTO public.profiles (
      id, email, full_name, role, status,
      home_city, home_country,
      created_at, updated_at
    ) VALUES (
      p_user_id, p_email, p_full_name, p_role, 'active',
      p_home_city, p_home_country,
      now(), now()
    );

    RETURN jsonb_build_object('success', true, 'action', 'created', 'profile_id', p_user_id);
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
