-- Item 3: claim_payment_jobs RPC
-- Atomically claims a batch of pending fulfillment jobs using FOR UPDATE SKIP LOCKED,
-- preventing two concurrent queue workers from double-processing the same job.
-- This eliminates the unlocked fallback path in process-payment-fulfillment-queue.

DROP FUNCTION IF EXISTS public.claim_payment_jobs(int, text);
DROP FUNCTION IF EXISTS public.claim_payment_jobs(integer, text);

CREATE OR REPLACE FUNCTION public.claim_payment_jobs(
  p_batch_size int,
  p_source      text DEFAULT 'webhook'
)
RETURNS SETOF payment_fulfillment_jobs
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE payment_fulfillment_jobs
  SET
    status     = 'processing',
    started_at = now(),
    attempts   = attempts + 1,
    updated_at = now()
  WHERE id IN (
    SELECT id
    FROM   payment_fulfillment_jobs
    WHERE  status        = 'pending'
      AND  scheduled_for <= now()
    ORDER  BY created_at ASC
    LIMIT  p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.claim_payment_jobs IS
  'Atomically claims pending fulfillment jobs with FOR UPDATE SKIP LOCKED. '
  'Called by process-payment-fulfillment-queue edge function.';
