-- Queue for asynchronous payment fulfillment jobs.
-- This lets webhooks acknowledge quickly while heavy work runs in a worker.

CREATE TABLE IF NOT EXISTS public.payment_fulfillment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL CHECK (job_type IN ('booking_fulfillment', 'order_fulfillment')),
  source_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 6,
  last_error text NULL,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_fulfillment_jobs_idempotency
  ON public.payment_fulfillment_jobs (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_payment_fulfillment_jobs_sched
  ON public.payment_fulfillment_jobs (status, scheduled_for, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_fulfillment_jobs_source
  ON public.payment_fulfillment_jobs (job_type, source_id);

CREATE OR REPLACE FUNCTION public.set_payment_fulfillment_jobs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_fulfillment_jobs_updated_at ON public.payment_fulfillment_jobs;
CREATE TRIGGER trg_payment_fulfillment_jobs_updated_at
BEFORE UPDATE ON public.payment_fulfillment_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_fulfillment_jobs_updated_at();

ALTER TABLE public.payment_fulfillment_jobs ENABLE ROW LEVEL SECURITY;

-- Service role worker/webhook only.
DROP POLICY IF EXISTS "service_role_all_payment_fulfillment_jobs" ON public.payment_fulfillment_jobs;
CREATE POLICY "service_role_all_payment_fulfillment_jobs"
ON public.payment_fulfillment_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
