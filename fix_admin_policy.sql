-- Fix the admin policy by making it more direct
-- Drop the existing admin policies
DROP POLICY IF EXISTS "Admins can view all delete requests" ON service_delete_requests;
DROP POLICY IF EXISTS "Admins can update delete requests" ON service_delete_requests;

-- Create a simpler admin policy that checks the role directly
CREATE POLICY "Admins can view all delete requests" ON service_delete_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update delete requests" ON service_delete_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );