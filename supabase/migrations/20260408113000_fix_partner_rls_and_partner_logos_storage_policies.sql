-- Fix partners row-level security for admin users and allow authenticated uploads to the partner-logos bucket.

-- Allow admins to manage partners using profile role rather than JWT role claim.
DROP POLICY IF EXISTS "Allow admins to manage partners" ON public.partners;
CREATE POLICY "Allow admins to manage partners" ON public.partners FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- Add storage policies for the partner-logos bucket so authenticated users can upload and manage partner logo objects.
DROP POLICY IF EXISTS "Users can upload partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete partner logos" ON storage.objects;

CREATE POLICY "Users can upload partner logos" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'partner-logos'::text
  AND auth.role() = 'authenticated'::text
);

CREATE POLICY "Anyone can view partner logos" ON storage.objects FOR SELECT
USING (
  bucket_id = 'partner-logos'::text
);

CREATE POLICY "Users can update partner logos" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'partner-logos'::text
  AND auth.role() = 'authenticated'::text
);

CREATE POLICY "Users can delete partner logos" ON storage.objects FOR DELETE
USING (
  bucket_id = 'partner-logos'::text
  AND auth.role() = 'authenticated'::text
);
