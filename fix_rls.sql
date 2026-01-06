-- Fix RLS Policies for profiles table
-- The current admin policy causes infinite recursion

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Keep only the basic policies: users can view/update their own profile
-- Admins can manage other tables (vendors, services) but not necessarily all profiles

-- Verify current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';