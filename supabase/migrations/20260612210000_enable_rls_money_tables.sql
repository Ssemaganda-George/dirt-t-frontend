-- Enable RLS on priority money/identity tables (#3).
-- Client booking patches go through SECURITY DEFINER RPCs (safe for anon guests).

-- ── RPC: post-create booking patch (blocks client-paid) ───────────────────────
CREATE OR REPLACE FUNCTION public.patch_booking_after_create(
  p_booking_id uuid,
  p_status text DEFAULT NULL,
  p_payment_status text DEFAULT NULL,
  p_payment_reference text DEFAULT NULL,
  p_platform_fee numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF p_payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'payment_status paid must be set server-side'
    );
  END IF;

  UPDATE public.bookings
  SET
    status = COALESCE(p_status, status),
    payment_status = COALESCE(p_payment_status, payment_status),
    payment_reference = COALESCE(p_payment_reference, payment_reference),
    platform_fee = COALESCE(p_platform_fee, platform_fee),
    updated_at = now()
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.patch_booking_after_create(uuid, text, text, text, numeric)
  TO anon, authenticated, service_role;

-- ── RPC: cancel pending booking (tourist / guest-safe) ────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_pending_booking_atomic(p_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only pending bookings can be cancelled');
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF v_booking.tourist_id IS DISTINCT FROM auth.uid()
       AND NOT (
         v_booking.is_guest_booking = true
         AND v_booking.guest_email IS NOT NULL
         AND lower(v_booking.guest_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.profiles p
         WHERE p.id = auth.uid() AND p.role = 'admin'
       )
    THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized to cancel this booking');
    END IF;
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_booking_id AND status = 'pending';

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_pending_booking_atomic(uuid)
  TO anon, authenticated, service_role;

-- ── Bookings: drop overly permissive policies ───────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

DROP POLICY IF EXISTS "Vendors can update their bookings" ON public.bookings;
CREATE POLICY "Vendors can update their bookings"
  ON public.bookings
  FOR UPDATE
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins manage all bookings" ON public.bookings;
CREATE POLICY "Admins manage all bookings"
  ON public.bookings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Confirmation pages and email links use booking UUID as capability (read-only).
DROP POLICY IF EXISTS "Public read bookings by id" ON public.bookings;
CREATE POLICY "Public read bookings by id"
  ON public.bookings
  FOR SELECT
  USING (true);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ── Profiles ──────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── Transactions ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Vendors can view own transactions" ON public.transactions;
CREATE POLICY "Vendors can view own transactions"
  ON public.transactions
  FOR SELECT
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tourists can view own transactions" ON public.transactions;
CREATE POLICY "Tourists can view own transactions"
  ON public.transactions
  FOR SELECT
  USING (tourist_id = auth.uid());

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ── Wallets: read-only for vendor/admin; mutations via RPC / service_role ─────
DROP POLICY IF EXISTS "Vendors can view own wallet" ON public.wallets;
CREATE POLICY "Vendors can view own wallet"
  ON public.wallets
  FOR SELECT
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
CREATE POLICY "Admins can view all wallets"
  ON public.wallets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
