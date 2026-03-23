-- 012_policies_trees.sql
-- Drop conflicting policies if present, enable RLS, and create safe policies for `trees`.

-- Drop policies if they already exist (avoids duplicate policy errors)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'trees' AND p.polname = 'public_select_approved') THEN
    EXECUTE 'DROP POLICY public_select_approved ON public.trees';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'trees' AND p.polname = 'auth_insert_trees') THEN
    EXECUTE 'DROP POLICY auth_insert_trees ON public.trees';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'trees' AND p.polname = 'admin_update_approved') THEN
    EXECUTE 'DROP POLICY admin_update_approved ON public.trees';
  END IF;
END$$;

-- Ensure row-level security is enabled
ALTER TABLE IF EXISTS public.trees ENABLE ROW LEVEL SECURITY;

-- Public SELECT: only return approved trees
CREATE POLICY public_select_approved
  ON public.trees
  FOR SELECT
  USING (approved = true);

-- Allow authenticated users to INSERT new trees
-- Requires the client to be signed-in (auth.uid() IS NOT NULL)
CREATE POLICY auth_insert_trees
  ON public.trees
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Example: allow only admins to update the `approved` column.
-- Replace the condition `request.jwt.claims.role = 'admin'` with how your JWT denotes admins.
-- If you use a custom claim like `is_admin=true`, change the expression accordingly.
-- Create an admin-only update policy. Use `current_setting('jwt.claims', true)` to read JWT claims
-- in a Postgres-safe way and avoid cross-database reference errors.
CREATE POLICY admin_update_approved
  ON public.trees
  FOR UPDATE
  USING ((current_setting('jwt.claims', true) IS NOT NULL) AND (current_setting('jwt.claims', true)::json ->> 'role' = 'admin'))
  WITH CHECK ((current_setting('jwt.claims', true) IS NOT NULL) AND (current_setting('jwt.claims', true)::json ->> 'role' = 'admin'));

-- Note: adjust the admin condition to match your project's JWT claims.
