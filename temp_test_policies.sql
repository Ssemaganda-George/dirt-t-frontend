-- Temporary test: Allow all authenticated users to see all delete requests
-- Run this in Supabase SQL Editor to test if the issue is with the admin policy

-- Drop the admin policy
DROP POLICY IF EXISTS "Admins can view all delete requests" ON service_delete_requests;

-- Create a temporary policy that allows all authenticated users to see all requests
CREATE POLICY "Temp: All authenticated users can view all delete requests" ON service_delete_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Also allow updates for testing
DROP POLICY IF EXISTS "Admins can update delete requests" ON service_delete_requests;
CREATE POLICY "Temp: All authenticated users can update delete requests" ON service_delete_requests
  FOR UPDATE USING (auth.uid() IS NOT NULL);