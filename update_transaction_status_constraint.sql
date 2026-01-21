-- Update transactions table to include 'approved' status
-- This allows for a two-step approval process: pending -> approved -> completed

-- Drop the existing check constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;

-- Add the new check constraint with 'approved' status
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check
CHECK (status IN ('pending', 'approved', 'completed', 'failed'));