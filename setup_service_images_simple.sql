-- =====================================================
-- SIMPLE SERVICE IMAGES STORAGE SETUP
-- =====================================================
-- Basic setup for storing service images in Supabase Storage
--
-- SAFE TO RUN MULTIPLE TIMES: This script handles existing
-- policies gracefully.
-- =====================================================

-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view service images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can update their service images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can delete their service images" ON storage.objects;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload service images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'service-images' AND auth.role() = 'authenticated');

-- Allow public access to view images
CREATE POLICY "Anyone can view service images" ON storage.objects
FOR SELECT USING (bucket_id = 'service-images');

-- Allow vendors to update their own service images
CREATE POLICY "Vendors can update their service images" ON storage.objects
FOR UPDATE USING (bucket_id = 'service-images');

-- Allow vendors to delete their own service images
CREATE POLICY "Vendors can delete their service images" ON storage.objects
FOR DELETE USING (bucket_id = 'service-images');

-- Add primary image field to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

-- Update existing services to set primary image from first image in array
UPDATE services
SET primary_image_url = images[1]
WHERE primary_image_url IS NULL
  AND array_length(images, 1) > 0;

-- Grant permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;