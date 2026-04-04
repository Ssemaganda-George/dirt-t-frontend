-- Create a simple login_history table and a trigger to record auth.sessions inserts
BEGIN;

-- gen_random_uuid() provided by pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to store login events for easier querying from client/UI
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.login_history IS 'Derived login history table populated from auth.sessions via trigger';

-- Function to copy new auth.session rows into public.login_history
CREATE OR REPLACE FUNCTION public.log_login_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN
    INSERT INTO public.login_history(user_id, ip_address, user_agent, created_at)
    VALUES (NEW.user_id, COALESCE(NEW.ip_address::text, ''), COALESCE(NEW.user_agent::text, ''), COALESCE(NEW.created_at, now()));
  EXCEPTION WHEN others THEN
    -- Avoid failing session insert if logging fails
    RAISE NOTICE 'Could not log login history: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.sessions if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'sessions' AND n.nspname = 'auth') THEN
    -- Remove existing trigger if present
    IF NOT EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE t.tgname = 'trg_log_login_history' AND n.nspname = 'auth') THEN
      CREATE TRIGGER trg_log_login_history
      AFTER INSERT ON auth.sessions
      FOR EACH ROW EXECUTE FUNCTION public.log_login_history();
    END IF;
  END IF;
END$$;

COMMIT;
