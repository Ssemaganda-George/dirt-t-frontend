-- Simple Wallet Migration - Just the essentials
-- Run this if the complex migration keeps failing

-- Create vendors table FIRST (transactions references it)
CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_description TEXT,
    business_address TEXT,
    business_phone TEXT,
    business_email TEXT,
    business_website TEXT,
    business_type TEXT,
    operating_hours TEXT,
    years_in_business TEXT,
    business_license TEXT,
    tax_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transactions table SECOND (references vendors)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    tourist_id UUID,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('payment', 'withdrawal', 'refund')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'card' CHECK (payment_method IN ('card', 'mobile_money', 'bank_transfer')),
    reference VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE OR REPLACE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optionally wait for tables to be visible (for some SQL engines)
DO $$ BEGIN PERFORM pg_sleep(0.5); END $$;

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to do)
DROP POLICY IF EXISTS "Vendors can view their own record" ON vendors;
DROP POLICY IF EXISTS "Vendors can update their own record" ON vendors;
DROP POLICY IF EXISTS "Vendors can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Vendors can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;

-- Create policies (now that tables are fully created with proper relationships)
CREATE POLICY "Vendors can view their own record" ON vendors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Vendors can update their own record" ON vendors
    FOR UPDATE USING (auth.uid() = user_id);


CREATE POLICY "Vendors can view their own transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vendors v
            WHERE v.id = vendor_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (
                (
                    EXISTS (
                        SELECT 1 FROM vendors v
                        WHERE v.id = vendor_id AND v.user_id = auth.uid()
                    )
                    OR (
                        -- allow admins to create transactions on behalf of vendors
                        EXISTS (
                            SELECT 1 FROM profiles p
                            WHERE p.id = auth.uid() AND p.role = 'admin'
                        )
                    )
                )
    );

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_vendor_id ON transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);