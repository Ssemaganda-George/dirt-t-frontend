-- Run this migration in Supabase SQL Editor to add E2E encryption support
-- This migration adds the necessary columns for end-to-end encryption

-- Step 1: Add public_key column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Step 2: Create index for faster lookups when encrypting messages  
CREATE INDEX IF NOT EXISTS idx_profiles_public_key ON profiles(id) WHERE public_key IS NOT NULL;

-- Step 3: Add comment explaining the column
COMMENT ON COLUMN profiles.public_key IS 'RSA-OAEP public key (base64 encoded) for end-to-end message encryption';

-- Step 4: Add encrypted message columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Step 5: Create index for encrypted messages
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(is_encrypted) WHERE is_encrypted = true;

-- Step 6: Add comments for new columns
COMMENT ON COLUMN messages.encrypted_content IS 'E2E encrypted message content (when is_encrypted is true)';
COMMENT ON COLUMN messages.is_encrypted IS 'Flag indicating if message uses E2E encryption';

-- Verification: Check the columns were added
SELECT 
  'profiles.public_key' as column_check,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'public_key'
  ) as exists;

SELECT 
  'messages.encrypted_content' as column_check,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'encrypted_content'
  ) as exists;

SELECT 
  'messages.is_encrypted' as column_check,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'is_encrypted'
  ) as exists;
