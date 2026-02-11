-- Create scan_sessions table to track temporary event scanning access
CREATE TABLE IF NOT EXISTS scan_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_hours INTEGER NOT NULL CHECK (duration_hours > 0 AND duration_hours <= 24),
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_scan_sessions_service_id ON scan_sessions(service_id);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_status_end_time ON scan_sessions(status, end_time);

-- Add RLS policies
ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage all scan sessions
CREATE POLICY "Admins can manage all scan sessions" ON scan_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow vendors to view scan sessions for their own services
CREATE POLICY "Vendors can view their service scan sessions" ON scan_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM services s
      JOIN vendors v ON s.vendor_id = v.id
      WHERE s.id = scan_sessions.service_id
      AND v.user_id = auth.uid()
    )
  );

-- Allow anyone to check for active scan sessions on scan-enabled services
CREATE POLICY "Anyone can check active scan sessions for scan-enabled services" ON scan_sessions
  FOR SELECT USING (
    status = 'active' AND
    EXISTS (
      SELECT 1 FROM services s
      WHERE s.id = scan_sessions.service_id
      AND s.scan_enabled = true
    )
  );

-- Function to automatically expire sessions
CREATE OR REPLACE FUNCTION expire_scan_sessions()
RETURNS void AS $$
BEGIN
  UPDATE scan_sessions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND end_time < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the expiration function periodically
-- This would typically be called by a cron job or scheduled function