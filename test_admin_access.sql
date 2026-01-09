-- Test with a specific user ID policy
-- Replace 'your-admin-user-id-here' with the actual admin user ID

-- First, let's check what the admin user ID is
SELECT id, email FROM profiles WHERE role = 'admin';

-- Then create a policy for that specific user
-- (Run this after you get the user ID from the query above)
-- DROP POLICY IF EXISTS "Test admin access" ON service_delete_requests;
-- CREATE POLICY "Test admin access" ON service_delete_requests
--   FOR SELECT USING (auth.uid() = 'your-admin-user-id-here');