-- Try this simpler policy that should work
-- Replace the complex admin policy with something simpler

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can view all delete requests" ON service_delete_requests;
DROP POLICY IF EXISTS "Admins can update delete requests" ON service_delete_requests;

-- Create a simple policy that allows all authenticated users to see all requests
-- This will help us test if the issue is with the policy logic
CREATE POLICY "Temp: All authenticated users can view delete requests" ON service_delete_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Temp: All authenticated users can update delete requests" ON service_delete_requests
  FOR UPDATE USING (auth.uid() IS NOT NULL);