CREATE OR REPLACE FUNCTION public.bind_guest_booking_session()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.vendor_id IS DISTINCT FROM (SELECT s.vendor_id FROM public.services s WHERE s.id=NEW.service_id) THEN
    RAISE EXCEPTION 'Booking vendor does not match service';
  END IF;
  IF NEW.tourist_id IS NOT NULL AND NEW.tourist_id IS DISTINCT FROM auth.uid()
     AND coalesce(auth.jwt()->>'role','') <> 'service_role' THEN
    RAISE EXCEPTION 'Booking customer does not match session';
  END IF;
  IF NEW.is_guest_booking THEN
    IF auth.uid() IS NULL AND coalesce(auth.jwt()->>'role','') = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'A private guest session is required';
    END IF;
    NEW.guest_session_id := auth.uid();
  ELSE
    NEW.guest_session_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;
