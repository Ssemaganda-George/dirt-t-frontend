-- Migration: Add emergency_contact column to tourists table
-- This column stores the emergency contact person's full name

ALTER TABLE public.tourists
ADD COLUMN IF NOT EXISTS emergency_contact text;

COMMENT ON COLUMN public.tourists.emergency_contact IS 'Emergency contact person''s full name';

-- Create index for searching by emergency contact name
CREATE INDEX IF NOT EXISTS idx_tourists_emergency_contact 
ON public.tourists USING btree (emergency_contact) 
TABLESPACE pg_default;
