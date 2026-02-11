-- Create profiles table with all required fields (only if it doesn't exist)
create table IF NOT EXISTS public.profiles (
  id uuid not null,
  email text null,
  full_name text null,
  phone text null,
  phone_country_code text null default '+256'::text,
  avatar_url text null,
  role text null default 'tourist'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  status text null,
  home_city text null,
  home_country text null,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint profiles_role_check check (
    (
      role = any (
        array['tourist'::text, 'vendor'::text, 'admin'::text]
      )
    )
  ),
  constraint profiles_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'pending'::text,
          'approved'::text,
          'rejected'::text,
          'suspended'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Add missing columns if they don't exist (for existing tables)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_country_code text default '+256'::text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS home_city text,
  ADD COLUMN IF NOT EXISTS home_country text;

-- Create index for status column (only if it doesn't exist)
create index IF not exists idx_profiles_status on public.profiles using btree (status) TABLESPACE pg_default;

-- Create trigger functions (use CREATE OR REPLACE to handle existing functions)
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
    INSERT INTO public.tourists (user_id, created_at, updated_at)
    VALUES (NEW.id, NEW.created_at, NEW.updated_at)
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
    INSERT INTO public.tourists (user_id, created_at, updated_at)
    VALUES (NEW.id, now(), now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist, then recreate them
DROP TRIGGER IF EXISTS trigger_create_tourist_on_profile_insert ON public.profiles;
DROP TRIGGER IF EXISTS trigger_create_tourist_on_profile_update ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Create triggers for profile management
create trigger trigger_create_tourist_on_profile_insert
after INSERT on profiles for EACH row
execute FUNCTION create_tourist_on_profile_insert ();

create trigger trigger_create_tourist_on_profile_update
after
update on profiles for EACH row
execute FUNCTION create_tourist_on_profile_update ();

create trigger update_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at_column ();