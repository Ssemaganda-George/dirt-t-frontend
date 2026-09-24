-- Keep anonymous inquiry submission while restricting saved contact details to admins.
DROP POLICY IF EXISTS "Allow admins to manage partner_requests" ON public.partner_requests;
DROP POLICY IF EXISTS "Allow public insert for partner requests" ON public.partner_requests;
DROP POLICY IF EXISTS "Allow public inserts on partner_requests" ON public.partner_requests;
DROP POLICY IF EXISTS "Allow select for all" ON public.partner_requests;

CREATE POLICY "Public submits partner requests" ON public.partner_requests
FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read partner requests" ON public.partner_requests
FOR SELECT TO authenticated USING (public.is_admin_user());
CREATE POLICY "Admins update partner requests" ON public.partner_requests
FOR UPDATE TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "Admins delete partner requests" ON public.partner_requests
FOR DELETE TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "Allow public delete website inquiries" ON public.website_inquiries;
DROP POLICY IF EXISTS "Allow public insert website inquiries" ON public.website_inquiries;
DROP POLICY IF EXISTS "Allow public select website inquiries" ON public.website_inquiries;
DROP POLICY IF EXISTS "Allow public update website inquiries" ON public.website_inquiries;
DROP POLICY IF EXISTS "Authenticated users can delete inquiries" ON public.website_inquiries;
DROP POLICY IF EXISTS "Authenticated users can update inquiry status" ON public.website_inquiries;
DROP POLICY IF EXISTS "Authenticated users can view all inquiries" ON public.website_inquiries;

CREATE POLICY "Public submits website inquiries" ON public.website_inquiries
FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read website inquiries" ON public.website_inquiries
FOR SELECT TO authenticated USING (public.is_admin_user());
CREATE POLICY "Admins update website inquiries" ON public.website_inquiries
FOR UPDATE TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "Admins delete website inquiries" ON public.website_inquiries
FOR DELETE TO authenticated USING (public.is_admin_user());
