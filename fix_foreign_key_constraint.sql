-- Fix foreign key constraint to allow service deletion
-- Run this in Supabase SQL Editor BEFORE deleting the service

-- Drop the existing RESTRICT constraint
ALTER TABLE public.order_items
DROP CONSTRAINT order_items_ticket_type_id_fkey;

-- Add the CASCADE constraint
ALTER TABLE public.order_items
ADD CONSTRAINT order_items_ticket_type_id_fkey
FOREIGN KEY (ticket_type_id)
REFERENCES public.ticket_types(id)
ON DELETE CASCADE;

-- Now you can safely delete the service using the previous script