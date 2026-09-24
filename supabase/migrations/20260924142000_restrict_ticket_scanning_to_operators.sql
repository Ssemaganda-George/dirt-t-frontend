-- Ticket redemption and issuance must not be callable with the public API key.
REVOKE ALL ON FUNCTION public.verify_and_use_ticket_atomic(text,uuid)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.book_tickets_atomic(uuid,integer,uuid)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.book_tickets_atomic(uuid,uuid,integer)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_ticket_for_operator(
  p_ticket_code text, p_service_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR p_service_id IS NULL OR nullif(trim(p_ticket_code),'') IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Operator sign-in is required');
  END IF;
  IF NOT public.is_admin_user() AND NOT EXISTS (
    SELECT 1 FROM public.services s JOIN public.vendors v ON v.id=s.vendor_id
    WHERE s.id=p_service_id AND v.user_id=auth.uid()
  ) THEN
    RETURN jsonb_build_object('success',false,'error','Not authorized to scan this event');
  END IF;
  RETURN public.verify_and_use_ticket_atomic(p_ticket_code,p_service_id);
END;
$$;
REVOKE ALL ON FUNCTION public.verify_ticket_for_operator(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_ticket_for_operator(text,uuid) TO authenticated;
