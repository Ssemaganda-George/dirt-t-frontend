-- Add country column to login_history and update trigger function to include it
BEGIN;

ALTER TABLE IF EXISTS public.login_history
  ADD COLUMN IF NOT EXISTS country text;

-- Update function to include country when available on auth.sessions
CREATE OR REPLACE FUNCTION public.log_login_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  payload jsonb := row_to_json(NEW)::jsonb;
  old_payload jsonb := NULL;
  ip text := NULL;
  ua text := NULL;
  country text := NULL;
  created_at timestamptz := now();
BEGIN
  BEGIN
    ip := payload ->> 'ip_address';
    ua := payload ->> 'user_agent';
    country := payload ->> 'country';
    IF (payload ->> 'created_at') IS NOT NULL THEN
      BEGIN
        created_at := (payload ->> 'created_at')::timestamptz;
      EXCEPTION WHEN others THEN
        created_at := now();
      END;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      old_payload := row_to_json(OLD)::jsonb;
    END IF;

    IF TG_OP = 'INSERT' OR (
         TG_OP = 'UPDATE' AND (
           (payload ->> 'created_at') IS DISTINCT FROM (old_payload ->> 'created_at') OR
           (payload ->> 'access_token') IS DISTINCT FROM (old_payload ->> 'access_token')
         )
       ) THEN

      INSERT INTO public.login_history(user_id, ip_address, user_agent, country, created_at)
      VALUES (
        NEW.user_id,
        NULLIF(ip, ''),
        NULLIF(ua, ''),
        NULLIF(country, ''),
        created_at
      );

    END IF;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not log login history: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Ensure uniqueness to avoid duplicate rows for same user created_at
CREATE UNIQUE INDEX IF NOT EXISTS login_history_user_created_at_idx ON public.login_history (user_id, created_at);

-- Recreate trigger if missing (safe no-op if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'sessions' AND n.nspname = 'auth'
  ) THEN
    -- drop and recreate to ensure correct behavior
    IF EXISTS (
      SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname = 'trg_log_login_history' AND n.nspname = 'auth'
    ) THEN
      EXECUTE 'DROP TRIGGER IF EXISTS trg_log_login_history ON auth.sessions';
    END IF;

    EXECUTE 'CREATE TRIGGER trg_log_login_history AFTER INSERT OR UPDATE ON auth.sessions FOR EACH ROW EXECUTE FUNCTION public.log_login_history()';
  END IF;
END$$;

COMMIT;
