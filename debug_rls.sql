-- Debug the RLS policies issue
-- Let's check what's happening with the policies

-- First, let's see what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'service_delete_requests';

-- Then let's test the admin policy logic manually
-- Check if the admin user exists and has the right role
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- Check what auth.uid() would return for the admin user
-- (This would be the user ID when logged in)