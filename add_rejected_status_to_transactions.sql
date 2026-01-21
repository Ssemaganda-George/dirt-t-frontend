-- Add 'rejected' status to transactions table
-- This allows admins to reject withdrawal requests

-- Drop the existing check constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Add the new check constraint with 'rejected' status
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check
CHECK (status IN ('pending', 'approved', 'completed', 'failed', 'rejected'));