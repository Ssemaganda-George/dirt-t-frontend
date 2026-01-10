-- Admin RLS Policies for Bookings and Transactions Tables
-- This ensures admins can view all bookings and transactions

-- Add RLS policies for bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Vendors can view bookings for their services" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;

-- Create RLS policies for bookings table
-- Users can view their own bookings (as tourists)
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = tourist_id);

-- Vendors can view bookings for their services
CREATE POLICY "Vendors can view bookings for their services" ON bookings
  FOR SELECT USING (auth.uid() IN (
    SELECT v.user_id FROM vendors v WHERE v.id = bookings.vendor_id
  ));

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));

-- Users can create bookings
CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = tourist_id);

-- Grant necessary permissions
GRANT SELECT, INSERT ON bookings TO authenticated;

-- Add RLS policies for transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Vendors can view transactions for their services" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;

-- Create RLS policies for transactions table
-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = tourist_id OR auth.uid() = vendor_id);

-- Vendors can view transactions for their services
CREATE POLICY "Vendors can view transactions for their services" ON transactions
  FOR SELECT USING (auth.uid() IN (
    SELECT v.user_id FROM vendors v WHERE v.id = transactions.vendor_id
  ));

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.role = 'admin'
  ));

-- Grant necessary permissions
GRANT SELECT ON transactions TO authenticated;