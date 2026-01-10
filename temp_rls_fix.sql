-- Temporarily allow authenticated users to view vendors
DROP POLICY IF EXISTS "Admins can view all vendor records" ON vendors;

CREATE POLICY "Authenticated users can view vendor records" ON vendors
    FOR SELECT USING (auth.role() = 'authenticated');
