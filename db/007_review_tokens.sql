-- Review Tokens Table Migration
-- This table stores tokens for verified booking reviews
-- When a vendor marks a booking as completed, a token is generated
-- and sent to the guest via email with a link to submit a verified review

-- Create the review_tokens table
CREATE TABLE IF NOT EXISTS review_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  guest_name TEXT NOT NULL DEFAULT 'Guest',
  guest_email TEXT NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_tokens_token ON review_tokens(token);
CREATE INDEX IF NOT EXISTS idx_review_tokens_booking_id ON review_tokens(booking_id);
CREATE INDEX IF NOT EXISTS idx_review_tokens_service_id ON review_tokens(service_id);
CREATE INDEX IF NOT EXISTS idx_review_tokens_guest_email ON review_tokens(guest_email);

-- Enable RLS
ALTER TABLE review_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to read tokens (needed for the public review page to validate tokens)
CREATE POLICY "Anyone can read review tokens" ON review_tokens
  FOR SELECT USING (true);

-- Allow authenticated users (vendors/admins) to create tokens
CREATE POLICY "Authenticated users can create review tokens" ON review_tokens
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update tokens (mark as used)
CREATE POLICY "Authenticated users can update review tokens" ON review_tokens
  FOR UPDATE USING (true);

-- Also ensure service_reviews table has all needed columns
-- Add is_verified_booking if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_reviews' AND column_name = 'is_verified_booking'
  ) THEN
    ALTER TABLE service_reviews ADD COLUMN is_verified_booking BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add approved_at if it doesn't exist  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_reviews' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE service_reviews ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add approved_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_reviews' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE service_reviews ADD COLUMN approved_by UUID;
  END IF;
END $$;

-- Add rejection_reason if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_reviews' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE service_reviews ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- Ensure RLS policies on service_reviews allow public inserts (for review from email)
-- Allow anonymous users to insert reviews (needed for the public review form)
CREATE POLICY IF NOT EXISTS "Anyone can insert reviews" ON service_reviews
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read approved reviews
CREATE POLICY IF NOT EXISTS "Anyone can read approved reviews" ON service_reviews
  FOR SELECT USING (status = 'approved' OR auth.role() = 'authenticated');

-- Allow admins to update reviews (approve/reject)
CREATE POLICY IF NOT EXISTS "Authenticated users can update reviews" ON service_reviews
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON review_tokens TO anon;
GRANT SELECT, INSERT, UPDATE ON review_tokens TO authenticated;
