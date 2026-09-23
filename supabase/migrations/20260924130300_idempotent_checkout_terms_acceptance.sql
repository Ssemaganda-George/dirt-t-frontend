CREATE OR REPLACE FUNCTION public.record_booking_terms_acceptance(
  p_kind text, p_subject_id uuid, p_terms_version text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR p_terms_version IS DISTINCT FROM '2026-09-24' OR p_subject_id IS NULL THEN
    RETURN false;
  END IF;
  IF p_kind = 'booking' AND EXISTS (
    SELECT 1 FROM public.bookings WHERE id=p_subject_id AND terms_version=p_terms_version
      AND terms_accepted_at IS NOT NULL
      AND (tourist_id=auth.uid() OR (is_guest_booking AND guest_session_id=auth.uid()))
  ) THEN RETURN true; END IF;
  IF p_kind = 'order' AND EXISTS (
    SELECT 1 FROM public.orders WHERE id=p_subject_id AND terms_version=p_terms_version
      AND terms_accepted_at IS NOT NULL AND user_id=auth.uid()
  ) THEN RETURN true; END IF;
  PERFORM set_config('app.recording_terms', 'on', true);
  IF p_kind = 'booking' THEN
    UPDATE public.bookings SET terms_version = p_terms_version,
      terms_accepted_at = now(), terms_accepted_by = auth.uid()
    WHERE id = p_subject_id AND terms_accepted_at IS NULL AND status::text = 'pending'
      AND (tourist_id = auth.uid() OR (is_guest_booking AND guest_session_id = auth.uid()));
  ELSIF p_kind = 'order' THEN
    UPDATE public.orders SET terms_version = p_terms_version,
      terms_accepted_at = now(), terms_accepted_by = auth.uid()
    WHERE id = p_subject_id AND terms_accepted_at IS NULL AND status = 'pending'
      AND user_id = auth.uid();
  ELSE
    RETURN false;
  END IF;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count = 1;
END;
$$;
