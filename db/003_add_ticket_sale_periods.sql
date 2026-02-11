-- Migration: add sale period fields to ticket_types table
-- Adds sale_start and sale_end timestamps for controlling ticket sale periods

ALTER TABLE public.ticket_types
ADD COLUMN IF NOT EXISTS sale_start timestamptz NULL,
ADD COLUMN IF NOT EXISTS sale_end timestamptz NULL;

-- Add index for sale period queries
CREATE INDEX IF NOT EXISTS idx_ticket_types_sale_period ON public.ticket_types(sale_start, sale_end);

-- Update existing records to have default sale periods if needed
-- (This can be customized based on business logic)