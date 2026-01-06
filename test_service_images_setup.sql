-- =====================================================
-- TEST SERVICE IMAGES SETUP
-- =====================================================
-- Run these queries to verify the image storage setup worked

-- 1. Check if bucket was created
SELECT id, name, public FROM storage.buckets WHERE id = 'service-images';

-- 2. Check if policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%service images%';

-- 3. Check if new columns were added to services table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'services'
  AND column_name IN ('primary_image_url', 'image_count', 'last_image_upload')
ORDER BY column_name;

-- 4. Check if trigger was created
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_service_image_count';

-- 5. Check if functions were created (comprehensive version only)
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('get_service_images', 'add_service_image', 'remove_service_image', 'find_orphaned_images')
  AND routine_schema = 'public';

-- 6. Test the setup with a sample service (replace with actual service ID)
-- SELECT * FROM get_service_images('your-service-uuid-here'::UUID);