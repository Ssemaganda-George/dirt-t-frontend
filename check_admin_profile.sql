-- Quick fix for admin access
-- Run this in Supabase SQL Editor

-- Step 1: Check current auth users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Step 2: Check current profiles
SELECT id, email, full_name, role FROM profiles;

-- Step 3: Make the most recent user an admin (replace with your user ID if needed)
-- UPDATE profiles SET role = 'admin' WHERE id = (
--   SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1
-- );

-- Or manually set a specific user as admin (replace 'your-user-id-here' with actual ID):
-- UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id-here';

-- Alternative: Insert admin profile if it doesn't exist
-- INSERT INTO profiles (id, email, full_name, role)
-- SELECT id, email, 'Admin User', 'admin'
-- FROM auth.users
-- WHERE id NOT IN (SELECT id FROM profiles)
-- LIMIT 1;

-- After running the UPDATE, check that it worked:
-- SELECT id, email, role FROM profiles WHERE role = 'admin';