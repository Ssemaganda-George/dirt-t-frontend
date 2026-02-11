-- =====================================================
-- Migration 011: Split full_name into first_name and last_name
-- =====================================================

-- 1. Add first_name and last_name columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Migrate existing full_name data to first_name and last_name
-- Split full_name on the first space, first part goes to first_name, rest to last_name
UPDATE public.profiles
SET
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE
    WHEN array_length(string_to_array(full_name, ' '), 1) > 1
    THEN trim(substring(full_name from position(' ' in full_name) + 1))
    ELSE ''
  END
WHERE full_name IS NOT NULL AND full_name != '';

-- 3. Update create_user_profile_atomic to accept first_name and last_name
CREATE OR REPLACE FUNCTION create_user_profile_atomic(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_role text DEFAULT 'tourist',
  p_home_city text DEFAULT NULL,
  p_home_country text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_profile record;
  v_full_name text;
BEGIN
  -- Combine first and last name for backward compatibility
  v_full_name := trim(p_first_name || ' ' || p_last_name);

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
      first_name = p_first_name,
      last_name = p_last_name,
      full_name = v_full_name,
      role = p_role,
      home_city = COALESCE(p_home_city, home_city),
      home_country = COALESCE(p_home_country, home_country),
      updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'action', 'updated', 'profile_id', p_user_id);
  ELSE
    -- Create new profile
    INSERT INTO public.profiles (
      id, email, first_name, last_name, full_name, role, status,
      home_city, home_country,
      created_at, updated_at
    ) VALUES (
      p_user_id, p_email, p_first_name, p_last_name, v_full_name, p_role, 'active',
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

-- 4. Update create_vendor_profile_atomic to use first_name and last_name
-- (This function might need updating if it references full_name, but let's check if it exists first)
-- For now, we'll keep backward compatibility by maintaining full_name