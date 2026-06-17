-- Idempotent ticket issuance: safe to retry after partial fulfillment failures.

CREATE OR REPLACE FUNCTION public.book_tickets_atomic(
  p_ticket_type_id uuid,
  p_quantity integer,
  p_order_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_ticket_type record;
  v_existing_count integer;
  v_to_create integer;
  v_available_tickets integer;
  v_created integer := 0;
  v_i integer;
  v_code text;
  v_attempt integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  SELECT COUNT(*)::integer INTO v_existing_count
  FROM public.tickets
  WHERE order_id = p_order_id
    AND ticket_type_id = p_ticket_type_id
    AND status IN ('issued', 'confirmed', 'paid');

  IF v_existing_count >= p_quantity THEN
    RETURN jsonb_build_object(
      'success', true,
      'tickets_created', v_existing_count,
      'skipped', true,
      'idempotent', true
    );
  END IF;

  v_to_create := p_quantity - v_existing_count;

  SELECT * INTO v_ticket_type
  FROM public.ticket_types
  WHERE id = p_ticket_type_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket type not found');
  END IF;

  IF v_ticket_type.sale_start IS NOT NULL AND now() < v_ticket_type.sale_start THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket sales have not started yet');
  END IF;

  IF v_ticket_type.sale_end IS NOT NULL AND now() > v_ticket_type.sale_end THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ticket sales have ended');
  END IF;

  v_available_tickets := v_ticket_type.quantity - v_ticket_type.sold;

  IF v_available_tickets < v_to_create THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Only %s tickets available, requested %s more', v_available_tickets, v_to_create)
    );
  END IF;

  UPDATE public.ticket_types
  SET sold = sold + v_to_create,
      version = version + 1,
      updated_at = now()
  WHERE id = p_ticket_type_id;

  FOR v_i IN 1..v_to_create LOOP
    v_attempt := 0;
    LOOP
      v_attempt := v_attempt + 1;
      IF v_attempt > 8 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to generate unique ticket code');
      END IF;

      v_code := UPPER('TKT-' || encode(gen_random_bytes(6), 'hex'));

      BEGIN
        INSERT INTO public.tickets (
          order_id,
          ticket_type_id,
          service_id,
          code,
          qr_data,
          status,
          issued_at
        ) VALUES (
          p_order_id,
          p_ticket_type_id,
          v_ticket_type.service_id,
          v_code,
          v_code,
          'issued',
          now()
        );
        v_created := v_created + 1;
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          CONTINUE;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'tickets_created', v_existing_count + v_created,
    'new_tickets', v_created,
    'idempotent', v_existing_count > 0
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.book_tickets_atomic(uuid, integer, uuid) IS
  'Atomically issues tickets for an order line; idempotent when tickets already exist for order+type.';
