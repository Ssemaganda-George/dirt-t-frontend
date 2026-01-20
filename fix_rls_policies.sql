-- Fix infinite recursion in RLS policies
-- Drop all existing policies and recreate them properly

-- Drop all existing policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Drop all existing policies for vendors table
DROP POLICY IF EXISTS "Vendors can view their own record" ON vendors;
DROP POLICY IF EXISTS "Vendors can update their own record" ON vendors;
DROP POLICY IF EXISTS "Admins can view all vendors" ON vendors;
DROP POLICY IF EXISTS "Admins can update all vendors" ON vendors;

-- Drop all existing policies for tourists table
DROP POLICY IF EXISTS "Users can view own tourist data" ON tourists;
DROP POLICY IF EXISTS "Users can insert own tourist data" ON tourists;
DROP POLICY IF EXISTS "Users can update own tourist data" ON tourists;
DROP POLICY IF EXISTS "Users can delete own tourist data" ON tourists;

-- Drop all existing policies for services table
DROP POLICY IF EXISTS "Anyone can view approved services" ON services;
DROP POLICY IF EXISTS "Vendors can view their own services" ON services;
DROP POLICY IF EXISTS "Vendors can insert their own services" ON services;
DROP POLICY IF EXISTS "Vendors can update their own services" ON services;
DROP POLICY IF EXISTS "Admins can view all services" ON services;
DROP POLICY IF EXISTS "Admins can update all services" ON services;

-- Drop all existing policies for bookings table
DROP POLICY IF EXISTS "Tourists can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Vendors can view bookings for their services" ON bookings;
DROP POLICY IF EXISTS "Tourists can insert their own bookings" ON bookings;
DROP POLICY IF EXISTS "Vendors can update bookings for their services" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON bookings;

-- Drop all existing policies for transactions table
DROP POLICY IF EXISTS "Vendors can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Vendors can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;

-- Now recreate the policies without circular references

-- Profiles policies (only basic user policies, no admin policies)
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Vendors policies
CREATE POLICY "Vendors can view their own record" ON vendors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Vendors can update their own record" ON vendors
    FOR UPDATE USING (auth.uid() = user_id);

-- Tourists policies
CREATE POLICY "Users can view own tourist data" ON tourists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tourist data" ON tourists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tourist data" ON tourists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tourist data" ON tourists
    FOR DELETE USING (auth.uid() = user_id);

-- Services policies
CREATE POLICY "Anyone can view approved services" ON services
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Vendors can view their own services" ON services
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id
    ));

CREATE POLICY "Vendors can insert their own services" ON services
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id
    ));

CREATE POLICY "Vendors can update their own services" ON services
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id
    ));

-- Bookings policies
CREATE POLICY "Tourists can view their own bookings" ON bookings
    FOR SELECT USING (auth.uid() = tourist_id);

CREATE POLICY "Vendors can view bookings for their services" ON bookings
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id
    ));

CREATE POLICY "Tourists can insert their own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = tourist_id);

CREATE POLICY "Vendors can update bookings for their services" ON bookings
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id
    ));

-- Transactions policies
CREATE POLICY "Vendors can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id
    ));

CREATE POLICY "Vendors can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() IN (
        SELECT user_id FROM vendors WHERE id = vendor_id
    ));