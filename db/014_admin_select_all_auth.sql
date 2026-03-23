-- 014_admin_select_all_auth.sql
-- Temporarily allow any authenticated user to SELECT all rows from `trees`.
-- Use this to verify admin UI behavior; replace with stricter admin check later.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'trees' AND p.polname = 'admin_select_all') THEN
    EXECUTE 'DROP POLICY admin_select_all ON public.trees';
  END IF;
END$$;

CREATE POLICY admin_select_all
  ON public.trees
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- WARNING: This policy lets any authenticated user read all trees (including unapproved).
-- Replace with a stricter policy once you've verified admin UI behavior (e.g., check a 'role' claim or an 'admins' table).
