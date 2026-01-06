-- Check and create admin profile directly
-- Run this in Supabase SQL Editor

-- First, check if the user exists
SELECT id, email, created_at FROM auth.users WHERE email = 'safaris.dirttrails@gmail.com';

-- Check if profile exists
SELECT * FROM profiles WHERE email = 'safaris.dirttrails@gmail.com';

-- If profile doesn't exist, create it with the correct user ID
-- Replace 'your-user-id-here' with the actual user ID from the first query
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  '3366868a-de9e-47e0-ab1e-c71142c1ec88', -- This is the correct user ID
  'safaris.dirttrails@gmail.com',
  'Dirt Trails Admin',
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Verify the profile was created
SELECT * FROM profiles WHERE id = '3366868a-de9e-47e0-ab1e-c71142c1ec88';