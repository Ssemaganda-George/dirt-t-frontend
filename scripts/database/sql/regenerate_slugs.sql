-- Regenerate all slugs (run this if you want to clean up existing slugs)
-- This will regenerate slugs for ALL services based on their titles

-- Clear existing slugs
UPDATE services SET slug = NULL;

-- Generate new slugs using the same logic as the migration
WITH slug_counts AS (
  SELECT
    id,
    LOWER(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '&', 'and'), '''', '')) as base_slug,
    ROW_NUMBER() OVER (PARTITION BY LOWER(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '&', 'and'), '''', '')) ORDER BY id) as rn
  FROM services
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