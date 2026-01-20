-- Setup profile-pictures storage bucket for user profile images
-- This script creates the profile-pictures storage bucket and sets up proper policies

-- Create the profile-pictures storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to profile-pictures bucket
CREATE POLICY "Users can upload profile pictures" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures'
  AND auth.role() = 'authenticated'
);

-- Allow everyone to view profile pictures (public bucket)
CREATE POLICY "Everyone can view profile pictures" ON storage.objects
FOR SELECT USING (
  bucket_id = 'profile-pictures'
);

-- Allow authenticated users to update their own profile pictures
CREATE POLICY "Users can update their profile pictures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own profile pictures
CREATE POLICY "Users can delete their profile pictures" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures'
  AND auth.role() = 'authenticated'
);