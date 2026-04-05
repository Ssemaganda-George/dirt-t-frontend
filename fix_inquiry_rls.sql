-- Quick fix: Add RLS policies for inquiry tables
-- Run this in Supabase SQL Editor

-- ============================================
-- SERVICE INQUIRIES
-- ============================================
DROP POLICY IF EXISTS "Anyone can submit service inquiries" ON service_inquiries;
CREATE POLICY "Anyone can submit service inquiries"
  ON service_inquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Vendors can view their service inquiries" ON service_inquiries;
CREATE POLICY "Vendors can view their service inquiries"
  ON service_inquiries FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vendors can update their service inquiries" ON service_inquiries;
CREATE POLICY "Vendors can update their service inquiries"
  ON service_inquiries FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all service inquiries" ON service_inquiries;
CREATE POLICY "Admins can view all service inquiries"
  ON service_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update all service inquiries" ON service_inquiries;
CREATE POLICY "Admins can update all service inquiries"
  ON service_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============================================
-- CONTACT INQUIRIES
-- ============================================
DROP POLICY IF EXISTS "Anyone can submit contact inquiries" ON contact_inquiries;
CREATE POLICY "Anyone can submit contact inquiries"
  ON contact_inquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact inquiries" ON contact_inquiries;
CREATE POLICY "Admins can view contact inquiries"
  ON contact_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update contact inquiries" ON contact_inquiries;
CREATE POLICY "Admins can update contact inquiries"
  ON contact_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============================================
-- SAFARI INQUIRIES
-- ============================================
DROP POLICY IF EXISTS "Anyone can submit safari inquiries" ON safari_inquiries;
CREATE POLICY "Anyone can submit safari inquiries"
  ON safari_inquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view safari inquiries" ON safari_inquiries;
CREATE POLICY "Admins can view safari inquiries"
  ON safari_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update safari inquiries" ON safari_inquiries;
CREATE POLICY "Admins can update safari inquiries"
  ON safari_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============================================
-- PARTNERSHIP INQUIRIES
-- ============================================
DROP POLICY IF EXISTS "Anyone can submit partnership inquiries" ON partnership_inquiries;
CREATE POLICY "Anyone can submit partnership inquiries"
  ON partnership_inquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view partnership inquiries" ON partnership_inquiries;
CREATE POLICY "Admins can view partnership inquiries"
  ON partnership_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update partnership inquiries" ON partnership_inquiries;
CREATE POLICY "Admins can update partnership inquiries"
  ON partnership_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============================================
-- VERIFY
-- ============================================
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('service_inquiries', 'contact_inquiries', 'safari_inquiries', 'partnership_inquiries')
ORDER BY tablename, policyname;
