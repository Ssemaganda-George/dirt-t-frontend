-- Service Delete Requests Table
-- This table manages vendor requests to delete approved services
-- Admin approval is required before services can be deleted

CREATE TABLE IF NOT EXISTS service_delete_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_service_id ON service_delete_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_vendor_id ON service_delete_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_service_delete_requests_status ON service_delete_requests(status);

-- RLS Policies for service_delete_requests
ALTER TABLE service_delete_requests ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own delete requests
CREATE POLICY "Vendors can view their own delete requests" ON service_delete_requests
  FOR SELECT USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vendors can insert their own delete requests
CREATE POLICY "Vendors can insert their own delete requests" ON service_delete_requests
  FOR INSERT WITH CHECK (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vendors can update their own pending delete requests (to change reason)
CREATE POLICY "Vendors can update their own pending delete requests" ON service_delete_requests
  FOR UPDATE USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    ) AND status = 'pending'
  );

-- Admins can view all delete requests
CREATE POLICY "Admins can view all delete requests" ON service_delete_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update all delete requests (approve/reject)
CREATE POLICY "Admins can update all delete requests" ON service_delete_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to automatically delete service when delete request is approved
CREATE OR REPLACE FUNCTION delete_service_on_approved_request()
RETURNS TRIGGER AS $$
BEGIN
  -- If the delete request status changed to 'approved', delete the service
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    DELETE FROM services WHERE id = NEW.service_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically delete service when request is approved
DROP TRIGGER IF EXISTS trigger_delete_service_on_approved_request ON service_delete_requests;
CREATE TRIGGER trigger_delete_service_on_approved_request
  AFTER UPDATE ON service_delete_requests
  FOR EACH ROW
  EXECUTE FUNCTION delete_service_on_approved_request();

-- Prevent multiple pending delete requests for the same service
CREATE OR REPLACE FUNCTION prevent_multiple_pending_delete_requests()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already a pending delete request for this service
  IF EXISTS (
    SELECT 1 FROM service_delete_requests
    WHERE service_id = NEW.service_id
    AND status = 'pending'
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'A pending delete request already exists for this service';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent multiple pending delete requests
DROP TRIGGER IF EXISTS trigger_prevent_multiple_pending_delete_requests ON service_delete_requests;
CREATE TRIGGER trigger_prevent_multiple_pending_delete_requests
  BEFORE INSERT OR UPDATE ON service_delete_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_multiple_pending_delete_requests();