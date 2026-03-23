-- 016_storage_policies_tree_images.sql
-- Allow authenticated users to INSERT/UPDATE/DELETE objects in the 'tree-images' bucket.
-- Apply this on the Supabase project SQL editor to permit client uploads from authenticated users.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'objects' AND p.polname = 'allow_uploads_tree_images') THEN
    EXECUTE 'DROP POLICY allow_uploads_tree_images ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'objects' AND p.polname = 'allow_update_tree_images') THEN
    EXECUTE 'DROP POLICY allow_update_tree_images ON storage.objects';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'objects' AND p.polname = 'allow_delete_tree_images') THEN
    EXECUTE 'DROP POLICY allow_delete_tree_images ON storage.objects';
  END IF;
END$$;

-- Allow INSERTs for authenticated users into this bucket
CREATE POLICY allow_uploads_tree_images
  ON storage.objects
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND bucket_id = 'tree-images');

-- Allow UPDATEs for authenticated users into this bucket
CREATE POLICY allow_update_tree_images
  ON storage.objects
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND bucket_id = 'tree-images')
  WITH CHECK (auth.uid() IS NOT NULL AND bucket_id = 'tree-images');

-- Allow DELETEs for authenticated users from this bucket
CREATE POLICY allow_delete_tree_images
  ON storage.objects
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND bucket_id = 'tree-images');

-- WARNING: These policies are permissive: they allow any authenticated user to manage objects
-- in the 'tree-images' bucket. For production, restrict further (e.g., check owner claim or admin role).
