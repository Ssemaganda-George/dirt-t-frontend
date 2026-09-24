-- Historical pending orders can refer to Auth users that were removed.
-- Consent evidence must also survive later Auth cleanup or account deletion.
ALTER TABLE public.checkout_privacy_consents
DROP CONSTRAINT checkout_privacy_consents_actor_id_fkey;
