-- =====================================================
-- SERVICE IMAGES STORAGE SETUP FOR SUPABASE
-- =====================================================
-- This script sets up proper image storage for services
-- using Supabase Storage buckets and database tables
--
-- SAFE TO RUN MULTIPLE TIMES: This script handles existing
-- policies, functions, and triggers gracefully.
-- =====================================================

-- =====================================================
-- 1. CREATE STORAGE BUCKET FOR SERVICE IMAGES
-- =====================================================

-- Create the storage bucket for service images
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. STORAGE POLICIES FOR SERVICE IMAGES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view service images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can update their service images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can delete their service images" ON storage.objects;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload service images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'service-images'
  AND auth.role() = 'authenticated'
);

-- Allow public access to view images
CREATE POLICY "Anyone can view service images" ON storage.objects
FOR SELECT USING (bucket_id = 'service-images');

-- Allow vendors to update their own service images
CREATE POLICY "Vendors can update their service images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'service-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow vendors to delete their own service images
CREATE POLICY "Vendors can delete their service images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'service-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 3. ENHANCED SERVICE IMAGES TABLE (OPTIONAL)
-- =====================================================
-- If you want more detailed image management, create this table
-- Otherwise, you can continue using the images TEXT[] array in services

/*
CREATE TABLE IF NOT EXISTS service_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure only one primary image per service
  UNIQUE(service_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_images_service_id ON service_images(service_id);
CREATE INDEX IF NOT EXISTS idx_service_images_is_primary ON service_images(service_id, is_primary);

-- RLS for service images
ALTER TABLE service_images ENABLE ROW LEVEL SECURITY;

-- Vendors can manage images for their services
CREATE POLICY "Vendors can manage their service images" ON service_images
FOR ALL USING (
  service_id IN (
    SELECT id FROM services WHERE vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  )
);

-- Public read access
CREATE POLICY "Anyone can view service images" ON service_images
FOR SELECT USING (true);
*/

-- =====================================================
-- 4. UPDATE SERVICES TABLE FOR BETTER IMAGE HANDLING
-- =====================================================

-- Add additional image-related fields to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS primary_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_image_upload TIMESTAMP WITH TIME ZONE;

-- Create a function to update image count when images array changes
CREATE OR REPLACE FUNCTION update_service_image_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update image count
  NEW.image_count := array_length(NEW.images, 1);

  -- Set primary image if not set and we have images
  IF NEW.primary_image_url IS NULL AND NEW.image_count > 0 THEN
    NEW.primary_image_url := NEW.images[1];
  END IF;

  -- Update last image upload timestamp
  NEW.last_image_upload := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update image count
DROP TRIGGER IF EXISTS trigger_update_service_image_count ON services;
CREATE TRIGGER trigger_update_service_image_count
  BEFORE INSERT OR UPDATE OF images ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_service_image_count();

-- =====================================================
-- 5. UTILITY FUNCTIONS FOR IMAGE MANAGEMENT
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_service_images(UUID);
DROP FUNCTION IF EXISTS add_service_image(UUID, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS remove_service_image(UUID, TEXT);
DROP FUNCTION IF EXISTS find_orphaned_images();

-- Function to get all images for a service
CREATE OR REPLACE FUNCTION get_service_images(service_uuid UUID)
RETURNS TABLE (
  image_url TEXT,
  alt_text TEXT,
  display_order INTEGER,
  is_primary BOOLEAN
) AS $$
BEGIN
  -- If using the enhanced service_images table, uncomment this:
  /*
  RETURN QUERY
  SELECT si.image_url, si.alt_text, si.display_order, si.is_primary
  FROM service_images si
  WHERE si.service_id = service_uuid
  ORDER BY si.display_order, si.created_at;
  */

  -- If using the simple array approach, return from services table
  RETURN QUERY
  SELECT
    unnest(s.images) as image_url,
    ''::TEXT as alt_text,
    generate_subscripts(s.images, 1) as display_order,
    CASE WHEN generate_subscripts(s.images, 1) = 1 THEN true ELSE false END as is_primary
  FROM services s
  WHERE s.id = service_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to add an image to a service
CREATE OR REPLACE FUNCTION add_service_image(
  service_uuid UUID,
  image_url TEXT,
  alt_text TEXT DEFAULT '',
  is_primary BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  current_images TEXT[];
BEGIN
  -- Get current images
  SELECT images INTO current_images FROM services WHERE id = service_uuid;

  -- Add new image to array
  current_images := array_append(current_images, image_url);

  -- Update the service
  UPDATE services
  SET images = current_images,
      primary_image_url = CASE WHEN is_primary THEN image_url ELSE primary_image_url END
  WHERE id = service_uuid;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to remove an image from a service
CREATE OR REPLACE FUNCTION remove_service_image(
  service_uuid UUID,
  image_url TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_images TEXT[];
BEGIN
  -- Get current images
  SELECT images INTO current_images FROM services WHERE id = service_uuid;

  -- Remove the image from array
  current_images := array_remove(current_images, image_url);

  -- Update the service
  UPDATE services
  SET images = current_images,
      primary_image_url = CASE WHEN primary_image_url = image_url THEN NULL ELSE primary_image_url END
  WHERE id = service_uuid;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CLEANUP POLICIES FOR ORPHANED IMAGES
-- =====================================================

-- Function to find orphaned images (images not referenced by any service)
CREATE OR REPLACE FUNCTION find_orphaned_images()
RETURNS TABLE (image_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT obj.name
  FROM storage.objects obj
  WHERE obj.bucket_id = 'service-images'
    AND obj.name NOT IN (
      SELECT unnest(s.images)
      FROM services s
      WHERE s.images IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. MIGRATION HELPERS
-- =====================================================

-- If you have existing image URLs in the images array, this will update the primary_image_url
UPDATE services
SET primary_image_url = images[1]
WHERE primary_image_url IS NULL
  AND array_length(images, 1) > 0;

-- Update image counts for existing services
UPDATE services
SET image_count = array_length(images, 1)
WHERE image_count IS NULL OR image_count = 0;

-- =====================================================
-- 8. USAGE EXAMPLES
-- =====================================================

/*
-- Example: Add an image to a service
SELECT add_service_image(
  'your-service-uuid'::UUID,
  'https://your-supabase-url.storage.supabase.co/storage/v1/object/service-images/vendor-id/service-image.jpg',
  'Beautiful hotel room',
  true
);

-- Example: Get all images for a service
SELECT * FROM get_service_images('your-service-uuid'::UUID);

-- Example: Remove an image from a service
SELECT remove_service_image(
  'your-service-uuid'::UUID,
  'https://your-supabase-url.storage.supabase.co/storage/v1/object/service-images/vendor-id/service-image.jpg'
);

-- Example: Find orphaned images
SELECT * FROM find_orphaned_images();
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'Service images storage setup completed successfully!';
  RAISE NOTICE 'Storage bucket "service-images" created with public access.';
  RAISE NOTICE 'Utility functions for image management are available.';
END $$;