-- Migration: Add custom fields support to services table
-- This allows vendors to add their own custom fields without schema migrations

-- Add JSONB column for custom fields
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_services_custom_fields 
ON public.services USING GIN (custom_fields);

-- Add comment for documentation
COMMENT ON COLUMN public.services.custom_fields IS 'User-defined custom fields stored as JSONB. Allows vendors to add fields like difficulty_level, min_age, etc. without schema changes.';

-- Example queries:
-- Find services by custom field value:
--   SELECT * FROM services WHERE custom_fields->>'difficulty_level' = 'moderate';
-- Find services with numeric custom field:
--   SELECT * FROM services WHERE (custom_fields->>'min_age')::int >= 18;
-- Check if custom field exists:
--   SELECT * FROM services WHERE custom_fields ? 'equipment_provided';
