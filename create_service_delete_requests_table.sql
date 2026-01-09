-- Create service_delete_requests table for vendor service deletion workflow
-- This table allows vendors to request service deletion which admins can approve/reject

-- Create enum type for delete request status
CREATE TYPE service_delete_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create the service_delete_requests table
CREATE TABLE IF NOT EXISTS service_delete_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status service_delete_request_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_service_id ON service_delete_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_vendor_id ON service_delete_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_status ON service_delete_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_requested_at ON service_delete_requests(requested_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_delete_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_delete_requests_updated_at
  BEFORE UPDATE ON service_delete_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_service_delete_requests_updated_at();

-- Enable Row Level Security
ALTER TABLE service_delete_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Vendors can only see their own delete requests
CREATE POLICY "Vendors can view their own delete requests" ON service_delete_requests
  FOR SELECT USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.id = service_delete_requests.vendor_id
  ));

-- Vendors can create delete requests for their own services
CREATE POLICY "Vendors can create delete requests for their services" ON service_delete_requests
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.id = service_delete_requests.vendor_id
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