-- Create service_delete_requests table for handling service deletion requests
CREATE TABLE IF NOT EXISTS service_delete_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL REFERENCES auth.users(id),
  admin_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_service_id ON service_delete_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_vendor_id ON service_delete_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_status ON service_delete_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_requested_at ON service_delete_requests(requested_at);

-- Add RLS policies
ALTER TABLE service_delete_requests ENABLE ROW LEVEL SECURITY;

-- Allow vendors to view their own delete requests
CREATE POLICY "Vendors can view their own delete requests" ON service_delete_requests
  FOR SELECT USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Allow vendors to create delete requests for their own services
CREATE POLICY "Vendors can create delete requests for their services" ON service_delete_requests
  FOR INSERT WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Allow admins to view all delete requests
CREATE POLICY "Admins can view all delete requests" ON service_delete_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update delete request status
CREATE POLICY "Admins can update delete request status" ON service_delete_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to delete delete requests
CREATE POLICY "Admins can delete delete requests" ON service_delete_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_delete_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_service_delete_request_updated_at
  BEFORE UPDATE ON service_delete_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_service_delete_request_updated_at();