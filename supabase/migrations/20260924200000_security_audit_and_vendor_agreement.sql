-- Fix login IP capture (auth.sessions uses column "ip", not "ip_address").
-- Add immutable security_change_audit for fraud/trace controls.
-- Add vendor operator agreement acceptances (version + SHA-256).

CREATE OR REPLACE FUNCTION public.log_login_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb := to_jsonb(NEW);
  old_payload jsonb := NULL;
  ip text := NULL;
  ua text := NULL;
  country text := NULL;
  created_at timestamptz := now();
BEGIN
  BEGIN
    ip := COALESCE(NEW.ip::text, payload ->> 'ip', payload ->> 'ip_address');
    ua := COALESCE(NEW.user_agent, payload ->> 'user_agent');
    country := payload ->> 'country';
    IF (payload ->> 'created_at') IS NOT NULL THEN
      BEGIN
        created_at := (payload ->> 'created_at')::timestamptz;
      EXCEPTION WHEN others THEN
        created_at := now();
      END;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      old_payload := to_jsonb(OLD);
    END IF;

    IF TG_OP = 'INSERT' OR (
         TG_OP = 'UPDATE' AND (
           (payload ->> 'created_at') IS DISTINCT FROM (old_payload ->> 'created_at') OR
           (payload ->> 'refreshed_at') IS DISTINCT FROM (old_payload ->> 'refreshed_at')
         )
       ) THEN
      INSERT INTO public.login_history(user_id, ip_address, user_agent, country, created_at)
      VALUES (
        NEW.user_id,
        NULLIF(ip, ''),
        NULLIF(ua, ''),
        NULLIF(country, ''),
        created_at
      )
      ON CONFLICT (user_id, created_at) DO NOTHING;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not log login history: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.security_change_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  table_name text NOT NULL,
  record_id uuid,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid,
  old_row jsonb,
  new_row jsonb
);

CREATE INDEX IF NOT EXISTS security_change_audit_table_time_idx
  ON public.security_change_audit (table_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS security_change_audit_record_idx
  ON public.security_change_audit (record_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.sanitize_audit_row(p_table text, p_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_row IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_table = 'vendors' THEN
    RETURN p_row
      - 'bank_details'
      - 'mobile_money_accounts'
      - 'crypto_accounts'
      - 'bank_details_encrypted'
      - 'mobile_money_accounts_encrypted'
      - 'crypto_accounts_encrypted';
  END IF;
  IF p_table = 'payments' THEN
    RETURN p_row - 'marzpay_response' - 'webhook_data';
  END IF;
  RETURN p_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_security_change_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := public.sanitize_audit_row(TG_TABLE_NAME, to_jsonb(OLD));
    v_id := NULLIF(v_old ->> 'id', '')::uuid;
    INSERT INTO public.security_change_audit(table_name, record_id, operation, actor_id, old_row, new_row)
    VALUES (TG_TABLE_NAME, v_id, 'DELETE', auth.uid(), v_old, NULL);
    RETURN OLD;
  END IF;

  v_new := public.sanitize_audit_row(TG_TABLE_NAME, to_jsonb(NEW));
  v_id := NULLIF(v_new ->> 'id', '')::uuid;
  IF TG_OP = 'UPDATE' THEN
    v_old := public.sanitize_audit_row(TG_TABLE_NAME, to_jsonb(OLD));
  END IF;

  INSERT INTO public.security_change_audit(table_name, record_id, operation, actor_id, old_row, new_row)
  VALUES (TG_TABLE_NAME, v_id, TG_OP, auth.uid(), v_old, v_new);
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bookings', 'orders', 'payments', 'transactions', 'wallets', 'vendors', 'profiles'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_security_change_audit ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_security_change_audit
       AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.record_security_change_audit()',
      t
    );
  END LOOP;
END $$;

ALTER TABLE public.security_change_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read security change audit" ON public.security_change_audit;
CREATE POLICY "Admins read security change audit" ON public.security_change_audit
FOR SELECT TO authenticated USING (public.is_admin_user());

REVOKE ALL ON public.security_change_audit FROM anon, authenticated;
GRANT SELECT ON public.security_change_audit TO authenticated;
-- no insert/update/delete for clients; trigger is security definer

CREATE TABLE IF NOT EXISTS public.vendor_agreement_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  agreement_version text NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE (vendor_id, agreement_version)
);

CREATE INDEX IF NOT EXISTS vendor_agreement_acceptances_user_idx
  ON public.vendor_agreement_acceptances (user_id, accepted_at DESC);

ALTER TABLE public.vendor_agreement_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors read own agreement acceptances" ON public.vendor_agreement_acceptances;
CREATE POLICY "Vendors read own agreement acceptances" ON public.vendor_agreement_acceptances
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_user()
  OR EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = vendor_id AND v.user_id = auth.uid()
  )
);

