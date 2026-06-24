-- Migration: Update tour_style CHECK constraint to include new values added in 046
-- The 046 migration created the column with a narrower constraint.
-- This migration drops and replaces that constraint with the full value set.

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_tour_style_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_tour_style_check CHECK (tour_style IN (
    -- Wildlife & Safari
    'wildlife_safari', 'birding', 'photography_safari',
    -- Primate
    'gorilla_chimp', 'primate_tour',
    -- Adventure & Trek
    'adventure_trek', 'mountain_climbing', 'white_water', 'hiking', 'water_activities', 'cycling_tour',
    -- Eco Tour
    'eco_tour', 'conservation', 'forest_nature',
    -- Cultural & Heritage
    'cultural_heritage', 'community_tour', 'historical',
    -- Other styles
    'family', 'honeymoon', 'customizable', 'other'
  ));
