-- Record a server-timestamped privacy acknowledgement for each booking/order.
-- This does not change pricing, payment state, wallet balances, or settlement.
CREATE TABLE public.checkout_privacy_consents (
  kind text NOT NULL CHECK (kind IN ('booking', 'order')),
  subject_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  notice_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, subject_id)
);

ALTER TABLE public.checkout_privacy_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_privacy_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.checkout_privacy_consents TO authenticated;
CREATE POLICY "Customers read own checkout privacy acknowledgement"
ON public.checkout_privacy_consents FOR SELECT TO authenticated
USING (actor_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.record_checkout_privacy_consent(
  p_kind text, p_subject_id uuid, p_notice_version text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR p_subject_id IS NULL OR p_notice_version IS DISTINCT FROM '2026-09-24' THEN
    RETURN false;
  END IF;
  IF p_kind = 'booking' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings b WHERE b.id = p_subject_id
        AND b.status::text = 'pending'
        AND (b.tourist_id = v_uid OR (b.is_guest_booking AND b.guest_session_id = v_uid))
    ) THEN RETURN false; END IF;
  ELSIF p_kind = 'order' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = p_subject_id
        AND o.status = 'pending' AND o.user_id = v_uid
    ) THEN RETURN false; END IF;
  ELSE
    RETURN false;
  END IF;

  INSERT INTO public.checkout_privacy_consents (kind, subject_id, actor_id, notice_version)
  VALUES (p_kind, p_subject_id, v_uid, p_notice_version)
  ON CONFLICT (kind, subject_id) DO NOTHING;

  RETURN EXISTS (
    SELECT 1 FROM public.checkout_privacy_consents c
    WHERE c.kind = p_kind AND c.subject_id = p_subject_id
      AND c.actor_id = v_uid AND c.notice_version = p_notice_version
  );
END;
$$;
REVOKE ALL ON FUNCTION public.record_checkout_privacy_consent(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_checkout_privacy_consent(text,uuid,text) TO authenticated;
