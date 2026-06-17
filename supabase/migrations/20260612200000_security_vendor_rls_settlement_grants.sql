-- Security audit fixes (#1 supplement, #2):
-- 1. Remove open-read vendor policies that expose payout PII to anon.
-- 2. Revoke anon execute on settlement RPCs (service_role + authenticated backfill paths remain).

DROP POLICY IF EXISTS "Allow all for debugging" ON public.vendors;
DROP POLICY IF EXISTS "Allow all vendors read" ON public.vendors;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vendors'
      AND policyname = 'Vendors can view own record'
  ) THEN
    CREATE POLICY "Vendors can view own record"
      ON public.vendors
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
DECLARE
  func record;
BEGIN
  FOR func IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('process_payment_with_commission', 'process_payment_atomic')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', func.sig);
  END LOOP;
END $$;

-- Repair historical false failures: tickets delivered but job marked failed (#4).
UPDATE public.payment_fulfillment_jobs j
SET
  status = 'completed',
  completed_at = COALESCE(j.completed_at, now()),
  last_error = NULL,
  updated_at = now()
WHERE j.job_type = 'order_fulfillment'
  AND j.status = 'failed'
  AND EXISTS (
    SELECT 1
    FROM public.order_items oi
    WHERE oi.order_id = j.source_id
  )
  AND (
    SELECT COALESCE(SUM(oi.quantity), 0)::int
    FROM public.order_items oi
    WHERE oi.order_id = j.source_id
  ) <= (
    SELECT COUNT(*)::int
    FROM public.tickets t
    WHERE t.order_id = j.source_id
  );
