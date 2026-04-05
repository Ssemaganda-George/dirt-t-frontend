-- Migration: Add public_key column to profiles table for E2E encryption
-- This enables end-to-end encryption for internal messaging

-- Add public_key column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Create index for faster lookups when encrypting messages
CREATE INDEX IF NOT EXISTS idx_profiles_public_key ON profiles(id) WHERE public_key IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.public_key IS 'RSA-OAEP public key (base64 encoded) for end-to-end message encryption';

-- Also add encrypted_message column to messages table if you want to store encrypted versions
-- This allows backward compatibility with existing unencrypted messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encrypted_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Create index for encrypted messages
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(is_encrypted) WHERE is_encrypted = true;

-- Comments for new message columns
COMMENT ON COLUMN messages.encrypted_content IS 'E2E encrypted message content (when is_encrypted is true)';
COMMENT ON COLUMN messages.is_encrypted IS 'Flag indicating if message uses E2E encryption';
