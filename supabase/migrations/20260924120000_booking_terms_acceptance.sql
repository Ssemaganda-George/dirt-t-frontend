-- Preserve evidence of an affirmative agreement before a booking or order is paid.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_accepted_by uuid;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_accepted_by uuid;

CREATE OR REPLACE FUNCTION public.protect_booking_terms_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.recording_terms', true) IS DISTINCT FROM 'on'
     AND (NEW.terms_version, NEW.terms_accepted_at, NEW.terms_accepted_by)
         IS DISTINCT FROM (OLD.terms_version, OLD.terms_accepted_at, OLD.terms_accepted_by)
  THEN
    RAISE EXCEPTION 'Terms acceptance can only be recorded through its RPC';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_booking_terms_acceptance ON public.bookings;
CREATE TRIGGER protect_booking_terms_acceptance
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.protect_booking_terms_acceptance();

DROP TRIGGER IF EXISTS protect_order_terms_acceptance ON public.orders;
CREATE TRIGGER protect_order_terms_acceptance
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.protect_booking_terms_acceptance();

CREATE OR REPLACE FUNCTION public.record_booking_terms_acceptance(
  p_kind text,
  p_subject_id uuid,
  p_terms_version text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row_count integer := 0;
BEGIN
  IF p_terms_version IS DISTINCT FROM '2026-09-24' OR p_subject_id IS NULL THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.recording_terms', 'on', true);

  IF p_kind = 'booking' THEN
    UPDATE public.bookings
    SET terms_version = p_terms_version,
        terms_accepted_at = now(),
        terms_accepted_by = auth.uid()
    WHERE id = p_subject_id
      AND terms_accepted_at IS NULL
      AND status::text = 'pending'
      AND (
        tourist_id = auth.uid()
        OR (auth.uid() IS NULL AND is_guest_booking = true)
      );
  ELSIF p_kind = 'order' THEN
    UPDATE public.orders
    SET terms_version = p_terms_version,
        terms_accepted_at = now(),
        terms_accepted_by = auth.uid()
    WHERE id = p_subject_id
      AND terms_accepted_at IS NULL
      AND status = 'pending'
      AND (
        user_id = auth.uid()
        OR (auth.uid() IS NULL AND user_id IS NULL)
      );
  ELSE
    RETURN false;
  END IF;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_booking_terms_acceptance(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_booking_terms_acceptance(text, uuid, text)
  TO anon, authenticated, service_role;
