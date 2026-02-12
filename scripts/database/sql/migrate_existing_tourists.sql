-- Migrate existing tourist profiles to tourists table
-- This will create tourist records for users who have role='tourist' in profiles but no record in tourists

-- First, ensure first_name and last_name columns exist in profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Update existing profiles to split full_name into first_name and last_name
UPDATE public.profiles
SET
  first_name = CASE
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      split_part(trim(full_name), ' ', 1)
    ELSE NULL
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      CASE
        WHEN array_length(string_to_array(trim(full_name), ' '), 1) > 1 THEN
          trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1))
        ELSE ''
      END
    ELSE NULL
  END
WHERE (first_name IS NULL OR last_name IS NULL)
  AND full_name IS NOT NULL;

-- Now insert tourist records
INSERT INTO public.tourists (
  user_id,
  first_name,
  last_name,
  tourist_home_city,
  tourist_home_country,
  created_at,
  updated_at
)
SELECT
  p.id,
  COALESCE(p.first_name, split_part(trim(p.full_name), ' ', 1), 'Unknown'),
  COALESCE(p.last_name,
    CASE
      WHEN array_length(string_to_array(trim(p.full_name), ' '), 1) > 1 THEN
        trim(substring(trim(p.full_name) from position(' ' in trim(p.full_name)) + 1))
      ELSE ''
    END,
    'Unknown'
  ),
  p.home_city,
  p.home_country,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.tourists t ON p.id = t.user_id
WHERE p.role = 'tourist'
  AND t.user_id IS NULL;

-- Show results
SELECT 'Migration completed. Records created:' as message, COUNT(*) as count
FROM public.tourists t
JOIN public.profiles p ON t.user_id = p.id
WHERE p.role = 'tourist';