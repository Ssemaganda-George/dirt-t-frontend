-- Add status column to profiles table for unified user status management
-- This allows storing vendor status (pending/approved/rejected/suspended) in the profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'pending', 'approved', 'rejected', 'suspended'));

-- Set default status for existing users
-- Tourists default to 'active', vendors default to 'pending' if not already set
UPDATE profiles
SET status = CASE
  WHEN role = 'tourist' THEN 'active'
  WHEN role = 'vendor' THEN COALESCE(status, 'pending')
  ELSE 'active'
END
WHERE status IS NULL;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Add comment for documentation
COMMENT ON COLUMN profiles.status IS 'User status: active (tourists), pending/approved/rejected/suspended (vendors)';