-- SQL Commands to Fix Foreign Key Constraint and Delete Service
-- Run these commands in your Supabase SQL Editor in the correct order

-- Step 1: Change the foreign key constraint from RESTRICT to CASCADE
-- This allows order_items to be deleted when ticket_types are deleted
ALTER TABLE public.order_items
DROP CONSTRAINT order_items_ticket_type_id_fkey;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_ticket_type_id_fkey
FOREIGN KEY (ticket_type_id)
REFERENCES public.ticket_types(id)
ON DELETE CASCADE;

-- Step 2: Delete the service using the updated function
-- This will now work because the CASCADE constraint allows proper deletion
SELECT delete_service_atomic('b5980e78-d57a-4438-8787-eb92a774c687'::uuid, NULL, true);

-- Alternative: Manual deletion if the function doesn't work
-- DELETE FROM public.tickets WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';
-- DELETE FROM public.order_items WHERE ticket_type_id IN (SELECT id FROM public.ticket_types WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687');
-- DELETE FROM public.orders WHERE id NOT IN (SELECT DISTINCT order_id FROM public.order_items);
-- DELETE FROM public.ticket_types WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';
-- DELETE FROM public.services WHERE id = 'b5980e78-d57a-4438-8787-eb92a774c687';