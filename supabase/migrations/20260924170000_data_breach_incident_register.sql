CREATE TABLE public.data_breach_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 200),
  summary text NOT NULL CHECK (length(btrim(summary)) BETWEEN 10 AND 5000),
  awareness_at timestamptz NOT NULL,
  notification_deadline_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'contained', 'closed')),
  pdpo_notified_at timestamptz,
  pdpo_reference text,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pdpo_notification_evidence CHECK (
    (pdpo_notified_at IS NULL AND pdpo_reference IS NULL) OR
    (pdpo_notified_at IS NOT NULL AND length(btrim(pdpo_reference)) >= 3)
  ),
  CONSTRAINT awareness_not_future CHECK (awareness_at <= created_at + interval '5 minutes')
);

CREATE TABLE public.data_breach_incident_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES public.data_breach_incidents(id),
  actor_id uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  prior_state jsonb,
  new_state jsonb NOT NULL
);

CREATE OR REPLACE FUNCTION public.prepare_data_breach_incident()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id OR NEW.created_by <> OLD.created_by OR NEW.created_at <> OLD.created_at
      OR NEW.awareness_at <> OLD.awareness_at THEN
      RAISE EXCEPTION 'Incident identity and awareness time cannot be changed';
    END IF;
  END IF;
  NEW.notification_deadline_at := NEW.awareness_at + interval '48 hours';
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_data_breach_incident()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.data_breach_incident_events(incident_id, actor_id, event_type, prior_state, new_state)
  VALUES (NEW.id, auth.uid(), lower(TG_OP),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW));
  RETURN NEW;
END;
$$;

CREATE TRIGGER prepare_data_breach_incident_trigger
BEFORE INSERT OR UPDATE ON public.data_breach_incidents
FOR EACH ROW EXECUTE FUNCTION public.prepare_data_breach_incident();

CREATE TRIGGER audit_data_breach_incident_trigger
AFTER INSERT OR UPDATE ON public.data_breach_incidents
FOR EACH ROW EXECUTE FUNCTION public.audit_data_breach_incident();

ALTER TABLE public.data_breach_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_breach_incident_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read breach incidents" ON public.data_breach_incidents
FOR SELECT TO authenticated USING (public.is_admin_user());
CREATE POLICY "Admins create breach incidents" ON public.data_breach_incidents
FOR INSERT TO authenticated WITH CHECK (public.is_admin_user() AND created_by = auth.uid());
CREATE POLICY "Admins update breach incidents" ON public.data_breach_incidents
FOR UPDATE TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "Admins read breach incident history" ON public.data_breach_incident_events
FOR SELECT TO authenticated USING (public.is_admin_user());

REVOKE ALL ON public.data_breach_incidents FROM anon;
REVOKE ALL ON public.data_breach_incident_events FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.data_breach_incidents TO authenticated;
GRANT SELECT ON public.data_breach_incident_events TO authenticated;
