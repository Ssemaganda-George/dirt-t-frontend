-- Add missing columns to tourists table to accommodate all profile details
-- Migration: 015_add_country_codes_to_tourists

ALTER TABLE public.tourists
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS country_code text,
ADD COLUMN IF NOT EXISTS tourist_home_city text,
ADD COLUMN IF NOT EXISTS tourist_home_country text,
ADD COLUMN IF NOT EXISTS emergency_contact text,
ADD COLUMN IF NOT EXISTS emergency_phone text,
ADD COLUMN IF NOT EXISTS emergency_country_code text,
ADD COLUMN IF NOT EXISTS emergency_relationship text,
ADD COLUMN IF NOT EXISTS emergency_email text,
ADD COLUMN IF NOT EXISTS emergency_address text,
ADD COLUMN IF NOT EXISTS travel_preferences text,
ADD COLUMN IF NOT EXISTS dietary_restrictions text,
ADD COLUMN IF NOT EXISTS medical_conditions text;

-- Add comments for documentation
COMMENT ON COLUMN public.tourists.first_name IS 'Tourist''s first name';
COMMENT ON COLUMN public.tourists.last_name IS 'Tourist''s last name';
COMMENT ON COLUMN public.tourists.phone IS 'Tourist''s main phone number';
COMMENT ON COLUMN public.tourists.country_code IS 'Country code for the tourist''s main phone number (e.g., +256)';
COMMENT ON COLUMN public.tourists.tourist_home_city IS 'Tourist''s home city';
COMMENT ON COLUMN public.tourists.tourist_home_country IS 'Tourist''s home country';
COMMENT ON COLUMN public.tourists.emergency_contact IS 'Emergency contact person''s name';
COMMENT ON COLUMN public.tourists.emergency_phone IS 'Emergency contact''s phone number';
COMMENT ON COLUMN public.tourists.emergency_country_code IS 'Country code for the emergency contact''s phone number (e.g., +256)';
COMMENT ON COLUMN public.tourists.emergency_relationship IS 'Relationship to the emergency contact';
COMMENT ON COLUMN public.tourists.emergency_email IS 'Emergency contact''s email address';
COMMENT ON COLUMN public.tourists.emergency_address IS 'Emergency contact''s address';
COMMENT ON COLUMN public.tourists.travel_preferences IS 'Tourist''s travel preferences (comma-separated or JSON)';
COMMENT ON COLUMN public.tourists.dietary_restrictions IS 'Tourist''s dietary restrictions';
COMMENT ON COLUMN public.tourists.medical_conditions IS 'Tourist''s medical conditions';