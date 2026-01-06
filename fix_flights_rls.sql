-- Fix RLS policies for flights table to allow public read access for active flights
-- while restricting write access to admins only

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage all flights" ON flights;

-- Allow anyone to read active flights
CREATE POLICY "Anyone can view active flights" ON flights
  FOR SELECT USING (status = 'active');

-- Admins can manage all flights (insert, update, delete)
CREATE POLICY "Admins can manage all flights" ON flights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );