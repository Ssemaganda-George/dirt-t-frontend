-- Add Flights category to service_categories table
INSERT INTO service_categories (id, name, description, icon) VALUES
  ('cat_flights', 'Flights', 'Air travel and flight services', '✈️')
ON CONFLICT (id) DO NOTHING;