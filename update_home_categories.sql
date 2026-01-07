-- Update home page categories to match the simplified filter names
-- This migration updates service categories to only include: Flights, Hotels, Tours, Restaurants, Transport, Activities
-- and removes all other categories

-- First, update ALL services to use the standardized plural category IDs before deleting any categories
UPDATE services SET category_id = 'cat_hotels' WHERE category_id = 'cat_hotel';
UPDATE services SET category_id = 'cat_restaurants' WHERE category_id = 'cat_restaurant';
UPDATE services SET category_id = 'cat_tour_packages' WHERE category_id = 'cat_tour';

-- Now it's safe to remove duplicate singular categories
DELETE FROM service_categories WHERE id = 'cat_hotel' AND EXISTS (SELECT 1 FROM service_categories WHERE id = 'cat_hotels');
DELETE FROM service_categories WHERE id = 'cat_restaurant' AND EXISTS (SELECT 1 FROM service_categories WHERE id = 'cat_restaurants');
DELETE FROM service_categories WHERE id = 'cat_tour' AND EXISTS (SELECT 1 FROM service_categories WHERE id = 'cat_tour_packages');

-- Reassign services from categories being removed to appropriate remaining categories
UPDATE services SET category_id = 'cat_hotels' WHERE category_id IN ('cat_hostel', 'cat_homestay');
UPDATE services SET category_id = 'cat_activities' WHERE category_id = 'cat_events';
UPDATE services SET category_id = 'cat_transport' WHERE category_id = 'cat_rental';
UPDATE services SET category_id = 'cat_tour_packages' WHERE category_id = 'cat_agency';

-- Update existing categories to match the new simplified names
UPDATE service_categories SET
  name = 'Hotels',
  description = 'Hotel accommodations and lodging',
  icon = '🏨'
WHERE id = 'cat_hotels';

UPDATE service_categories SET
  name = 'Tours',
  description = 'Tour packages and guided experiences',
  icon = '🎒'
WHERE id = 'cat_tour_packages';

UPDATE service_categories SET
  name = 'Transport',
  description = 'Transportation and transfer services',
  icon = '🚗'
WHERE id = 'cat_transport';

UPDATE service_categories SET
  name = 'Restaurants',
  description = 'Restaurants and dining experiences',
  icon = '🍽️'
WHERE id = 'cat_restaurants';

UPDATE service_categories SET
  name = 'Activities',
  description = 'Activities and adventure experiences',
  icon = '🎢'
WHERE id = 'cat_activities';

UPDATE service_categories SET
  name = 'Flights',
  description = 'Flight bookings and aviation services',
  icon = '✈️'
WHERE id = 'cat_flights';

-- Remove categories that are not in the simplified list
DELETE FROM service_categories
WHERE id NOT IN ('cat_hotels', 'cat_tour_packages', 'cat_transport', 'cat_restaurants', 'cat_activities', 'cat_flights');

-- Verify the remaining categories
SELECT id, name, description, icon FROM service_categories ORDER BY name;