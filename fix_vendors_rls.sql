-- Fix RLS policies for vendors table
-- This migration creates proper RLS policies for the vendors table

-- Enable RLS on vendors table (if not already enabled)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all vendor records" ON vendors;
DROP POLICY IF EXISTS "Authenticated users can view vendor records" ON vendors;
DROP POLICY IF EXISTS "Users can insert their own vendor records" ON vendors;
DROP POLICY IF EXISTS "Users can update their own vendor records" ON vendors;
DROP POLICY IF EXISTS "Users can view their own vendor records" ON vendors;

-- Create policy for users to view their own vendor records
CREATE POLICY "Users can view their own vendor records" ON vendors
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own vendor records
CREATE POLICY "Users can insert their own vendor records" ON vendors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own vendor records
CREATE POLICY "Users can update their own vendor records" ON vendors
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for admins to manage all vendor records
CREATE POLICY "Admins can manage all vendor records" ON vendors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Also create policies for profiles table to ensure they work properly
-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );