-- Comprehensive update to services table for complete category information storage
-- This migration ensures all category-specific fields from the TypeScript interface exist in the database

-- Add any missing general service fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS group_size_min INTEGER DEFAULT 1;
ALTER TABLE services ADD COLUMN IF NOT EXISTS group_size_max INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS best_time_to_visit TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS what_to_bring TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS age_restrictions TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS health_requirements TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS accessibility_features TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS sustainability_certified BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS eco_friendly BOOLEAN DEFAULT false;

-- Hotel-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS room_types JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS check_in_time TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS check_out_time TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5);
ALTER TABLE services ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS total_rooms INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS room_amenities TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS nearby_attractions TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS breakfast_included BOOLEAN DEFAULT false;

-- Tour-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS itinerary JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS included_items JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS excluded_items JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'challenging', 'difficult'));
ALTER TABLE services ADD COLUMN IF NOT EXISTS minimum_age INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS languages_offered JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS tour_highlights TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS meeting_point TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS end_point TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS transportation_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS meals_included TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS guide_included BOOLEAN DEFAULT true;

-- Transport-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_capacity INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pickup_locations JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS dropoff_locations JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS route_description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS driver_included BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS air_conditioning BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS gps_tracking BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS fuel_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS tolls_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT true;

-- Restaurant-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS cuisine_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS menu_items JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS dietary_options JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS average_cost_per_person DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS reservations_required BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS outdoor_seating BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS live_music BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS private_dining BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS alcohol_served BOOLEAN DEFAULT false;

-- Guide-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS languages_spoken JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_area TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS first_aid_certified BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_owned BOOLEAN DEFAULT false;

-- Activity-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS skill_level_required TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS equipment_provided TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS safety_briefing_required BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS weather_dependent BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS seasonal_availability TEXT;

-- Rental-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS rental_items TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS rental_duration TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_required DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS insurance_required BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS maintenance_included BOOLEAN DEFAULT false;

-- Event-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_duration_hours INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_participants INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS materials_included TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS prerequisites TEXT;

-- Agency-specific fields (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS services_offered TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS destinations_covered TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_fee DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS customization_available BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS emergency_support BOOLEAN DEFAULT true;

-- Enhanced contact and booking info (ensure all exist)
ALTER TABLE services ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_requirements TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_deadline_hours INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS payment_methods TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS refund_policy TEXT;

-- Create indexes for performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_services_duration_days ON services(duration_days);
CREATE INDEX IF NOT EXISTS idx_services_group_size_max ON services(group_size_max);
CREATE INDEX IF NOT EXISTS idx_services_activity_type ON services(activity_type);
CREATE INDEX IF NOT EXISTS idx_services_event_date ON services(event_date);
CREATE INDEX IF NOT EXISTS idx_services_sustainability ON services(sustainability_certified);
CREATE INDEX IF NOT EXISTS idx_services_eco_friendly ON services(eco_friendly);
CREATE INDEX IF NOT EXISTS idx_services_star_rating ON services(star_rating);
CREATE INDEX IF NOT EXISTS idx_services_difficulty_level ON services(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_services_vehicle_type ON services(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_services_cuisine_type ON services(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_services_tags ON services USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_services_contact_info ON services USING GIN (contact_info);
CREATE INDEX IF NOT EXISTS idx_services_social_media ON services USING GIN (social_media);

-- Add comments to document the comprehensive nature of this table
COMMENT ON TABLE services IS 'Comprehensive services table supporting all category types with extensive metadata';
COMMENT ON COLUMN services.category_id IS 'References service_categories table to determine service type';
COMMENT ON COLUMN services.tags IS 'Flexible tagging system for search and filtering';
COMMENT ON COLUMN services.contact_info IS 'JSON object containing phone, email, website contact details';