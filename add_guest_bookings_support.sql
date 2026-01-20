-- Add support for guest bookings in Dirt Trails
-- This migration allows tourists to book services without creating accounts

-- Modify bookings table to support guest bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS is_guest_booking BOOLEAN DEFAULT FALSE;

-- Make tourist_id nullable for guest bookings
ALTER TABLE bookings
ALTER COLUMN tourist_id DROP NOT NULL;

-- Add check constraint to ensure either tourist_id is provided or guest info is complete
ALTER TABLE bookings
ADD CONSTRAINT guest_booking_check
CHECK (
  (tourist_id IS NOT NULL AND is_guest_booking = FALSE) OR
  (tourist_id IS NULL AND is_guest_booking = TRUE AND guest_name IS NOT NULL AND guest_email IS NOT NULL AND guest_phone IS NOT NULL)
);

-- Create index for guest bookings
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email ON bookings(guest_email) WHERE is_guest_booking = TRUE;
CREATE INDEX IF NOT EXISTS idx_bookings_is_guest_booking ON bookings(is_guest_booking);

-- Update RLS policies to handle guest bookings
DROP POLICY IF EXISTS "Allow all operations for testing" ON bookings;

-- Policy for authenticated users (tourists) - can view/modify their own bookings
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (
    auth.uid()::text = tourist_id OR
    (is_guest_booking = TRUE AND guest_email = (auth.jwt() ->> 'email'))
  );

CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (
    auth.uid()::text = tourist_id OR
    (is_guest_booking = TRUE AND guest_email = (auth.jwt() ->> 'email'))
  );

-- Policy for vendors - can view bookings for their services
CREATE POLICY "Vendors can view bookings for their services" ON bookings
  FOR SELECT USING (
    vendor_id IN (
      SELECT id::text FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Policy for admins - can view all bookings
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON COLUMN bookings.guest_name IS 'Name of guest user for non-registered bookings';
COMMENT ON COLUMN bookings.guest_email IS 'Email of guest user for non-registered bookings';
COMMENT ON COLUMN bookings.guest_phone IS 'Phone of guest user for non-registered bookings';
COMMENT ON COLUMN bookings.is_guest_booking IS 'Flag to indicate if this is a guest booking without user account';