-- Temporarily disable RLS for testing
ALTER TABLE service_delete_requests DISABLE ROW LEVEL SECURITY;

-- Now test if the admin can see the data
-- If they can, then re-enable RLS and fix the policies

-- To re-enable RLS later:
-- ALTER TABLE service_delete_requests ENABLE ROW LEVEL SECURITY;