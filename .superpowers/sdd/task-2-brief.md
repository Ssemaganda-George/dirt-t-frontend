### Task 2: `quotes` table, RPCs, RLS

**Files:**
- Create: `supabase/migrations/20260826120000_quote_payment_links.sql`

**Interfaces:**
- Consumes: `public.is_admin_user()`, existing `create_booking_atomic(...)`
- Produces: table `public.quotes`; RPCs `create_quote_pay_link`, `get_quote_pay_page`, `enable_quote_balance_link`, `cancel_quote_pay_link`

- [ ] **Step 1: Write the migration** (full file below â€” apply to live only in Task 2 Step 3 after reading it)

Key SQL (put the entire script in the migration file):

```sql
-- Quote pay links. Catalog prices unchanged. Collect amount is server-owned.

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_pricing_source_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_pricing_source_check
  CHECK (pricing_source IS NULL OR pricing_source = ANY (ARRAY['tier'::text, 'override'::text, 'quote'::text]));

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  token text NOT NULL UNIQUE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  booking_id uuid REFERENCES public.bookings(id),
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  agreed_total numeric NOT NULL CHECK (agreed_total > 0),
  display_currency text NOT NULL CHECK (display_currency = ANY (ARRAY['USD'::text, 'UGX'::text, 'RWF'::text])),
  charge_type text NOT NULL CHECK (charge_type = ANY (ARRAY['full'::text, 'deposit'::text, 'custom'::text])),
  collect_amount_ugx integer NOT NULL CHECK (collect_amount_ugx > 0),
  agreed_total_ugx integer NOT NULL CHECK (agreed_total_ugx > 0),
  amount_paid_ugx integer NOT NULL DEFAULT 0 CHECK (amount_paid_ugx >= 0),
  balance_enabled boolean NOT NULL DEFAULT false,
  valid_until timestamptz,
  notes text,
  service_date date,
  end_date date,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'deposit_paid'::text, 'paid'::text, 'expired'::text, 'cancelled'::text])),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_paid_not_over CHECK (amount_paid_ugx <= agreed_total_ugx),
  CONSTRAINT quotes_collect_not_over CHECK (collect_amount_ugx <= agreed_total_ugx)
);

CREATE INDEX IF NOT EXISTS idx_quotes_vendor ON public.quotes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_quotes_booking ON public.quotes(booking_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage quotes" ON public.quotes;
CREATE POLICY "Admins manage quotes"
  ON public.quotes FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Vendors read own quotes" ON public.quotes;
CREATE POLICY "Vendors read own quotes"
  ON public.quotes FOR SELECT
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.next_quote_invoice_no()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y int := EXTRACT(YEAR FROM timezone('utc', now()))::int;
  n int;
BEGIN
  SELECT COUNT(*)::int INTO n FROM public.quotes
  WHERE invoice_no LIKE ('DT-Q-' || y::text || '-%');
  RETURN 'DT-Q-' || y::text || '-' || lpad((n + 1)::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_quote_pay_link(
  p_vendor_id uuid,
  p_service_id uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_line_items jsonb,
  p_agreed_total numeric,
  p_display_currency text,
  p_charge_type text,
  p_collect_amount_ugx integer,
  p_agreed_total_ugx integer,
  p_invoice_no text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_service_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_valid_until timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat text;
  v_quote_id uuid;
  v_token text;
  v_invoice text;
  v_booking jsonb;
  v_booking_id uuid;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  SELECT category_id INTO v_cat FROM public.services WHERE id = p_service_id;
  IF v_cat IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'service_not_found');
  END IF;
  IF v_cat = 'cat_restaurants' THEN
    RETURN jsonb_build_object('success', false, 'error', 'restaurants_have_no_payment_links');
  END IF;

  IF p_collect_amount_ugx <= 0 OR p_agreed_total_ugx <= 0 OR p_collect_amount_ugx > p_agreed_total_ugx THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_ugx_amounts');
  END IF;

  v_token := translate(encode(gen_random_bytes(18), 'base64'), '+/', 'ab');
  v_invoice := NULLIF(trim(p_invoice_no), '');
  IF v_invoice IS NULL THEN
    v_invoice := public.next_quote_invoice_no();
  END IF;

  INSERT INTO public.quotes (
    invoice_no, token, vendor_id, service_id,
    guest_name, guest_email, guest_phone, line_items,
    agreed_total, display_currency, charge_type,
    collect_amount_ugx, agreed_total_ugx,
    valid_until, notes, service_date, end_date,
    status, created_by
  ) VALUES (
    v_invoice, v_token, p_vendor_id, p_service_id,
    trim(p_guest_name), lower(trim(p_guest_email)), trim(p_guest_phone), COALESCE(p_line_items, '[]'::jsonb),
    p_agreed_total, p_display_currency, p_charge_type,
    p_collect_amount_ugx, p_agreed_total_ugx,
    COALESCE(p_valid_until, timezone('utc', now()) + interval '30 days'),
    p_notes, COALESCE(p_service_date, CURRENT_DATE), p_end_date,
    'sent', auth.uid()
  )
  RETURNING id INTO v_quote_id;

  SELECT public.create_booking_atomic(
    p_service_id,
    p_vendor_id,
    CURRENT_DATE,
    1,
    p_collect_amount_ugx,
    NULL,
    COALESCE(p_service_date, CURRENT_DATE),
    'UGX',
    p_notes,
    trim(p_guest_name),
    lower(trim(p_guest_email)),
    trim(p_guest_phone),
    NULL,
    NULL,
    p_collect_amount_ugx
  ) INTO v_booking;

  IF COALESCE(v_booking->>'success', 'false') <> 'true' THEN
    DELETE FROM public.quotes WHERE id = v_quote_id;
    RETURN v_booking;
  END IF;

  v_booking_id := (v_booking->>'booking_id')::uuid;

  UPDATE public.bookings
  SET
    pricing_source = 'quote',
    pricing_reference_id = v_quote_id,
    platform_fee = 0,
    fee_payer = 'vendor',
    currency = 'UGX',
    end_date = p_end_date,
    updated_at = now()
  WHERE id = v_booking_id;

  UPDATE public.quotes
  SET booking_id = v_booking_id, updated_at = now()
  WHERE id = v_quote_id;

  RETURN jsonb_build_object(
    'success', true,
    'quote_id', v_quote_id,
    'booking_id', v_booking_id,
    'invoice_no', v_invoice,
    'token', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_quote_pay_page(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotes%ROWTYPE;
  svc_title text;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  SELECT title INTO svc_title FROM public.services WHERE id = q.service_id;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_no', q.invoice_no,
    'guest_name', q.guest_name,
    'line_items', q.line_items,
    'agreed_total', q.agreed_total,
    'display_currency', q.display_currency,
    'collect_amount_ugx', q.collect_amount_ugx,
    'agreed_total_ugx', q.agreed_total_ugx,
    'amount_paid_ugx', q.amount_paid_ugx,
    'status', q.status,
    'valid_until', q.valid_until,
    'balance_enabled', q.balance_enabled,
    'booking_id', q.booking_id,
    'service_title', svc_title,
    'notes', q.notes,
    'service_date', q.service_date
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enable_quote_balance_link(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.quotes%ROWTYPE;
  v_remain int;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF q.status <> 'deposit_paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_awaiting_balance');
  END IF;
  v_remain := q.agreed_total_ugx - q.amount_paid_ugx;
  IF v_remain <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_paid');
  END IF;
  UPDATE public.quotes
  SET collect_amount_ugx = v_remain, balance_enabled = true, updated_at = now()
  WHERE id = p_quote_id;
  RETURN jsonb_build_object('success', true, 'collect_amount_ugx', v_remain, 'token', q.token);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_quote_pay_link(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;
  UPDATE public.quotes
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_quote_id AND status IN ('sent', 'draft') AND amount_paid_ugx = 0;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_cancel');
  END IF;
  UPDATE public.bookings SET status = 'cancelled', updated_at = now()
  WHERE id = (SELECT booking_id FROM public.quotes WHERE id = p_quote_id)
    AND payment_status = 'pending';
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_quote_pay_link(uuid, uuid, text, text, text, jsonb, numeric, text, text, integer, integer, text, text, date, date, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quote_pay_page(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enable_quote_balance_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_quote_pay_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_quote_invoice_no() TO authenticated;

REVOKE ALL ON FUNCTION public.create_quote_pay_link(uuid, uuid, text, text, text, jsonb, numeric, text, text, integer, integer, text, text, date, date, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enable_quote_balance_link(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_quote_pay_link(uuid) FROM PUBLIC, anon;
```

Confirm `create_booking_atomic` live signature matches the call (positional args in the migration above). If the live function has extra args, match `supabase/migrations/20260612180100_restaurant_reservation_status.sql`.

- [ ] **Step 2: Apply migration to Travel Tails**

Use Supabase MCP `apply_migration` with project Travel Tails and the SQL from the file. Then:

```sql
SELECT to_regclass('public.quotes');
SELECT proname FROM pg_proc WHERE proname IN ('create_quote_pay_link','get_quote_pay_page');
```

Expected: `quotes`, both function names.

- [ ] **Step 3: Halt if restaurant can execute create** â€” call `create_quote_pay_link` is admin-only; do not test as anon.

---

