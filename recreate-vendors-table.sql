-- Recreate Vendors Table and Policies for Dirt Trails
-- Run this SQL in your Supabase SQL Editor to recreate the vendors table

-- Step 1: Drop existing vendors table and related objects (if they exist)
DROP TABLE IF EXISTS vendors CASCADE;

-- Step 2: Create the vendors table
CREATE TABLE vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  business_description TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT NOT NULL,
  business_license TEXT,
  tax_id TEXT,
  status vendor_status DEFAULT 'pending'::vendor_status NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Step 3: Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies

-- Policy: Vendors can view their own vendor profile
CREATE POLICY "Vendors can view their own vendor profile" ON vendors
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Vendors can update their own vendor profile
CREATE POLICY "Vendors can update their own vendor profile" ON vendors
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Vendors can insert their own vendor profile
CREATE POLICY "Vendors can insert their own vendor profile" ON vendors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all vendors
CREATE POLICY "Admins can view all vendors" ON vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
    )
  );

-- Policy: Admins can update all vendors
CREATE POLICY "Admins can update all vendors" ON vendors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
    )
  );

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON vendors(created_at);

-- Step 6: Grant necessary permissions
GRANT ALL ON vendors TO authenticated;
GRANT ALL ON vendors TO service_role;

-- Verification queries (optional - uncomment to run)
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'vendors';
-- SELECT * FROM pg_policies WHERE tablename = 'vendors';