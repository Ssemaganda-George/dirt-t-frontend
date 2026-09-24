ALTER TABLE public.activation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_configuration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors and admins read activation requests" ON public.activation_requests
FOR SELECT TO authenticated USING (
  public.is_admin_user() OR EXISTS (
    SELECT 1 FROM public.vendors v WHERE v.id=activation_requests.vendor_id AND v.user_id=(SELECT auth.uid())));
CREATE POLICY "Vendors request own service activation" ON public.activation_requests
FOR INSERT TO authenticated WITH CHECK (
  requester_id=(SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.services s JOIN public.vendors v ON v.id=s.vendor_id
    WHERE s.id=activation_requests.service_id AND v.id=activation_requests.vendor_id
      AND v.user_id=(SELECT auth.uid())));
CREATE POLICY "Admins update activation requests" ON public.activation_requests
FOR UPDATE TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Public reads fee mode" ON public.fee_configuration_settings
FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "Admins manage fee mode" ON public.fee_configuration_settings
FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Public reads active hero videos" ON public.hero_videos
FOR SELECT TO anon,authenticated USING (is_active OR public.is_admin_user());
CREATE POLICY "Admins manage hero videos" ON public.hero_videos
FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Public reads service categories" ON public.service_categories
FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "Admins manage service categories" ON public.service_categories
FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Vendors and admins read own service settings" ON public.service_settings
FOR SELECT TO authenticated USING (
  public.is_admin_user() OR EXISTS (
    SELECT 1 FROM public.services s JOIN public.vendors v ON v.id=s.vendor_id
    WHERE s.id=service_settings.service_id AND v.user_id=(SELECT auth.uid())));
CREATE POLICY "Admins manage service settings" ON public.service_settings
FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE POLICY "Public reads ticket types" ON public.ticket_types
FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "Vendors and admins create own ticket types" ON public.ticket_types
FOR INSERT TO authenticated WITH CHECK (
  public.is_admin_user() OR EXISTS (
    SELECT 1 FROM public.services s JOIN public.vendors v ON v.id=s.vendor_id
    WHERE s.id=ticket_types.service_id AND v.user_id=(SELECT auth.uid())));
CREATE POLICY "Vendors and admins update own ticket types" ON public.ticket_types
FOR UPDATE TO authenticated
USING (public.is_admin_user() OR EXISTS (
    SELECT 1 FROM public.services s JOIN public.vendors v ON v.id=s.vendor_id
    WHERE s.id=ticket_types.service_id AND v.user_id=(SELECT auth.uid())))
WITH CHECK (public.is_admin_user() OR EXISTS (
    SELECT 1 FROM public.services s JOIN public.vendors v ON v.id=s.vendor_id
    WHERE s.id=ticket_types.service_id AND v.user_id=(SELECT auth.uid())));
CREATE POLICY "Vendors and admins delete own ticket types" ON public.ticket_types
FOR DELETE TO authenticated USING (public.is_admin_user() OR EXISTS (
    SELECT 1 FROM public.services s JOIN public.vendors v ON v.id=s.vendor_id
    WHERE s.id=ticket_types.service_id AND v.user_id=(SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.protect_ticket_inventory_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF coalesce(auth.jwt()->>'role','') <> 'service_role' AND
     (NEW.sold IS DISTINCT FROM OLD.sold OR NEW.service_id IS DISTINCT FROM OLD.service_id) THEN
    RAISE EXCEPTION 'Ticket inventory and service ownership are server managed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_ticket_inventory_fields ON public.ticket_types;
CREATE TRIGGER protect_ticket_inventory_fields BEFORE UPDATE ON public.ticket_types
FOR EACH ROW EXECUTE FUNCTION public.protect_ticket_inventory_fields();
