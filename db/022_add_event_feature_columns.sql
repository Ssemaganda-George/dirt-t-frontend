-- Migration: Add missing event feature columns to services table
-- This migration adds boolean columns for event features that are used in the event creation form

-- Add event feature columns to services table
DO $$
BEGIN
  -- Add event_description column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='event_description') THEN
    ALTER TABLE public.services
      ADD COLUMN event_description text;
  END IF;

  -- Add photography_allowed column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='photography_allowed') THEN
    ALTER TABLE public.services
      ADD COLUMN photography_allowed boolean DEFAULT false;
  END IF;

  -- Add recording_allowed column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='recording_allowed') THEN
    ALTER TABLE public.services
      ADD COLUMN recording_allowed boolean DEFAULT false;
  END IF;

  -- Add group_discounts column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='group_discounts') THEN
    ALTER TABLE public.services
      ADD COLUMN group_discounts boolean DEFAULT false;
  END IF;

  -- Add transportation_included column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='transportation_included') THEN
    ALTER TABLE public.services
      ADD COLUMN transportation_included boolean DEFAULT false;
  END IF;

  -- Add meals_included column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='meals_included') THEN
    ALTER TABLE public.services
      ADD COLUMN meals_included boolean DEFAULT false;
  END IF;
END$$;

-- Add comments for documentation
COMMENT ON COLUMN public.services.event_description IS 'Detailed description specific to events';
COMMENT ON COLUMN public.services.photography_allowed IS 'Whether photography is allowed at the event';
COMMENT ON COLUMN public.services.recording_allowed IS 'Whether recording/video is allowed at the event';
COMMENT ON COLUMN public.services.group_discounts IS 'Whether group discounts are available for the event';
COMMENT ON COLUMN public.services.transportation_included IS 'Whether transportation is included in the event package';
COMMENT ON COLUMN public.services.meals_included IS 'Whether meals are included in the event package';