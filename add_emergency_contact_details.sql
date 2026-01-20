-- Add detailed emergency contact fields to tourists table
-- This migration adds more comprehensive emergency contact information

-- Add new columns for detailed emergency contact information
ALTER TABLE tourists
ADD COLUMN IF NOT EXISTS emergency_relationship TEXT,
ADD COLUMN IF NOT EXISTS emergency_email TEXT,
ADD COLUMN IF NOT EXISTS emergency_address TEXT;

-- Add comments for documentation
COMMENT ON COLUMN tourists.emergency_relationship IS 'Relationship of emergency contact to the tourist (spouse, parent, child, etc.)';
COMMENT ON COLUMN tourists.emergency_email IS 'Email address of emergency contact';
COMMENT ON COLUMN tourists.emergency_address IS 'Complete address of emergency contact';

-- Create index on emergency_relationship for potential filtering
CREATE INDEX IF NOT EXISTS idx_tourists_emergency_relationship ON tourists(emergency_relationship);

-- Update RLS policies to ensure emergency contact data is properly secured
-- (The existing policies should already cover these new fields since they're part of the tourists table)