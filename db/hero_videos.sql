
-- Create table for hero media (images/videos) with type, order, and active status
CREATE TABLE IF NOT EXISTS hero_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  type text CHECK (type IN ('image', 'video')) NOT NULL,
  "order" integer DEFAULT 1,
  is_active boolean DEFAULT false,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES profiles(id)
);

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_hero_videos_active ON hero_videos(is_active);
CREATE INDEX IF NOT EXISTS idx_hero_videos_order ON hero_videos("order");
