-- Add slug column to services table for SEO-friendly URLs
-- This migration adds a slug column and generates slugs for existing services

-- Add the slug column (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'slug') THEN
    ALTER TABLE services ADD COLUMN slug TEXT;
  END IF;
END $$;

-- Create unique index on slug (only if it doesn't exist)
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_slug ON services(slug);

-- Generate slugs for existing services using their title
-- Create unique slugs by checking for duplicates and appending numbers only when needed
WITH slug_counts AS (
  SELECT
    id,
    LOWER(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '&', 'and'), '''', '')) as base_slug,
    ROW_NUMBER() OVER (PARTITION BY LOWER(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '&', 'and'), '''', '')) ORDER BY id) as rn
  FROM services
  WHERE slug IS NULL
),
unique_slugs AS (
  SELECT
    id,
    CASE
      WHEN rn = 1 THEN base_slug
      ELSE base_slug || '-' || rn
    END as slug
  FROM slug_counts
)
UPDATE services
SET slug = unique_slugs.slug
FROM unique_slugs
WHERE services.id = unique_slugs.id;

-- Make slug NOT NULL after populating existing data
ALTER TABLE services ALTER COLUMN slug SET NOT NULL;

-- Add a trigger to automatically generate slugs for new services
CREATE OR REPLACE FUNCTION generate_service_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate slug from title if not provided
  IF NEW.slug IS NULL AND NEW.title IS NOT NULL THEN
    base_slug := LOWER(REPLACE(REPLACE(REPLACE(NEW.title, ' ', '-'), '&', 'and'), '''', ''));
    final_slug := base_slug;
  ELSE
    -- If slug is already provided, use it as base
    final_slug := COALESCE(NEW.slug, NEW.id::TEXT);
    base_slug := final_slug;
  END IF;

  -- Ensure uniqueness by appending a number if there's a conflict
  WHILE EXISTS (SELECT 1 FROM services WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_generate_service_slug ON services;
CREATE TRIGGER trigger_generate_service_slug
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION generate_service_slug();