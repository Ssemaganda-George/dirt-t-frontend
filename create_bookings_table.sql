-- Create bookings table for Dirt Trails
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id TEXT NOT NULL, -- Using TEXT for now to avoid FK issues
  tourist_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  booking_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service_date DATE,
  booking_time TIME,
  guests INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  special_requests TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Transport-specific fields
  pickup_location TEXT,
  dropoff_location TEXT,
  driver_option TEXT,
  return_trip BOOLEAN DEFAULT FALSE,
  start_time TIME,
  end_time TIME,
  end_date DATE
);

-- Add transport-specific columns if they don't exist (for existing tables)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_location TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_option TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_trip BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_date DATE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tourist_id ON bookings(tourist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_id ON bookings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings
-- Temporarily allow all operations for testing
DROP POLICY IF EXISTS "Allow all operations for testing" ON bookings;
CREATE POLICY "Allow all operations for testing" ON bookings
  FOR ALL USING (true);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();