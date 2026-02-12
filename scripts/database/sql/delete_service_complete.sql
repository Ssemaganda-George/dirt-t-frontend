-- SQL to delete service b5980e78-d57a-4438-8787-eb92a774c687 and all related data
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    service_uuid uuid := 'b5980e78-d57a-4438-8787-eb92a774c687';
BEGIN
    -- Delete in reverse dependency order to avoid foreign key violations

    -- 1. Delete visitor activity records for this service
    DELETE FROM public.visitor_activity WHERE service_id = service_uuid;

    -- 2. Delete service reviews
    DELETE FROM public.service_reviews WHERE service_id = service_uuid;

    -- 3. Delete service likes
    DELETE FROM public.service_likes WHERE service_id = service_uuid;

    -- 4. Delete scan sessions
    DELETE FROM public.scan_sessions WHERE service_id = service_uuid;

    -- 5. Delete review tokens
    DELETE FROM public.review_tokens WHERE service_id = service_uuid;

    -- 6. Delete activation requests
    DELETE FROM public.activation_requests WHERE service_id = service_uuid;

    -- 7. Delete service delete requests
    DELETE FROM public.service_delete_requests WHERE service_id = service_uuid;

    -- 8. Delete tickets (these reference the service directly)
    DELETE FROM public.tickets WHERE service_id = service_uuid;

    -- 9. Get all ticket_type_ids for this service and delete related order_items
    DELETE FROM public.order_items
    WHERE ticket_type_id IN (
        SELECT id FROM public.ticket_types WHERE service_id = service_uuid
    );

    -- 10. Delete orders that no longer have any order_items
    DELETE FROM public.orders
    WHERE id NOT IN (
        SELECT DISTINCT order_id FROM public.order_items
    );

    -- 11. Delete ticket_types for this service
    DELETE FROM public.ticket_types WHERE service_id = service_uuid;

    -- 12. Finally delete the service itself
    DELETE FROM public.services WHERE id = service_uuid;

    RAISE NOTICE 'Service % and all related data deleted successfully', service_uuid;
END $$;