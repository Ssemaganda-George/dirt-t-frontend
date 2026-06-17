-- Daily job: move eligible pending vendor holds to available balance.
-- Calls RPC directly (no edge function / HTTP secrets required).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-eligible-vendor-holds') THEN
      PERFORM cron.schedule(
        'release-eligible-vendor-holds',
        '0 3 * * *',
        $cron$SELECT public.release_eligible_vendor_holds(200);$cron$
      );
    END IF;
  END IF;
END $$;
