-- Drop ALL RLS policies for all main tables (emergency reset)

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- VENDORS
DROP POLICY IF EXISTS "Vendors can view their own record" ON vendors;
DROP POLICY IF EXISTS "Vendors can update their own record" ON vendors;
DROP POLICY IF EXISTS "Admins can view all vendors" ON vendors;
DROP POLICY IF EXISTS "Admins can update all vendors" ON vendors;

-- TOURISTS
DROP POLICY IF EXISTS "Users can view own tourist data" ON tourists;
DROP POLICY IF EXISTS "Users can insert own tourist data" ON tourists;
DROP POLICY IF EXISTS "Users can update own tourist data" ON tourists;
DROP POLICY IF EXISTS "Users can delete own tourist data" ON tourists;

-- SERVICES
DROP POLICY IF EXISTS "Anyone can view approved services" ON services;
DROP POLICY IF EXISTS "Vendors can view their own services" ON services;
DROP POLICY IF EXISTS "Vendors can insert their own services" ON services;
DROP POLICY IF EXISTS "Vendors can update their own services" ON services;
DROP POLICY IF EXISTS "Admins can view all services" ON services;
DROP POLICY IF EXISTS "Admins can update all services" ON services;

-- BOOKINGS
DROP POLICY IF EXISTS "Tourists can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Vendors can view bookings for their services" ON bookings;
DROP POLICY IF EXISTS "Tourists can insert their own bookings" ON bookings;
DROP POLICY IF EXISTS "Vendors can update bookings for their services" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON bookings;

-- TRANSACTIONS
DROP POLICY IF EXISTS "Vendors can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Vendors can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
