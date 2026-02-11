-- Fix RLS policies for tourists table
-- This migration creates proper RLS policies for the tourists table

-- Enable RLS on tourists table (if not already enabled)
ALTER TABLE tourists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tourist records" ON tourists;
DROP POLICY IF EXISTS "Users can insert their own tourist records" ON tourists;
DROP POLICY IF EXISTS "Users can update their own tourist records" ON tourists;
DROP POLICY IF EXISTS "Admins can manage all tourist records" ON tourists;

-- Create policy for users to view their own tourist records
CREATE POLICY "Users can view their own tourist records" ON tourists
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own tourist records
CREATE POLICY "Users can insert their own tourist records" ON tourists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own tourist records
CREATE POLICY "Users can update their own tourist records" ON tourists
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy for admins to manage all tourist records
CREATE POLICY "Admins can manage all tourist records" ON tourists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );