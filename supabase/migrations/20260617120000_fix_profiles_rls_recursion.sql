-- Fix infinite recursion (42P17) after enabling RLS on profiles.
-- Policies must not SELECT from profiles inside profiles RLS; use SECURITY DEFINER helpers.

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_vendor_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'vendor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_vendor_user() TO anon, authenticated, service_role;

-- ── profiles (root cause) ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Vendor view own and tourist profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins select all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Vendors read profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins select all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_user());

CREATE POLICY "Admins insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Vendors read profiles"
  ON public.profiles FOR SELECT
  USING (public.is_vendor_user());

-- ── tables updated in RLS phase 1 (same anti-pattern) ─────────────────────────
DROP POLICY IF EXISTS "Admins manage all bookings" ON public.bookings;
CREATE POLICY "Admins manage all bookings"
  ON public.bookings FOR ALL
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
CREATE POLICY "Admins can update transactions"
  ON public.transactions FOR UPDATE
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
CREATE POLICY "Admins can view all wallets"
  ON public.wallets FOR SELECT
  USING (public.is_admin_user());
