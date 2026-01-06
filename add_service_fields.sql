-- Add category-specific fields to services table
-- This migration adds fields that are relevant to different service categories

-- Add hotel-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS room_types JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS check_in_time TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS check_out_time TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5);
ALTER TABLE services ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '[]';

-- Add tour-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS itinerary JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS included_items JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS excluded_items JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'challenging', 'difficult'));
ALTER TABLE services ADD COLUMN IF NOT EXISTS minimum_age INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS languages_offered JSONB DEFAULT '[]';

-- Add transport-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_capacity INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pickup_locations JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS dropoff_locations JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS route_description TEXT;

-- Add restaurant-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS cuisine_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS menu_items JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS dietary_options JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS average_cost_per_person DECIMAL(10,2);

-- Add guide-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS languages_spoken JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_area TEXT;

-- Add general service metadata
ALTER TABLE services ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_requirements TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

-- Create indexes for new fields that might be queried frequently
CREATE INDEX IF NOT EXISTS idx_services_star_rating ON services(star_rating);
CREATE INDEX IF NOT EXISTS idx_services_difficulty_level ON services(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_services_vehicle_type ON services(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_services_cuisine_type ON services(cuisine_type);