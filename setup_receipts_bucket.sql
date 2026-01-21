-- Create receipts bucket for storing payment receipts
-- This bucket is used by finance team to upload payment proof

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to upload receipts (finance/admin users)
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
);

-- Allow all authenticated users to view receipts
CREATE POLICY "Authenticated users can view receipts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
);

-- Allow all authenticated users to update receipts
CREATE POLICY "Authenticated users can update receipts" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
);

-- Allow all authenticated users to delete receipts
CREATE POLICY "Authenticated users can delete receipts" ON storage.objects
FOR DELETE USING (
  bucket_id = 'receipts'
  AND auth.role() = 'authenticated'
);