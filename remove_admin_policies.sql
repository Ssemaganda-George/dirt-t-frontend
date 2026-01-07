-- Remove problematic admin policies to restore access
-- Run this in Supabase SQL Editor

-- Drop the admin policies that are causing access issues
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Check remaining policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Now you should be able to access the admin pages again
-- After that, you can set yourself as admin using the check_admin_profile.sql script