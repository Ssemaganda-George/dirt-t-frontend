-- Migration: Change event_datetime column to timestamptz and update existing values
-- This migration safely converts the textual event_datetime column to a timestamptz

BEGIN;

-- Add a new column if it does not already exist
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS event_datetime_tmp timestamptz;

-- Populate tmp column safely. Use event_datetime::text for string checks so this
-- works whether event_datetime is currently text or timestamptz.
UPDATE public.services
SET event_datetime_tmp =
  CASE
    WHEN event_datetime IS NULL THEN NULL
    WHEN (event_datetime::text) ~ '^\s*$' THEN NULL
    WHEN (event_datetime::text) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}, [0-9]{2}:[0-9]{2}$' THEN to_timestamp(event_datetime::text, 'DD/MM/YYYY, HH24:MI')::timestamptz
    ELSE (event_datetime::text)::timestamptz
  END;

-- Drop old column if it exists, then rename tmp to event_datetime
ALTER TABLE public.services
  DROP COLUMN IF EXISTS event_datetime;

ALTER TABLE public.services
  RENAME COLUMN event_datetime_tmp TO event_datetime;

COMMIT;

-- Note: the create/update functions were updated to convert incoming strings to timestamptz
-- in their INSERT/UPDATE expressions (accepting text inputs for backward compatibility).
