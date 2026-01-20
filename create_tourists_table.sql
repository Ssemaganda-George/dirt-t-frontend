-- Create tourists table migration
-- This table stores additional tourist-specific information

CREATE TABLE IF NOT EXISTS tourists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    travel_preferences TEXT,
    dietary_restrictions TEXT,
    medical_conditions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger for tourists updated_at
CREATE OR REPLACE TRIGGER update_tourists_updated_at BEFORE UPDATE ON tourists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_tourists_user_id ON tourists(user_id);

-- Enable Row Level Security
ALTER TABLE tourists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own tourist data
CREATE POLICY "Users can view own tourist data" ON tourists
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own tourist data
CREATE POLICY "Users can insert own tourist data" ON tourists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tourist data
CREATE POLICY "Users can update own tourist data" ON tourists
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own tourist data
CREATE POLICY "Users can delete own tourist data" ON tourists
    FOR DELETE USING (auth.uid() = user_id);