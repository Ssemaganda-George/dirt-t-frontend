-- Add missing RLS policies for service_delete_requests table
-- This ensures admins can view and manage all delete requests

-- Enable Row Level Security (if not already enabled)
ALTER TABLE service_delete_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendors can view their own delete requests" ON service_delete_requests;
DROP POLICY IF EXISTS "Vendors can create delete requests for their services" ON service_delete_requests;
DROP POLICY IF EXISTS "Admins can view all delete requests" ON service_delete_requests;
DROP POLICY IF EXISTS "Admins can update delete requests" ON service_delete_requests;

-- Create RLS policies
-- Vendors can only see their own delete requests
CREATE POLICY "Vendors can view their own delete requests" ON service_delete_requests
  FOR SELECT USING (auth.uid() IN (
    SELECT v.user_id FROM vendors v WHERE v.id = service_delete_requests.vendor_id
  ));

-- Vendors can create delete requests for their own services
CREATE POLICY "Vendors can create delete requests for their services" ON service_delete_requests
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT v.user_id FROM vendors v WHERE v.id = service_delete_requests.vendor_id
  ));

-- Admins can view all delete requests
CREATE POLICY "Admins can view all delete requests" ON service_delete_requests
  FOR SELECT USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));

-- Admins can update delete request status
CREATE POLICY "Admins can update delete requests" ON service_delete_requests
  FOR UPDATE USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));

-- Grant necessary permissions
GRANT SELECT, INSERT ON service_delete_requests TO authenticated;
GRANT UPDATE ON service_delete_requests TO authenticated;

-- Add RLS policies for services table to allow admin deletion
-- Enable Row Level Security on services table (if not already enabled)
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendors can view their own services" ON services;
DROP POLICY IF EXISTS "Vendors can update their own services" ON services;
DROP POLICY IF EXISTS "Vendors can delete their own services" ON services;
DROP POLICY IF EXISTS "Admins can view all services" ON services;
DROP POLICY IF EXISTS "Admins can update all services" ON services;
DROP POLICY IF EXISTS "Admins can delete all services" ON services;
DROP POLICY IF EXISTS "Public can view approved services" ON services;

-- Create RLS policies for services table
-- Vendors can view their own services
CREATE POLICY "Vendors can view their own services" ON services
  FOR SELECT USING (auth.uid() IN (
    SELECT v.user_id FROM vendors v WHERE v.id = services.vendor_id
  ));

-- Vendors can insert their own services
CREATE POLICY "Vendors can insert their own services" ON services
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT v.user_id FROM vendors v WHERE v.id = services.vendor_id
  ));

-- Vendors can update their own services
CREATE POLICY "Vendors can update their own services" ON services
  FOR UPDATE USING (auth.uid() IN (
    SELECT v.user_id FROM vendors v WHERE v.id = services.vendor_id
  ));

-- Vendors can delete their own services
CREATE POLICY "Vendors can delete their own services" ON services
  FOR DELETE USING (auth.uid() IN (
    SELECT v.user_id FROM vendors v WHERE v.id = services.vendor_id
  ));

-- Admins can view all services
CREATE POLICY "Admins can view all services" ON services
  FOR SELECT USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));

-- Admins can update all services
CREATE POLICY "Admins can update all services" ON services
  FOR UPDATE USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));

-- Admins can delete all services
CREATE POLICY "Admins can delete all services" ON services
  FOR DELETE USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));

-- Public can view approved services (for tourists)
CREATE POLICY "Public can view approved services" ON services
  FOR SELECT USING (status = 'approved');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO authenticated;