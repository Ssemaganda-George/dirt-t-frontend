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