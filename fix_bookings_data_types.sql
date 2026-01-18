-- Fix data types in bookings table to match referenced tables
-- This resolves the incompatible types error when adding foreign keys

-- Change tourist_id from TEXT to UUID
ALTER TABLE bookings ALTER COLUMN tourist_id TYPE UUID USING tourist_id::UUID;

-- Change vendor_id from TEXT to UUID
ALTER TABLE bookings ALTER COLUMN vendor_id TYPE UUID USING vendor_id::UUID;

-- Change service_id from TEXT to UUID
ALTER TABLE bookings ALTER COLUMN service_id TYPE UUID USING service_id::UUID;

-- Now add the foreign key constraints
ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_service_id
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_tourist_id
FOREIGN KEY (tourist_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_vendor_id
FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;