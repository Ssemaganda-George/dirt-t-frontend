-- Add status field to profiles table for user suspension functionality
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Add suspension tracking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_period TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_end_at TIMESTAMP WITH TIME ZONE;

-- Update existing profiles to have active status
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_suspension_end ON profiles(suspension_end_at) WHERE suspension_end_at IS NOT NULL;

-- Add RLS policy for suspended users (they can't access their own profile)
CREATE POLICY "Suspended users cannot access profile" ON profiles
  FOR SELECT USING (auth.uid() = id AND status != 'suspended');

-- Update the policy for profile updates to prevent suspended users from updating
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id AND status != 'suspended')
  WITH CHECK (auth.uid() = id AND status != 'suspended');