-- Ensure trigger exists on auth.sessions and backfill existing sessions into public.login_history
BEGIN;

-- Create trigger if auth.sessions exists and trigger missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'sessions' AND n.nspname = 'auth') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE t.tgname = 'trg_log_login_history' AND n.nspname = 'auth'
    ) THEN
      CREATE TRIGGER trg_log_login_history
      AFTER INSERT ON auth.sessions
      FOR EACH ROW EXECUTE FUNCTION public.log_login_history();
    END IF;
  END IF;
END$$;

-- Backfill existing auth.sessions into public.login_history.
-- This checks whether auth.sessions has an ip_address column; if not, it uses NULL.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='auth' AND table_name='sessions' AND column_name='ip_address') THEN
    INSERT INTO public.login_history(user_id, ip_address, user_agent, created_at)
    SELECT s.user_id, COALESCE(s.ip_address::text, ''), COALESCE(s.user_agent::text, ''), s.created_at
    FROM auth.sessions s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.login_history l WHERE l.user_id = s.user_id AND l.created_at = s.created_at
    );
  ELSE
    INSERT INTO public.login_history(user_id, ip_address, user_agent, created_at)
    SELECT s.user_id, NULL, COALESCE(s.user_agent::text, ''), s.created_at
    FROM auth.sessions s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.login_history l WHERE l.user_id = s.user_id AND l.created_at = s.created_at
    );
  END IF;
END$$;

COMMIT;
