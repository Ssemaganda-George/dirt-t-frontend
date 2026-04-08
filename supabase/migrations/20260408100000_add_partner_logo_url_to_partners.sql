-- Add logo URL to partners table so admin partner records can store a logo image link.
ALTER TABLE IF EXISTS partners
ADD COLUMN IF NOT EXISTS logo_url text;
