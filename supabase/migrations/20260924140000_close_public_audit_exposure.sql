-- Public API roles previously had unrestricted access to session history,
-- message content, OTPs, and notification payloads.
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own login history" ON public.login_history
FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Participants and admins read messages" ON public.messages
FOR SELECT TO authenticated
USING (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()) OR public.is_admin_user());

CREATE POLICY "Users send own messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (sender_id = (SELECT auth.uid()) AND (SELECT auth.uid()) IN
  (SELECT id FROM public.profiles));

CREATE POLICY "Participants update message delivery state" ON public.messages
FOR UPDATE TO authenticated
USING (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()))
WITH CHECK (sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_message_content()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (NEW.sender_id,NEW.sender_role,NEW.recipient_id,NEW.recipient_role,
      NEW.subject,NEW.message,NEW.encrypted_content,NEW.is_encrypted,NEW.created_at)
     IS DISTINCT FROM
     (OLD.sender_id,OLD.sender_role,OLD.recipient_id,OLD.recipient_role,
      OLD.subject,OLD.message,OLD.encrypted_content,OLD.is_encrypted,OLD.created_at) THEN
    RAISE EXCEPTION 'Message content and participants are immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_message_content ON public.messages;
CREATE TRIGGER protect_message_content BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.protect_message_content();
