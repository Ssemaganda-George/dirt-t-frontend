-- 011_migrate_hardcoded_trees.sql
-- Add external_id column and insert hardcoded trees from the frontend

-- Add an external_id column to preserve existing tracking IDs from the codebase
ALTER TABLE IF EXISTS trees
ADD COLUMN IF NOT EXISTS external_id text;

-- Insert the hardcoded trees (use generated UUIDs for the primary key)
INSERT INTO trees (id, external_id, species, latitude, longitude, planted_by, planted_on, images, approved, added_by, created_at)
VALUES
  (gen_random_uuid(), 'TREE-004', 'Markhamia lutea', 0.34760, 32.58250, 'DirtTrails Community', '2025-09-25'::timestamptz, '[]'::jsonb, false, NULL, now()),
  (gen_random_uuid(), 'TREE-003', 'Markhamia lutea', 0.34760, 32.58250, 'DirtTrails Community', '2025-09-25'::timestamptz, '[]'::jsonb, false, NULL, now()),
  (gen_random_uuid(), 'TREE-002', 'Ficus natalensis', 0.55800, 32.45970, 'MIICHub', '2025-09-25'::timestamptz, '[]'::jsonb, false, NULL, now()),
  (gen_random_uuid(), 'TREE-001', 'Prunus africana', 1.37330, 32.29030, 'Uganda Wildlife Authority', '2025-09-25'::timestamptz, '[]'::jsonb, false, NULL, now()),
  (gen_random_uuid(), 'TREE-000', 'Ashoka', 0.32032, 32.47574, 'George, Angel, Sharon, Twine', '2025-09-25'::timestamptz, '[]'::jsonb, false, NULL, now())
ON CONFLICT DO NOTHING;

-- Quick verification query
-- SELECT id, external_id, species, latitude, longitude, planted_by, planted_on, images, approved FROM trees ORDER BY created_at DESC LIMIT 10;
