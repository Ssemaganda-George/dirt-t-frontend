-- Create partner_requests table with referral support
-- This ensures the table exists with all required fields for both partnerships and referrals

CREATE TABLE IF NOT EXISTS partner_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    website TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Referral-specific fields
    type TEXT DEFAULT 'partner_request' CHECK (type IN ('partner_request', 'business_referral')),
    referrer_name TEXT,
    referrer_email TEXT,
    referrer_phone TEXT,
    contact_person TEXT,
    business_location TEXT
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_partner_requests_type ON partner_requests(type);
CREATE INDEX IF NOT EXISTS idx_partner_requests_status ON partner_requests(status);
CREATE INDEX IF NOT EXISTS idx_partner_requests_created_at ON partner_requests(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to insert referrals
CREATE POLICY "Users can insert business referrals" ON partner_requests
    FOR INSERT
    WITH CHECK (type = 'business_referral');

-- Create policy for authenticated users to view their own referrals
CREATE POLICY "Users can view their own referrals" ON partner_requests
    FOR SELECT
    USING (
        type = 'business_referral' AND
        (referrer_email = auth.jwt() ->> 'email' OR auth.role() = 'admin')
    );

-- Create policy for admins to manage all partner requests and referrals
CREATE POLICY "Admins can manage all partner requests" ON partner_requests
    FOR ALL
    USING (auth.role() = 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_partner_requests_updated_at
    BEFORE UPDATE ON partner_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();