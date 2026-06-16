-- Feature 3: track whether ops was alerted for a permanently failed fulfillment job.

ALTER TABLE public.payment_fulfillment_jobs
  ADD COLUMN IF NOT EXISTS failure_alerted_at timestamptz NULL;

COMMENT ON COLUMN public.payment_fulfillment_jobs.failure_alerted_at IS
  'When ops was emailed about this job reaching failed status (idempotent alert guard).';