REVOKE ALL ON public.vendor_agreement_acceptances FROM anon;
GRANT SELECT ON public.vendor_agreement_acceptances TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_vendor_operator_agreement(
  p_agreement_version text,
  p_content_sha256 text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_expected_version constant text := '2026-09-24';
  v_expected_hash constant text := '8b9bcf1d07b68811b8f40ebd385ff90c49c513854a87ea35d2d8d3c49b051d49';
  v_row public.vendor_agreement_acceptances%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_agreement_version IS DISTINCT FROM v_expected_version THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported agreement version');
  END IF;
  IF lower(p_content_sha256) IS DISTINCT FROM v_expected_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agreement hash mismatch');
  END IF;

  SELECT * INTO v_vendor FROM public.vendors WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendor profile not found');
  END IF;

  INSERT INTO public.vendor_agreement_acceptances (
    vendor_id, user_id, agreement_version, content_sha256, ip_address, user_agent
  ) VALUES (
    v_vendor.id, auth.uid(), v_expected_version, v_expected_hash,
    NULLIF(btrim(p_ip_address), ''), NULLIF(btrim(p_user_agent), '')
  )
  ON CONFLICT (vendor_id, agreement_version) DO UPDATE
    SET accepted_at = now(),
        content_sha256 = EXCLUDED.content_sha256,
        ip_address = COALESCE(EXCLUDED.ip_address, public.vendor_agreement_acceptances.ip_address),
        user_agent = COALESCE(EXCLUDED.user_agent, public.vendor_agreement_acceptances.user_agent)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success', true,
    'acceptance_id', v_row.id,
    'vendor_id', v_row.vendor_id,
    'agreement_version', v_row.agreement_version,
    'content_sha256', v_row.content_sha256,
    'accepted_at', v_row.accepted_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_vendor_operator_agreement(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_vendor_operator_agreement(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_vendor_status_atomic(
  p_vendor_id uuid,
  p_status text,
  p_approved_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor record;
  v_has_agreement boolean := false;
BEGIN
  SELECT * INTO v_vendor
  FROM public.vendors
  WHERE id = p_vendor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendor not found');
  END IF;

  IF p_status = 'approved' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.vendor_agreement_acceptances a
      WHERE a.vendor_id = p_vendor_id
        AND a.agreement_version = '2026-09-24'
        AND a.content_sha256 = '8b9bcf1d07b68811b8f40ebd385ff90c49c513854a87ea35d2d8d3c49b051d49'
    ) INTO v_has_agreement;
    IF NOT v_has_agreement THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Vendor must accept the current operator agreement before approval'
      );
    END IF;
  END IF;

  UPDATE public.vendors
  SET
    status = p_status,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END,
    approved_by = CASE WHEN p_status = 'approved' THEN p_approved_by ELSE approved_by END,
    updated_at = now()
  WHERE id = p_vendor_id;

  RETURN jsonb_build_object('success', true, 'vendor_id', p_vendor_id, 'new_status', p_status);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
