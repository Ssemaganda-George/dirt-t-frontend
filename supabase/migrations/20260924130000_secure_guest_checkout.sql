-- Keep guest bookings bound to the private anonymous Auth session that created them.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_session_id uuid;
CREATE INDEX IF NOT EXISTS bookings_guest_session_id_idx ON public.bookings (guest_session_id)
  WHERE guest_session_id IS NOT NULL;

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
DROP TRIGGER IF EXISTS bind_guest_booking_session ON public.bookings;
CREATE TRIGGER bind_guest_booking_session BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.bind_guest_booking_session();

CREATE POLICY "Guests read own session bookings" ON public.bookings FOR SELECT TO authenticated
USING (is_guest_booking = true AND guest_session_id = (SELECT auth.uid()));

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
REVOKE ALL ON FUNCTION public.record_booking_terms_acceptance(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_booking_terms_acceptance(text, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_pending_booking_atomic(p_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_booking public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in required');
  END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;
  IF v_booking.status::text <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only pending bookings can be cancelled');
  END IF;
  IF v_booking.tourist_id IS DISTINCT FROM auth.uid()
     AND v_booking.guest_session_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to cancel this booking');
  END IF;
  UPDATE public.bookings SET status = 'cancelled', updated_at = now() WHERE id = p_booking_id;
  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id);
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_pending_booking_atomic(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pending_booking_atomic(uuid) TO authenticated, service_role;

-- The public RPC previously accepted unauthenticated booking writes. Only a private
-- anonymous Auth session (or a permanent signed-in user) may create a booking now.
REVOKE ALL ON FUNCTION public.create_booking_atomic(uuid,uuid,date,integer,numeric,uuid,date,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid,uuid,date,integer,numeric,uuid,date,text,text,text,text,text,text,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_booking_atomic(uuid,uuid,date,integer,numeric,uuid,date,text,text,text,text,text,text,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid,uuid,date,integer,numeric,uuid,date,text,text,text,text,text,text,text,numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.patch_booking_after_create(
  p_booking_id uuid, p_status text DEFAULT NULL, p_payment_status text DEFAULT NULL,
  p_payment_reference text DEFAULT NULL, p_platform_fee numeric DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_booking public.bookings%ROWTYPE; v_category text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success',false,'error','Sign in required'); END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Booking not found'); END IF;
  IF v_booking.tourist_id IS DISTINCT FROM auth.uid() AND v_booking.guest_session_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success',false,'error','Booking does not belong to this session');
  END IF;
  SELECT category_id INTO v_category FROM public.services WHERE id=v_booking.service_id;
  IF p_payment_status IS NOT NULL OR p_payment_reference IS NOT NULL OR p_platform_fee IS NOT NULL THEN
    RETURN jsonb_build_object('success',false,'error','Financial fields are server managed');
  END IF;
  IF p_status IS NOT NULL AND NOT (p_status='reserved' AND v_category='cat_restaurants' AND v_booking.status::text='pending') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid booking status transition');
  END IF;
  IF p_status='reserved' THEN
    UPDATE public.bookings SET status='reserved',updated_at=now() WHERE id=p_booking_id;
  END IF;
  RETURN jsonb_build_object('success',true,'booking_id',p_booking_id);
END;
$$;
REVOKE ALL ON FUNCTION public.patch_booking_after_create(uuid,text,text,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patch_booking_after_create(uuid,text,text,text,numeric) TO authenticated, service_role;

-- All ticket order mutations are tied to the current Auth identity. The browser
-- supplies quantities only; prices, vendor and currency come from the database.
CREATE OR REPLACE FUNCTION public.create_checkout_order(p_items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_item jsonb; v_ticket public.ticket_types%ROWTYPE; v_service public.services%ROWTYPE;
  v_order_id uuid; v_service_id uuid; v_quantity integer; v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Private checkout session required'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Select between 1 and 20 ticket types';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_count := v_count + 1;
    IF (v_item->>'quantity') !~ '^[0-9]{1,3}$' THEN RAISE EXCEPTION 'Invalid ticket quantity'; END IF;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity < 1 THEN RAISE EXCEPTION 'Ticket quantity must be positive'; END IF;
    SELECT * INTO v_ticket FROM public.ticket_types WHERE id = (v_item->>'ticket_type_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ticket type not found'; END IF;
    IF v_ticket.price IS NULL OR v_ticket.price <= 0 THEN RAISE EXCEPTION 'Ticket price is unavailable'; END IF;
    IF v_ticket.quantity IS NOT NULL AND v_quantity > v_ticket.quantity - coalesce(v_ticket.sold, 0) THEN
      RAISE EXCEPTION 'Not enough tickets available';
    END IF;
    IF v_service_id IS NULL THEN
      v_service_id := v_ticket.service_id;
      SELECT * INTO v_service FROM public.services WHERE id = v_service_id;
      IF v_service.status NOT IN ('approved', 'active') OR v_service.category_id = 'cat_restaurants' THEN
        RAISE EXCEPTION 'This service is unavailable for ticket checkout';
      END IF;
      INSERT INTO public.orders(user_id,vendor_id,total_amount,currency,status)
        VALUES(auth.uid(),v_service.vendor_id,0,v_service.currency,'pending') RETURNING id INTO v_order_id;
    ELSIF v_ticket.service_id IS DISTINCT FROM v_service_id THEN
      RAISE EXCEPTION 'Tickets must belong to one service';
    END IF;
    IF EXISTS (SELECT 1 FROM public.order_items WHERE order_id = v_order_id AND ticket_type_id = v_ticket.id) THEN
      RAISE EXCEPTION 'Duplicate ticket type';
    END IF;
    INSERT INTO public.order_items(order_id,ticket_type_id,quantity,unit_price,total_price)
      VALUES(v_order_id,v_ticket.id,v_quantity,v_ticket.price,v_ticket.price * v_quantity);
  END LOOP;
  UPDATE public.orders SET total_amount = (SELECT sum(total_price) FROM public.order_items WHERE order_id=v_order_id)
    WHERE id=v_order_id;
  RETURN v_order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_checkout_order(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_checkout_ticket_quantity(
  p_order_id uuid, p_ticket_type_id uuid, p_quantity integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE; v_ticket public.ticket_types%ROWTYPE; v_service_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_quantity NOT BETWEEN 0 AND 999 THEN RAISE EXCEPTION 'Invalid session or quantity'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id AND user_id=auth.uid() AND status='pending' FOR UPDATE;
  IF NOT FOUND OR v_order.terms_accepted_at IS NOT NULL THEN RAISE EXCEPTION 'Order cannot be edited'; END IF;
  SELECT * INTO v_ticket FROM public.ticket_types WHERE id=p_ticket_type_id;
  SELECT t.service_id INTO v_service_id FROM public.order_items i JOIN public.ticket_types t ON t.id=i.ticket_type_id
    WHERE i.order_id=p_order_id LIMIT 1;
  IF NOT FOUND OR v_ticket.service_id IS DISTINCT FROM v_service_id THEN RAISE EXCEPTION 'Wrong ticket type'; END IF;
  IF v_ticket.quantity IS NOT NULL AND p_quantity > v_ticket.quantity - coalesce(v_ticket.sold,0) THEN
    RAISE EXCEPTION 'Not enough tickets available';
  END IF;
  IF p_quantity = 0 THEN
    DELETE FROM public.order_items WHERE order_id=p_order_id AND ticket_type_id=p_ticket_type_id;
  ELSE
    INSERT INTO public.order_items(order_id,ticket_type_id,quantity,unit_price,total_price)
      SELECT p_order_id,p_ticket_type_id,p_quantity,v_ticket.price,v_ticket.price*p_quantity
      WHERE NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id=p_order_id AND ticket_type_id=p_ticket_type_id);
    UPDATE public.order_items SET quantity=p_quantity,unit_price=v_ticket.price,total_price=v_ticket.price*p_quantity
      WHERE order_id=p_order_id AND ticket_type_id=p_ticket_type_id;
  END IF;
  UPDATE public.orders SET total_amount=coalesce((SELECT sum(total_price) FROM public.order_items WHERE order_id=p_order_id),0),
    updated_at=now() WHERE id=p_order_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.set_checkout_ticket_quantity(uuid,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_checkout_ticket_quantity(uuid,uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.prepare_checkout_order(
  p_order_id uuid, p_guest_name text, p_guest_email text, p_guest_phone text
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.orders%ROWTYPE; v_item record; v_pricing jsonb; v_service_id uuid;
  v_total numeric := 0; v_base numeric := 0; v_fee numeric := 0; v_payout numeric := 0;
  v_fee_payer text; v_source text; v_reference uuid; v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Private checkout session required'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id AND user_id=auth.uid() AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.terms_accepted_at IS NULL THEN RAISE EXCEPTION 'Terms acceptance is required'; END IF;
  IF nullif(trim(p_guest_email),'') IS NULL THEN RAISE EXCEPTION 'Customer email is required'; END IF;
  FOR v_item IN SELECT i.id,i.quantity,t.id ticket_id,t.service_id,t.price,t.quantity available,t.sold
    FROM public.order_items i JOIN public.ticket_types t ON t.id=i.ticket_type_id WHERE i.order_id=p_order_id LOOP
    v_count := v_count + 1;
    IF v_item.quantity < 1 OR (v_item.available IS NOT NULL AND v_item.quantity > v_item.available-coalesce(v_item.sold,0)) THEN
      RAISE EXCEPTION 'Ticket quantity is unavailable';
    END IF;
    IF v_service_id IS NULL THEN v_service_id := v_item.service_id;
    ELSIF v_service_id IS DISTINCT FROM v_item.service_id THEN RAISE EXCEPTION 'Mixed services'; END IF;
    v_pricing := public.get_effective_pricing(v_item.service_id,v_item.price);
    IF coalesce((v_pricing->>'success')::boolean,false) = false THEN RAISE EXCEPTION 'Pricing unavailable'; END IF;
    v_total := v_total + (v_pricing->>'total_customer_payment')::numeric * v_item.quantity;
    v_base := v_base + (v_pricing->>'base_price')::numeric * v_item.quantity;
    v_fee := v_fee + (v_pricing->>'platform_fee')::numeric * v_item.quantity;
    v_payout := v_payout + (v_pricing->>'vendor_payout')::numeric * v_item.quantity;
    v_fee_payer := v_pricing->>'fee_payer'; v_source := v_pricing->>'pricing_source';
    v_reference := nullif(v_pricing->>'pricing_reference_id','')::uuid;
    UPDATE public.order_items SET unit_price=v_item.price,total_price=v_item.price*v_item.quantity WHERE id=v_item.id;
  END LOOP;
  IF v_count = 0 OR v_total <= 0 THEN RAISE EXCEPTION 'Select at least one priced ticket'; END IF;
  UPDATE public.orders SET guest_name=nullif(trim(p_guest_name),''),guest_email=trim(p_guest_email),
    guest_phone=nullif(trim(p_guest_phone),''),total_amount=round(v_total,0),base_price=round(v_base,0),
    platform_fee=round(v_fee,0),vendor_payout=round(v_payout,0),fee_payer=v_fee_payer,
    pricing_source=v_source,pricing_reference_id=v_reference,updated_at=now() WHERE id=p_order_id;
  RETURN round(v_total,0);
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_checkout_order(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_checkout_order(uuid,text,text,text) TO authenticated;
