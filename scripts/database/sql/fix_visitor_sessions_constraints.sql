-- Fix visitor_sessions foreign key constraint to prevent unique constraint violations
-- When a user is deleted, instead of setting user_id to NULL (which can cause duplicates),
-- we should delete the visitor_sessions records entirely

-- Drop the existing foreign key constraint
ALTER TABLE public.visitor_sessions
DROP CONSTRAINT IF EXISTS visitor_sessions_user_id_fkey;

-- Add the constraint back with CASCADE delete
ALTER TABLE public.visitor_sessions
ADD CONSTRAINT visitor_sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also update service_likes to cascade properly
ALTER TABLE public.service_likes
DROP CONSTRAINT IF EXISTS service_likes_user_id_fkey;

ALTER TABLE public.service_likes
ADD CONSTRAINT service_likes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;