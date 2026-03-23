-- 015_admin_update_trees.sql
-- Allow only users with role 'admin' in the JWT claims to UPDATE rows in public.trees
-- Note: This requires that admin users' JWTs include { "role": "admin" } in their claims.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'trees' AND p.polname = 'admin_update') THEN
    EXECUTE 'DROP POLICY admin_update ON public.trees';
  END IF;
END$$;

CREATE POLICY admin_update
  ON public.trees
  FOR UPDATE
  USING (
    (current_setting('jwt.claims', true)::json ->> 'role') = 'admin'
  )
  WITH CHECK (
    (current_setting('jwt.claims', true)::json ->> 'role') = 'admin'
  );

-- This policy permits only JWTs with claim role='admin' to update rows. If your admin users don't
-- have that claim, either add it in your auth system or use a secure server-side endpoint (service_role key)
-- to perform admin updates.
