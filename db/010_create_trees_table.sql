-- 010_create_trees_table.sql
-- Create trees table to store geotagged trees and images

-- Ensure uuid generation function exists (pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  planted_by text,
  planted_on timestamptz,
  images jsonb DEFAULT '[]'::jsonb,
  approved boolean DEFAULT false,
  added_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Simple index on coordinates for queries (lat/lng range queries can still use it)
CREATE INDEX IF NOT EXISTS idx_trees_lat_lng ON trees (latitude, longitude);
