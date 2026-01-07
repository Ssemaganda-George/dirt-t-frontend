-- Add additional business detail fields to vendors table
-- This SQL updates the database schema to support the enhanced vendor registration form

-- Add business_website column
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS business_website TEXT;

-- Add operating_hours column
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS operating_hours TEXT;

-- Add years_in_business column
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS years_in_business TEXT;

-- Add business_type column (if not exists) to store the selected business type
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS business_type TEXT;

-- Update the Vendor interface in database.ts to include new fields
-- (This is just a comment - the interface should be updated in the TypeScript file)

-- Optional: Add some indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendors_business_type ON vendors(business_type);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- Optional: Add a comment to document the new fields
COMMENT ON COLUMN vendors.business_website IS 'Business website or social media handle';
COMMENT ON COLUMN vendors.operating_hours IS 'Business operating hours (e.g., Mon-Fri 9AM-6PM)';
COMMENT ON COLUMN vendors.years_in_business IS 'Years the business has been operating';
COMMENT ON COLUMN vendors.business_type IS 'Type of business (hotel, restaurant, tour-guide, etc.)';

-- For tourists, the existing profiles table should be sufficient
-- But if we want to add tourist-specific preferences, we could add a tourists table:

-- Optional: Create tourists table for tourist-specific data
CREATE TABLE IF NOT EXISTS tourists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_currency TEXT DEFAULT 'UGX',
    preferred_language TEXT DEFAULT 'en',
    travel_interests TEXT[], -- Array of interests like 'adventure', 'culture', 'nature'
    dietary_restrictions TEXT[],
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    passport_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for tourists table
ALTER TABLE tourists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tourist profile
CREATE POLICY "Users can view own tourist profile" ON tourists
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own tourist profile
CREATE POLICY "Users can insert own tourist profile" ON tourists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tourist profile
CREATE POLICY "Users can update own tourist profile" ON tourists
    FOR UPDATE USING (auth.uid() = user_id);

-- Optional: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist, then recreate them
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tourists_updated_at ON tourists;
CREATE TRIGGER update_tourists_updated_at BEFORE UPDATE ON tourists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();