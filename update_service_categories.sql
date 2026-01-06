-- Update service categories to include all categories used in the enhanced forms
-- This ensures all category dropdowns in the vendor forms will work properly

-- Insert or update all service categories with proper names and descriptions
INSERT INTO service_categories (id, name, description, icon) VALUES
  ('cat_hotels', 'Hotels & Lodges', 'Luxury and standard hotel accommodations', '🏨'),
  ('cat_tour_packages', 'Tour Packages', 'Complete tour packages with guides and activities', '🎒'),
  ('cat_transport', 'Transport & Transfers', 'Vehicle rental, transfers, and transportation services', '🚗'),
  ('cat_restaurants', 'Restaurants & Dining', 'Restaurants, cafes, and dining experiences', '🍽️'),
  ('cat_activities', 'Activities & Events', 'Adventure activities, experiences, and events', '🎢'),
  ('cat_rental', 'Equipment Rental', 'Gear and equipment rental services', '🚲'),
  ('cat_events', 'Events & Workshops', 'Events, workshops, and special occasions', '🎪'),
  ('cat_hostel', 'Hostels & Guesthouses', 'Budget accommodation options', '🏠'),
  ('cat_homestay', 'Homestays', 'Local home-based accommodation', '🏘️'),
  ('cat_agency', 'Travel Agencies', 'Travel planning and booking services', '🗺️'),
  ('cat_flights', 'Flights & Aviation', 'Flight bookings and aviation services', '✈️')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;

-- Optional: Update any existing categories that might have different names
UPDATE service_categories SET
  name = 'Activities & Events',
  description = 'Adventure activities, experiences, and events'
WHERE id = 'cat_activities' AND name != 'Activities & Events';

-- Verify all categories exist (this will show in logs if run manually)
-- SELECT id, name, description FROM service_categories ORDER BY name;