-- 013_admin_select_trees.sql
-- Allow admin users to SELECT all trees (including unapproved) so admin UI can manage submissions.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'trees' AND p.polname = 'admin_select_all') THEN
    EXECUTE 'DROP POLICY admin_select_all ON public.trees';
  END IF;
END$$;

-- Admin SELECT: allow JWTs with role='admin' to read all rows
CREATE POLICY admin_select_all
  ON public.trees
  FOR SELECT
  USING ((current_setting('jwt.claims', true) IS NOT NULL) AND (current_setting('jwt.claims', true)::json ->> 'role' = 'admin'));

-- Note: Adjust the role check if your JWT uses a different claim name/value for admins.
