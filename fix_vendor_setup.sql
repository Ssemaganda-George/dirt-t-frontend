-- Add missing INSERT policies for vendors table
-- Run this in your Supabase SQL Editor

-- Allow vendors to insert their own record
CREATE POLICY "Vendors can insert their own record" ON vendors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to insert vendor records
CREATE POLICY "Admins can insert vendors" ON vendors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendors_user_id_key'
  ) THEN
    ALTER TABLE vendors ADD CONSTRAINT vendors_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Now create the vendor record for the admin user
INSERT INTO vendors (user_id, business_name, business_description, business_email, status)
VALUES (
  '3366868a-de9e-47e0-ab1e-c71142c1ec88',
  'Dirt Trails Safaris',
  'Professional safari and tour services in Uganda',
  'safaris.dirttrails@gmail.com',
  'approved'
) ON CONFLICT (user_id) DO NOTHING;

-- Verify the vendor was created
SELECT * FROM vendors WHERE user_id = '3366868a-de9e-47e0-ab1e-c71142c1ec88';