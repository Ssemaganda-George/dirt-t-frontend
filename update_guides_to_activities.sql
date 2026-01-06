-- Update Guides category to Activities
UPDATE service_categories
SET
  id = 'cat_activities',
  name = 'Activities',
  description = 'Events and activities happening',
  icon = '🎯'
WHERE id = 'cat_guide';

-- If there's a conflict with existing cat_activities, merge them
-- First, update any services that use cat_guide to use cat_activities
UPDATE services
SET category_id = 'cat_activities'
WHERE category_id = 'cat_guide';

-- Then delete the old cat_guide entry if it still exists
DELETE FROM service_categories WHERE id = 'cat_guide';
