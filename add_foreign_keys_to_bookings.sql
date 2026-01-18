-- Add foreign key constraints to bookings table for proper relationships
-- This fixes the PostgREST error: "Could not find a relationship between 'bookings' and 'services'"

-- Add foreign key from bookings.service_id to services.id
-- Assuming services.id is UUID (common in Supabase)
ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_service_id
FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;

-- Add foreign key from bookings.tourist_id to profiles.id
ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_tourist_id
FOREIGN KEY (tourist_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key from bookings.vendor_id to vendors.id
ALTER TABLE bookings
ADD CONSTRAINT fk_bookings_vendor_id
FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE;

-- Note: If services.id is TEXT instead of UUID, change the REFERENCES accordingly
-- If any constraint fails due to data type mismatch, you may need to:
-- 1. Check the actual data types in your tables
-- 2. Cast or convert data if necessary
-- 3. Or remove the constraint and recreate with correct types