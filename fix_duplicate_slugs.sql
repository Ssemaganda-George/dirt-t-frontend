-- Fix duplicate slugs migration
-- Run this if the previous migration failed with duplicate key errors

-- First, clear any existing slugs that might be malformed
UPDATE services SET slug = NULL WHERE slug LIKE '%-%' AND slug ~ '^[a-z0-9-]+-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$';

-- Now generate proper slugs for existing services using their title
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

-- Handle any remaining duplicates by appending numbers
UPDATE services
SET slug = slug || '-' || ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id)
WHERE id IN (
  SELECT DISTINCT s1.id
  FROM services s1
  JOIN services s2 ON s1.slug = s2.slug AND s1.id > s2.id
);

-- Ensure all services have slugs
ALTER TABLE services ALTER COLUMN slug SET NOT NULL;