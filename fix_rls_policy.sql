-- Update RLS policy for transactions to check vendor status
-- Drop existing policy
DROP POLICY IF EXISTS "Vendors can view their own transactions" ON transactions;

-- Create new policy that checks vendor status
CREATE POLICY "Vendors can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id AND status = 'approved'
    ));

-- Also update the insert policy
DROP POLICY IF EXISTS "Vendors can insert their own transactions" ON transactions;

CREATE POLICY "Vendors can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id AND status = 'approved'
    ));