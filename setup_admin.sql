-- Admin Account Setup Script
-- Run this in Supabase SQL Editor to set up the admin account

-- First, check if the user exists in auth.users
SELECT id, email, created_at, raw_user_meta_data
FROM auth.users
WHERE email = 'safaris.dirttrails@gmail.com';

-- Check if profile exists
SELECT id, email, role, created_at
FROM profiles
WHERE email = 'safaris.dirttrails@gmail.com';

-- If profile doesn't exist, create it manually
INSERT INTO profiles (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name',
  'admin'
FROM auth.users au
WHERE au.email = 'safaris.dirttrails@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = au.id
);

-- Update the profile role to admin (in case it exists but has wrong role)
UPDATE profiles
SET role = 'admin', updated_at = NOW()
WHERE email = 'safaris.dirttrails@gmail.com';

-- Verify the admin setup
SELECT
  au.email,
  p.role,
  p.created_at as profile_created,
  au.created_at as user_created
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'safaris.dirttrails@gmail.com';