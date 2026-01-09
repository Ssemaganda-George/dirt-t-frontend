-- Set up Row Level Security policies for vendors table
-- This ensures vendors can read their own records

-- Enable RLS on vendors table
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendors can view their own records" ON vendors;
DROP POLICY IF EXISTS "Vendors can update their own records" ON vendors;
DROP POLICY IF EXISTS "Admins can view all vendor records" ON vendors;
DROP POLICY IF EXISTS "Admins can update all vendor records" ON vendors;

-- Policy: Vendors can view their own records
CREATE POLICY "Vendors can view their own records" ON vendors
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Vendors can update their own records
CREATE POLICY "Vendors can update their own records" ON vendors
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Admins can view all vendor records
CREATE POLICY "Admins can view all vendor records" ON vendors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can update all vendor records
CREATE POLICY "Admins can update all vendor records" ON vendors
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Allow insert for authenticated users (for vendor registration)
CREATE POLICY "Allow vendor creation" ON vendors
    FOR INSERT WITH CHECK (auth.uid() = user_id);