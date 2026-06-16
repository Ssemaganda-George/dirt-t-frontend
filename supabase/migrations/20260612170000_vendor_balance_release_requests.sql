-- Vendor-initiated early release of pending wallet holds, with admin approval.

CREATE TABLE IF NOT EXISTS public.vendor_balance_release_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  hold_id uuid NOT NULL REFERENCES public.vendor_balance_holds(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'UGX',
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 10),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_notes text NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_balance_release_requests_hold_pending
  ON public.vendor_balance_release_requests (hold_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_vendor_balance_release_requests_status
  ON public.vendor_balance_release_requests (status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_balance_release_requests_vendor
  ON public.vendor_balance_release_requests (vendor_id, status);

ALTER TABLE public.vendor_balance_release_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_vendor_balance_release_requests"
  ON public.vendor_balance_release_requests;
CREATE POLICY "service_role_all_vendor_balance_release_requests"
ON public.vendor_balance_release_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "vendors_read_own_balance_release_requests"
  ON public.vendor_balance_release_requests;
CREATE POLICY "vendors_read_own_balance_release_requests"
ON public.vendor_balance_release_requests
FOR SELECT
TO authenticated
USING (
  vendor_id IN (
    SELECT v.id FROM public.vendors v
    WHERE v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admins_read_balance_release_requests"
  ON public.vendor_balance_release_requests;
CREATE POLICY "admins_read_balance_release_requests"
ON public.vendor_balance_release_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Vendors can read their own pending holds (for the request UI).
DROP POLICY IF EXISTS "vendors_read_own_balance_holds" ON public.vendor_balance_holds;
CREATE POLICY "vendors_read_own_balance_holds"
ON public.vendor_balance_holds
FOR SELECT
TO authenticated
USING (
  vendor_id IN (
    SELECT v.id FROM public.vendors v
    WHERE v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "admins_read_balance_holds" ON public.vendor_balance_holds;
CREATE POLICY "admins_read_balance_holds"
ON public.vendor_balance_holds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.assert_vendor_owns_hold(
  p_hold_id uuid,
  p_vendor_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendor_balance_holds h
    JOIN public.vendors v ON v.id = h.vendor_id
    WHERE h.id = p_hold_id
      AND h.vendor_id = p_vendor_id
      AND h.status = 'pending'
      AND v.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.submit_vendor_balance_release_request(
  p_hold_id uuid,
  p_vendor_id uuid,
  p_reason text,
  p_requested_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_hold record;
  v_request_id uuid;
  v_trimmed_reason text;
BEGIN
  v_trimmed_reason := trim(COALESCE(p_reason, ''));
  IF char_length(v_trimmed_reason) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please provide a reason (at least 10 characters)');
  END IF;

  IF NOT public.assert_vendor_owns_hold(p_hold_id, p_vendor_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hold not found or not eligible for release request');
  END IF;

  SELECT * INTO v_hold
  FROM public.vendor_balance_holds
  WHERE id = p_hold_id
    AND vendor_id = p_vendor_id
    AND status = 'pending'
  FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.vendor_balance_release_requests
    WHERE hold_id = p_hold_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A pending release request already exists for this hold');
  END IF;

  INSERT INTO public.vendor_balance_release_requests (
    vendor_id,
    hold_id,
    amount,
    currency,
    reason,
    requested_by
  ) VALUES (
    p_vendor_id,
    p_hold_id,
    v_hold.amount,
    v_hold.currency,
    v_trimmed_reason,
    p_requested_by
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'hold_id', p_hold_id,
    'amount', v_hold.amount,
    'currency', v_hold.currency
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_vendor_balance_release_request(
  p_request_id uuid,
  p_approve boolean,
  p_admin_id uuid,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_request record;
  v_release_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reviewer must be an admin');
  END IF;

  SELECT * INTO v_request
  FROM public.vendor_balance_release_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Release request not found');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is no longer pending');
  END IF;

  IF p_approve THEN
    v_release_result := public.release_vendor_balance_hold(v_request.hold_id);

    IF NOT (v_release_result->>'success')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to release hold: ' || COALESCE(v_release_result->>'error', 'unknown')
      );
    END IF;

    UPDATE public.vendor_balance_release_requests
    SET
      status = 'approved',
      reviewed_by = p_admin_id,
      admin_notes = NULLIF(trim(p_admin_notes), ''),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'request_id', p_request_id,
      'release', v_release_result
    );
  END IF;

  UPDATE public.vendor_balance_release_requests
  SET
    status = 'rejected',
    reviewed_by = p_admin_id,
    admin_notes = NULLIF(trim(p_admin_notes), ''),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'rejected',
    'request_id', p_request_id
  );
END;
$$;

COMMENT ON TABLE public.vendor_balance_release_requests IS
  'Vendor requests to release pending wallet funds before automatic eligibility; admin approves or rejects.';
COMMENT ON FUNCTION public.submit_vendor_balance_release_request IS
  'Vendor submits early release request with reason for a pending balance hold.';
COMMENT ON FUNCTION public.review_vendor_balance_release_request IS
  'Admin approves (releases hold to available) or rejects a vendor release request.';

GRANT EXECUTE ON FUNCTION public.submit_vendor_balance_release_request(uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_vendor_balance_release_request(uuid, boolean, uuid, text) TO authenticated;
