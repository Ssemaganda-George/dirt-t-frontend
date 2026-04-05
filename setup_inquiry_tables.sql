-- ============================================
-- COMPLETE INQUIRY SYSTEM SETUP
-- Run this in Supabase SQL Editor for project: ywxvgfhwmnwzsafwmpil
-- ============================================

-- ============================================
-- 1. CONTACT INQUIRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'booking', 'technical', 'partnership', 'complaint', 'other')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'in_progress', 'responded', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_email_sent BOOLEAN DEFAULT false,
  user_confirmation_sent BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'website',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. SERVICE INQUIRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS service_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  preferred_date DATE,
  number_of_guests INT,
  contact_method TEXT DEFAULT 'email' CHECK (contact_method IN ('email', 'phone', 'whatsapp')),
  service_specific_data JSONB,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'in_progress', 'responded', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_email_sent BOOLEAN DEFAULT false,
  vendor_email_sent BOOLEAN DEFAULT false,
  user_confirmation_sent BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'website',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE service_inquiries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. SAFARI INQUIRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS safari_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  countries TEXT[], -- Array of destination countries
  activities TEXT[], -- Array of activities interested in
  travel_with TEXT, -- solo, couple, family, group
  days INT,
  budget TEXT,
  start_date DATE,
  adults INT DEFAULT 1,
  children INT DEFAULT 0,
  rooms INT DEFAULT 1,
  extra_info TEXT,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'in_progress', 'responded', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_email_sent BOOLEAN DEFAULT false,
  user_confirmation_sent BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'website',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE safari_inquiries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. PARTNERSHIP INQUIRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS partnership_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  business_type TEXT,
  website TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  partnership_type TEXT CHECK (partnership_type IN ('vendor', 'affiliate', 'reseller', 'integration', 'other')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'in_progress', 'responded', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_email_sent BOOLEAN DEFAULT false,
  user_confirmation_sent BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'website',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE partnership_inquiries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- CONTACT INQUIRIES
DROP POLICY IF EXISTS "Anyone can submit contact inquiries" ON contact_inquiries;
CREATE POLICY "Anyone can submit contact inquiries"
  ON contact_inquiries FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view contact inquiries" ON contact_inquiries;
CREATE POLICY "Admins can view contact inquiries"
  ON contact_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update contact inquiries" ON contact_inquiries;
CREATE POLICY "Admins can update contact inquiries"
  ON contact_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- SERVICE INQUIRIES
DROP POLICY IF EXISTS "Anyone can submit service inquiries" ON service_inquiries;
CREATE POLICY "Anyone can submit service inquiries"
  ON service_inquiries FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

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

-- SAFARI INQUIRIES
DROP POLICY IF EXISTS "Anyone can submit safari inquiries" ON safari_inquiries;
CREATE POLICY "Anyone can submit safari inquiries"
  ON safari_inquiries FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view safari inquiries" ON safari_inquiries;
CREATE POLICY "Admins can view safari inquiries"
  ON safari_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update safari inquiries" ON safari_inquiries;
CREATE POLICY "Admins can update safari inquiries"
  ON safari_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- PARTNERSHIP INQUIRIES
DROP POLICY IF EXISTS "Anyone can submit partnership inquiries" ON partnership_inquiries;
CREATE POLICY "Anyone can submit partnership inquiries"
  ON partnership_inquiries FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view partnership inquiries" ON partnership_inquiries;
CREATE POLICY "Admins can view partnership inquiries"
  ON partnership_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins can update partnership inquiries" ON partnership_inquiries;
CREATE POLICY "Admins can update partnership inquiries"
  ON partnership_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============================================
-- 6. UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all inquiry tables
DROP TRIGGER IF EXISTS trigger_contact_inquiries_updated_at ON contact_inquiries;
CREATE TRIGGER trigger_contact_inquiries_updated_at
  BEFORE UPDATE ON contact_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiries_updated_at();

DROP TRIGGER IF EXISTS trigger_service_inquiries_updated_at ON service_inquiries;
CREATE TRIGGER trigger_service_inquiries_updated_at
  BEFORE UPDATE ON service_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiries_updated_at();

DROP TRIGGER IF EXISTS trigger_safari_inquiries_updated_at ON safari_inquiries;
CREATE TRIGGER trigger_safari_inquiries_updated_at
  BEFORE UPDATE ON safari_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiries_updated_at();

DROP TRIGGER IF EXISTS trigger_partnership_inquiries_updated_at ON partnership_inquiries;
CREATE TRIGGER trigger_partnership_inquiries_updated_at
  BEFORE UPDATE ON partnership_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiries_updated_at();

-- ============================================
-- 7. UNIFIED VIEW FOR ADMIN DASHBOARD
-- ============================================
CREATE OR REPLACE VIEW all_inquiries AS

-- Contact inquiries
SELECT 
  id,
  'contact' as inquiry_type,
  name,
  email,
  phone,
  subject,
  message,
  category,
  status,
  priority,
  response_message,
  responded_at,
  responded_by,
  admin_email_sent,
  user_confirmation_sent,
  source,
  created_at,
  updated_at,
  NULL::uuid as service_id,
  NULL::uuid as vendor_id,
  NULL::text as company_name,
  NULL::text as partnership_type
FROM contact_inquiries

UNION ALL

-- Service inquiries
SELECT 
  id,
  'service' as inquiry_type,
  name,
  email,
  phone,
  'Service Inquiry' as subject,
  message,
  'service' as category,
  status,
  priority,
  response_message,
  responded_at,
  responded_by,
  admin_email_sent,
  user_confirmation_sent,
  source,
  created_at,
  updated_at,
  service_id,
  vendor_id,
  NULL::text as company_name,
  NULL::text as partnership_type
FROM service_inquiries

UNION ALL

-- Safari inquiries
SELECT 
  id,
  'safari' as inquiry_type,
  name,
  email,
  phone,
  'Safari Inquiry' as subject,
  extra_info as message,
  'safari' as category,
  status,
  priority,
  response_message,
  responded_at,
  responded_by,
  admin_email_sent,
  user_confirmation_sent,
  source,
  created_at,
  updated_at,
  NULL::uuid as service_id,
  NULL::uuid as vendor_id,
  NULL::text as company_name,
  NULL::text as partnership_type
FROM safari_inquiries

UNION ALL

-- Partnership inquiries
SELECT 
  id,
  'partnership' as inquiry_type,
  name,
  email,
  phone,
  subject,
  message,
  'partnership' as category,
  status,
  priority,
  response_message,
  responded_at,
  responded_by,
  admin_email_sent,
  user_confirmation_sent,
  source,
  created_at,
  updated_at,
  NULL::uuid as service_id,
  NULL::uuid as vendor_id,
  company_name,
  partnership_type
FROM partnership_inquiries;

-- ============================================
-- 8. VERIFY SETUP
-- ============================================
SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%inquir%';

SELECT 'Policies created:' as info;
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('service_inquiries', 'contact_inquiries', 'safari_inquiries', 'partnership_inquiries')
ORDER BY tablename, policyname;
