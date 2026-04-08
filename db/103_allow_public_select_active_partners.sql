-- Allow anonymous and authenticated users to read active partners for public footer display.
DROP POLICY IF EXISTS "Allow public select active partners" ON public.partners;
CREATE POLICY "Allow public select active partners" ON public.partners
FOR SELECT
USING (
  status = 'active'
);
