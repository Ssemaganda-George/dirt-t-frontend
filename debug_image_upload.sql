-- =====================================================
-- DEBUG SERVICE IMAGE UPLOAD ISSUES
-- =====================================================
-- Run these queries to troubleshoot image upload problems

-- 1. Check if you're authenticated
SELECT auth.uid() as current_user_id;

-- 2. Check if you have a vendor profile
SELECT v.id as vendor_id, v.business_name, v.status, p.email
FROM vendors v
JOIN profiles p ON v.user_id = p.id
WHERE v.user_id = auth.uid();

-- 3. Check your services (replace with actual service ID if known)
SELECT s.id, s.title, s.vendor_id, s.images, s.status
FROM services s
WHERE s.vendor_id IN (
  SELECT id FROM vendors WHERE user_id = auth.uid()
)
LIMIT 5;

-- 4. Test direct service update (replace 'your-service-id' with actual ID)
-- This should work if you own the service
/*
UPDATE services
SET images = array_append(images, 'https://example.com/test-image.jpg'),
    primary_image_url = 'https://example.com/test-image.jpg',
    updated_at = NOW()
WHERE id = 'your-service-id'
  AND vendor_id IN (
    SELECT id FROM vendors WHERE user_id = auth.uid()
  );
*/

-- 5. Check RLS policies on services table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'services'
ORDER BY policyname;

-- 6. Test service access (replace 'your-service-id' with actual ID)
-- This should return data if you have access
/*
SELECT id, title, vendor_id, images
FROM services
WHERE id = 'your-service-id';
*/

-- 7. Check storage bucket permissions
SELECT id, name, public
FROM storage.buckets
WHERE id = 'service-images';

-- 8. Check storage policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;