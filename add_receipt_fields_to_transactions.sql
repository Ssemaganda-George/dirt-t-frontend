-- Add receipt and processing fields to transactions table
-- This migration adds columns needed for the withdrawal approval workflow

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS payment_notes TEXT,
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Create index for processed_by for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_processed_by ON transactions(processed_by);

-- Update RLS policies to allow admins to update transactions
CREATE POLICY "Admins can update transactions" ON transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );