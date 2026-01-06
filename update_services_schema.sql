-- Comprehensive update to services table schema
-- This migration adds additional fields and categories to support more service types

-- Add new service categories
INSERT INTO service_categories (id, name, description, icon) VALUES
  ('cat_activities', 'Activities & Experiences', 'Adventure activities, experiences, and entertainment', '🎢'),
  ('cat_rental', 'Equipment Rental', 'Gear and equipment rental services', '🚲'),
  ('cat_events', 'Events & Workshops', 'Events, workshops, and special occasions', '🎪'),
  ('cat_hostel', 'Hostels & Guesthouses', 'Budget accommodation options', '🏠'),
  ('cat_homestay', 'Homestays', 'Local home-based accommodation', '🏘️'),
  ('cat_agency', 'Travel Agencies', 'Travel planning and booking services', '🗺️')
ON CONFLICT (id) DO NOTHING;

-- Add enhanced fields for existing categories

-- General service enhancements
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

-- Enhanced hotel fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS total_rooms INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS room_amenities TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS nearby_attractions TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS breakfast_included BOOLEAN DEFAULT false;

-- Enhanced tour fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS tour_highlights TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS meeting_point TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS end_point TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS transportation_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS meals_included TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS guide_included BOOLEAN DEFAULT true;

-- Enhanced transport fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS driver_included BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS air_conditioning BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS gps_tracking BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS fuel_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS tolls_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS insurance_included BOOLEAN DEFAULT true;

-- Enhanced restaurant fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS reservations_required BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS outdoor_seating BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS live_music BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS private_dining BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS alcohol_served BOOLEAN DEFAULT false;

-- Enhanced guide fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS first_aid_certified BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_owned BOOLEAN DEFAULT false;

-- Activity-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS skill_level_required TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS equipment_provided TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS safety_briefing_required BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS weather_dependent BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS seasonal_availability TEXT;

-- Rental-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS rental_items TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS rental_duration TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_required DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS insurance_required BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS maintenance_included BOOLEAN DEFAULT false;

-- Event-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_duration_hours INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS max_participants INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS materials_included TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS prerequisites TEXT;

-- Agency-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS services_offered TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS destinations_covered TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_fee DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS customization_available BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS emergency_support BOOLEAN DEFAULT true;

-- Enhanced contact and booking info
ALTER TABLE services ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';
ALTER TABLE services ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_deadline_hours INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS payment_methods TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS refund_policy TEXT;

-- Create additional indexes for new searchable fields
CREATE INDEX IF NOT EXISTS idx_services_duration_days ON services(duration_days);
CREATE INDEX IF NOT EXISTS idx_services_group_size_max ON services(group_size_max);
CREATE INDEX IF NOT EXISTS idx_services_activity_type ON services(activity_type);
CREATE INDEX IF NOT EXISTS idx_services_event_date ON services(event_date);
CREATE INDEX IF NOT EXISTS idx_services_sustainability ON services(sustainability_certified);
CREATE INDEX IF NOT EXISTS idx_services_eco_friendly ON services(eco_friendly);

-- Add missing comprehensive fields for all categories (continued updates)

-- Additional hotel/accommodation fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5);
ALTER TABLE services ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS facilities TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS wifi_available BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS minimum_stay INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS maximum_guests INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS common_facilities TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS generator_backup BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS smoking_allowed BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS children_allowed BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS disabled_access BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS concierge_service BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS house_rules TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS local_recommendations TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS check_in_process TEXT;

-- Additional tour fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS itinerary TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS included_items TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS excluded_items TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'challenging', 'difficult'));
ALTER TABLE services ADD COLUMN IF NOT EXISTS minimum_age INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS languages_offered TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS accommodation_included BOOLEAN DEFAULT false;

-- Additional transport fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS vehicle_capacity INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS pickup_locations TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS dropoff_locations TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS route_description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS license_required TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_notice_hours INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS usb_charging BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS child_seat BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS roof_rack BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS towing_capacity BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS four_wheel_drive BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS automatic_transmission BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS transport_terms TEXT;

-- Additional restaurant fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS cuisine_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS opening_hours JSONB;
ALTER TABLE services ADD COLUMN IF NOT EXISTS menu_items TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS dietary_options TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS average_cost_per_person DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_range TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS dress_code TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS menu_highlights TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS restaurant_atmosphere TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS restaurant_notes TEXT;

-- Additional guide fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS languages_spoken TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS specialties TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_area TEXT;

-- Updated activity/event fields (changed from basic activity to comprehensive event)
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_status TEXT DEFAULT 'upcoming' CHECK (event_status IN ('upcoming', 'ongoing', 'completed', 'cancelled'));
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS ticket_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS early_bird_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS ticket_purchase_link TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_location TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_highlights TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_inclusions TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_prerequisites TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS event_cancellation_policy TEXT;

-- Additional rental fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS replacement_value DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS delivery_radius INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS usage_instructions TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS maintenance_requirements TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS training_provided BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS cleaning_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS repair_service BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS equipment_condition TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS rental_terms TEXT;

-- Additional event/workshop fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS instructor_credentials TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS certificates_provided BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS refreshments_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS take_home_materials BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS photography_allowed BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS recording_allowed BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS group_discounts BOOLEAN DEFAULT false;

-- Additional agency fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS iata_number TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS specializations TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS success_stories TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS insurance_brokerage BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS visa_assistance BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS group_bookings BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS corporate_accounts BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS agency_description TEXT;

-- Flight-specific fields (comprehensive)
ALTER TABLE services ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS airline TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS aircraft_type TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS departure_city TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS arrival_city TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS departure_airport TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS arrival_airport TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS departure_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS economy_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS business_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS first_class_price DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS total_seats INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS available_seats INTEGER;
ALTER TABLE services ADD COLUMN IF NOT EXISTS flight_class TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS flight_status TEXT DEFAULT 'active' CHECK (flight_status IN ('active', 'cancelled', 'delayed', 'completed'));
ALTER TABLE services ADD COLUMN IF NOT EXISTS baggage_allowance TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS flight_amenities TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS flexible_booking BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS lounge_access BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS priority_boarding BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS flight_meals_included BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS flight_notes TEXT;

-- Additional enhanced contact and booking info fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_info JSONB;
ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_requirements TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

-- Update refund_policy to boolean type (was previously TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'refund_policy' AND data_type = 'text'
  ) THEN
    -- Convert text values to boolean
    ALTER TABLE services ALTER COLUMN refund_policy TYPE BOOLEAN
    USING (CASE
      WHEN refund_policy ILIKE 'true' OR refund_policy = '1' THEN true
      WHEN refund_policy ILIKE 'false' OR refund_policy = '0' THEN false
      ELSE false
    END);
  END IF;
END $$;

-- Create comprehensive indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_vendor_id ON services(vendor_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_event_datetime ON services(event_datetime);
CREATE INDEX IF NOT EXISTS idx_services_departure_time ON services(departure_time);
CREATE INDEX IF NOT EXISTS idx_services_price_range ON services(price_range);
CREATE INDEX IF NOT EXISTS idx_services_location ON services(location);
CREATE INDEX IF NOT EXISTS idx_services_event_location ON services(event_location);
CREATE INDEX IF NOT EXISTS idx_services_departure_city ON services(departure_city);
CREATE INDEX IF NOT EXISTS idx_services_arrival_city ON services(arrival_city);
CREATE INDEX IF NOT EXISTS idx_services_flight_number ON services(flight_number);
CREATE INDEX IF NOT EXISTS idx_services_airline ON services(airline);
CREATE INDEX IF NOT EXISTS idx_services_ticket_price ON services(ticket_price);
CREATE INDEX IF NOT EXISTS idx_services_star_rating ON services(star_rating);

-- GIN indexes for array columns (these work with GIN)
CREATE INDEX IF NOT EXISTS idx_services_room_amenities ON services USING GIN (room_amenities);
CREATE INDEX IF NOT EXISTS idx_services_facilities ON services USING GIN (facilities);
CREATE INDEX IF NOT EXISTS idx_services_flight_amenities ON services USING GIN (flight_amenities);
CREATE INDEX IF NOT EXISTS idx_services_event_inclusions ON services USING GIN (event_inclusions);

-- Add comments for documentation
COMMENT ON COLUMN services.star_rating IS 'Hotel star rating from 1 to 5';
COMMENT ON COLUMN services.event_datetime IS 'Date and time for events/activities';
COMMENT ON COLUMN services.registration_deadline IS 'Deadline for event/activity registration';
COMMENT ON COLUMN services.ticket_purchase_link IS 'External link for ticket purchasing';
COMMENT ON COLUMN services.flight_number IS 'Flight number (e.g., QR123)';
COMMENT ON COLUMN services.airline IS 'Airline name (e.g., Qatar Airways)';
COMMENT ON COLUMN services.departure_time IS 'Flight departure time';
COMMENT ON COLUMN services.arrival_time IS 'Flight arrival time';
COMMENT ON COLUMN services.contact_info IS 'JSON object with phone, email, website';
COMMENT ON COLUMN services.social_media IS 'JSON object with social media links';
COMMENT ON COLUMN services.event_highlights IS 'Key highlights for events/activities';
COMMENT ON COLUMN services.event_inclusions IS 'What is included in the event/activity';
COMMENT ON COLUMN services.flight_amenities IS 'Amenities available on the flight';