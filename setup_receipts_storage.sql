-- Setup receipts storage bucket for finance management
-- This script creates the receipts storage bucket and sets up proper policies

-- Create the receipts storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to receipts bucket
CREATE POLICY "Users can upload receipt files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to view receipt files
CREATE POLICY "Users can view receipt files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update receipt files (for their own uploads)
CREATE POLICY "Users can update receipt files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete receipt files (for their own uploads)
CREATE POLICY "Users can delete receipt files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
);