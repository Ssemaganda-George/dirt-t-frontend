-- Safe SQL to delete service and all related data (only from tables that exist)
-- Run these commands one by one in Supabase SQL Editor

-- Delete visitor activity records
DELETE FROM public.visitor_activity WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';

-- Delete service reviews
DELETE FROM public.service_reviews WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';

-- Delete service likes
DELETE FROM public.service_likes WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';

-- Delete activation requests
DELETE FROM public.activation_requests WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';

-- Delete service delete requests
DELETE FROM public.service_delete_requests WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';

-- Delete tickets
DELETE FROM public.tickets WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';

-- Delete order_items that reference ticket_types of this service
DELETE FROM public.order_items
WHERE ticket_type_id IN (
    SELECT id FROM public.ticket_types WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687'
);

-- Delete orders that no longer have any order_items
DELETE FROM public.orders
WHERE id NOT IN (
    SELECT DISTINCT order_id FROM public.order_items
);

-- Delete ticket_types
DELETE FROM public.ticket_types WHERE service_id = 'b5980e78-d57a-4438-8787-eb92a774c687';

-- Finally delete the service
DELETE FROM public.services WHERE id = 'b5980e78-d57a-4438-8787-eb92a774c687';