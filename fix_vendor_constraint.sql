-- Fix the vendors table to add unique constraint on user_id
-- Run this in your Supabase SQL Editor

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

-- Now create the vendor record for your admin user
INSERT INTO vendors (user_id, business_name, business_description, business_email, status)
VALUES (
  'ec44869b-4696-42cd-a945-98af2ae2c766',
  'Dirt Trails Safaris',
  'Professional safari and tour services in Uganda',
  'safaris.dirttrails@gmail.com',
  'approved'
) ON CONFLICT (user_id) DO NOTHING;

-- Verify the vendor was created
SELECT * FROM vendors WHERE user_id = 'ec44869b-4696-42cd-a945-98af2ae2c766';