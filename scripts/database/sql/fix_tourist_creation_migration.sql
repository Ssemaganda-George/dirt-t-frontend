-- Combined migration script for tourist creation fixes
-- Run this in Supabase SQL Editor

-- 1. Split full name migration (creates correct create_user_profile_atomic function)
-- From db/011_split_full_name.sql

-- Add first_name and last_name columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Update create_user_profile_atomic to accept first_name and last_name
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

-- 2. Create profiles table and triggers (from db/012_create_profiles_table.sql)

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  full_name text,
  role text DEFAULT 'tourist' CHECK (role IN ('tourist', 'vendor', 'admin')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  home_city text,
  home_country text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create tourists table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tourists (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  location text,
  tourist_home_city text,
  tourist_home_country text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tourists ENABLE ROW LEVEL SECURITY;

-- Create trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_tourist_on_profile_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a tourist record when a profile with role 'tourist' is inserted
  IF NEW.role = 'tourist' THEN
    INSERT INTO public.tourists (user_id, first_name, last_name, tourist_home_city, tourist_home_country, created_at, updated_at)
    VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.home_city, NEW.home_country, NEW.created_at, NEW.updated_at)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_tourist_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a tourist record when a profile role is updated to 'tourist'
  IF NEW.role = 'tourist' AND (OLD.role IS NULL OR OLD.role != 'tourist') THEN
    INSERT INTO public.tourists (user_id, first_name, last_name, tourist_home_city, tourist_home_country, created_at, updated_at)
    VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.home_city, NEW.home_country, now(), now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tourists_updated_at ON public.tourists;
CREATE TRIGGER update_tourists_updated_at
  BEFORE UPDATE ON public.tourists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS create_tourist_on_profile_insert_trigger ON public.profiles;
CREATE TRIGGER create_tourist_on_profile_insert_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_tourist_on_profile_insert();

DROP TRIGGER IF EXISTS create_tourist_on_profile_update_trigger ON public.profiles;
CREATE TRIGGER create_tourist_on_profile_update_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_tourist_on_profile_update();

-- 3. RLS Policies for profiles and tourists

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
CREATE POLICY "Service role can manage all profiles" ON public.profiles
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Tourists policies
DROP POLICY IF EXISTS "Users can view their own tourist record" ON public.tourists;
CREATE POLICY "Users can view their own tourist record" ON public.tourists
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tourist record" ON public.tourists;
CREATE POLICY "Users can update their own tourist record" ON public.tourists
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all tourist records" ON public.tourists;
CREATE POLICY "Service role can manage all tourist records" ON public.tourists
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Create tourist record function (from db/016_create_tourist_record_function.sql)

CREATE OR REPLACE FUNCTION create_tourist_record(
  p_user_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_home_city text DEFAULT NULL,
  p_home_country text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_existing record;
BEGIN
  -- Check if tourist record already exists
  SELECT * INTO v_existing
  FROM public.tourists
  WHERE user_id = p_user_id;

  IF FOUND THEN
    -- Update existing record
    UPDATE public.tourists
    SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(p_last_name, last_name),
      location = COALESCE(p_location, location),
      tourist_home_city = COALESCE(p_home_city, tourist_home_city),
      tourist_home_country = COALESCE(p_home_country, tourist_home_country),
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'action', 'updated');
  ELSE
    -- Create new record
    INSERT INTO public.tourists (
      user_id, first_name, last_name, location,
      tourist_home_city, tourist_home_country,
      created_at, updated_at
    ) VALUES (
      p_user_id, p_first_name, p_last_name, p_location,
      p_home_city, p_home_country,
      now(), now()
    );

    RETURN jsonb_build_object('success', true, 'action', 'created');
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;