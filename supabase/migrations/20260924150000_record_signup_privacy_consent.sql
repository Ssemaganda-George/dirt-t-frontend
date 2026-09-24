-- Capture a server-timestamped, append-only copy of the explicit privacy
-- acknowledgement supplied with new email account registrations.
CREATE TABLE IF NOT EXISTS public.account_privacy_consents (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notice_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  evidence_source text NOT NULL DEFAULT 'email_signup'
);

ALTER TABLE public.account_privacy_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_privacy_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.account_privacy_consents TO authenticated;

CREATE POLICY "Users read own privacy acknowledgement"
ON public.account_privacy_consents FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.capture_account_privacy_consent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.is_anonymous = false
     AND NEW.raw_user_meta_data->>'privacy_accepted' = 'true'
     AND NEW.raw_user_meta_data->>'privacy_notice_version' = '2026-09-24'
  THEN
    INSERT INTO public.account_privacy_consents (user_id, notice_version)
    VALUES (NEW.id, '2026-09-24');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_account_privacy_consent() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS capture_account_privacy_consent ON auth.users;
CREATE TRIGGER capture_account_privacy_consent
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.capture_account_privacy_consent();
