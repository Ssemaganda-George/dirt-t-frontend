-- Inquiries System Migration
-- Separate tables for each inquiry type, managed together via unified view
-- Types: contact_inquiries, service_inquiries, safari_inquiries, partnership_inquiries

-- ============================================================================
-- Step 1: Create contact_inquiries table
-- ============================================================================
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Inquiry Content
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'booking', 'technical', 'partnership', 'complaint', 'other')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'in_progress', 'responded', 'archived')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Response tracking
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Email notification tracking
  admin_email_sent BOOLEAN DEFAULT false,
  user_confirmation_sent BOOLEAN DEFAULT false,
  
  -- Metadata
  source TEXT DEFAULT 'website',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 2: Create service_inquiries table
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Service reference
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  
  -- Inquiry details
  message TEXT,
  preferred_date DATE,
  number_of_guests INTEGER DEFAULT 1,
  contact_method TEXT DEFAULT 'email' CHECK (contact_method IN ('email', 'phone', 'whatsapp')),
  
  -- Service-specific data (flexible JSON for category-specific questions)
  service_specific_data JSONB DEFAULT '{}',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'in_progress', 'responded', 'archived', 'converted')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Response tracking
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Email notification tracking
  admin_email_sent BOOLEAN DEFAULT false,
  vendor_email_sent BOOLEAN DEFAULT false,
  user_confirmation_sent BOOLEAN DEFAULT false,
  
  -- Metadata
  source TEXT DEFAULT 'website',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 3: Create safari_inquiries table
-- ============================================================================
CREATE TABLE IF NOT EXISTS safari_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  
  -- Safari details
  countries TEXT[] DEFAULT '{}',
  activities TEXT[] DEFAULT '{}',
  travel_with TEXT,
  days INTEGER,
  budget INTEGER,
  start_date DATE,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  rooms INTEGER DEFAULT 1,
  extra_info TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'in_progress', 'responded', 'archived', 'converted')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Response tracking
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Email notification tracking
  admin_email_sent BOOLEAN DEFAULT false,
  user_confirmation_sent BOOLEAN DEFAULT false,
  
  -- Metadata
  source TEXT DEFAULT 'website',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 4: Create partnership_inquiries table
-- ============================================================================
CREATE TABLE IF NOT EXISTS partnership_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Business Info
  company_name TEXT,
  business_type TEXT,
  website TEXT,
  
  -- Inquiry details
  subject TEXT,
  message TEXT NOT NULL,
  partnership_type TEXT CHECK (partnership_type IN ('vendor', 'affiliate', 'sponsor', 'hotel', 'tour_operator', 'other')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'in_progress', 'responded', 'archived', 'converted')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Response tracking
  response_message TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Email notification tracking
  admin_email_sent BOOLEAN DEFAULT false,
  user_confirmation_sent BOOLEAN DEFAULT false,
  
  -- Metadata
  source TEXT DEFAULT 'website',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 5: Create indexes for all tables
-- ============================================================================
-- Contact inquiries indexes
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_category ON contact_inquiries(category);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries(email);

-- Service inquiries indexes
CREATE INDEX IF NOT EXISTS idx_service_inquiries_status ON service_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_service_id ON service_inquiries(service_id);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_vendor_id ON service_inquiries(vendor_id);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_created_at ON service_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_inquiries_email ON service_inquiries(email);

-- Safari inquiries indexes
CREATE INDEX IF NOT EXISTS idx_safari_inquiries_status ON safari_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_safari_inquiries_created_at ON safari_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safari_inquiries_email ON safari_inquiries(email);

-- Partnership inquiries indexes
CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_status ON partnership_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_type ON partnership_inquiries(partnership_type);
CREATE INDEX IF NOT EXISTS idx_partnership_inquiries_created_at ON partnership_inquiries(created_at DESC);

-- ============================================================================
-- Step 6: Enable RLS on all tables
-- ============================================================================
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE safari_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE partnership_inquiries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 7: Create RLS policies for contact_inquiries
-- ============================================================================
CREATE POLICY "Anyone can submit contact inquiries"
  ON contact_inquiries FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view contact inquiries"
  ON contact_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can update contact inquiries"
  ON contact_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Service role full access contact_inquiries"
  ON contact_inquiries FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Step 8: Create RLS policies for service_inquiries
-- ============================================================================
CREATE POLICY "Anyone can submit service inquiries"
  ON service_inquiries FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all service inquiries"
  ON service_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Vendors can view their service inquiries"
  ON service_inquiries FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update all service inquiries"
  ON service_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Vendors can update their service inquiries"
  ON service_inquiries FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access service_inquiries"
  ON service_inquiries FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Step 9: Create RLS policies for safari_inquiries
-- ============================================================================
CREATE POLICY "Anyone can submit safari inquiries"
  ON safari_inquiries FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view safari inquiries"
  ON safari_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can update safari inquiries"
  ON safari_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Service role full access safari_inquiries"
  ON safari_inquiries FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Step 10: Create RLS policies for partnership_inquiries
-- ============================================================================
CREATE POLICY "Anyone can submit partnership inquiries"
  ON partnership_inquiries FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view partnership inquiries"
  ON partnership_inquiries FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can update partnership inquiries"
  ON partnership_inquiries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Service role full access partnership_inquiries"
  ON partnership_inquiries FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Step 11: Create updated_at triggers for all tables
-- ============================================================================
CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contact_inquiries_updated_at ON contact_inquiries;
CREATE TRIGGER trigger_contact_inquiries_updated_at
  BEFORE UPDATE ON contact_inquiries FOR EACH ROW EXECUTE FUNCTION update_inquiries_updated_at();

DROP TRIGGER IF EXISTS trigger_service_inquiries_updated_at ON service_inquiries;
CREATE TRIGGER trigger_service_inquiries_updated_at
  BEFORE UPDATE ON service_inquiries FOR EACH ROW EXECUTE FUNCTION update_inquiries_updated_at();

DROP TRIGGER IF EXISTS trigger_safari_inquiries_updated_at ON safari_inquiries;
CREATE TRIGGER trigger_safari_inquiries_updated_at
  BEFORE UPDATE ON safari_inquiries FOR EACH ROW EXECUTE FUNCTION update_inquiries_updated_at();

DROP TRIGGER IF EXISTS trigger_partnership_inquiries_updated_at ON partnership_inquiries;
CREATE TRIGGER trigger_partnership_inquiries_updated_at
  BEFORE UPDATE ON partnership_inquiries FOR EACH ROW EXECUTE FUNCTION update_inquiries_updated_at();

-- ============================================================================
-- Step 12: Create unified inquiries view for admin dashboard
-- ============================================================================
CREATE OR REPLACE VIEW all_inquiries AS
SELECT 
  id,
  'contact'::TEXT as inquiry_type,
  name,
  email,
  phone,
  subject,
  message,
  category,
  NULL::UUID as service_id,
  NULL::UUID as vendor_id,
  NULL::TEXT as service_title,
  NULL::TEXT as vendor_name,
  NULL::TEXT as vendor_email,
  status,
  priority,
  response_message,
  responded_at,
  responded_by,
  admin_email_sent,
  false as vendor_email_sent,
  user_confirmation_sent,
  source,
  created_at,
  updated_at
FROM contact_inquiries

UNION ALL

SELECT 
  si.id,
  'service'::TEXT as inquiry_type,
  si.name,
  si.email,
  si.phone,
  COALESCE(s.title, 'Service Inquiry') as subject,
  si.message,
  NULL as category,
  si.service_id,
  si.vendor_id,
  s.title as service_title,
  v.business_name as vendor_name,
  v.business_email as vendor_email,
  si.status,
  si.priority,
  si.response_message,
  si.responded_at,
  si.responded_by,
  si.admin_email_sent,
  si.vendor_email_sent,
  si.user_confirmation_sent,
  si.source,
  si.created_at,
  si.updated_at
FROM service_inquiries si
LEFT JOIN services s ON si.service_id = s.id
LEFT JOIN vendors v ON si.vendor_id = v.id

UNION ALL

SELECT 
  id,
  'safari'::TEXT as inquiry_type,
  name,
  email,
  phone,
  COALESCE(
    'Safari: ' || array_to_string(countries, ', '),
    'Safari Request'
  ) as subject,
  extra_info as message,
  NULL as category,
  NULL::UUID as service_id,
  NULL::UUID as vendor_id,
  NULL as service_title,
  NULL as vendor_name,
  NULL as vendor_email,
  status,
  priority,
  response_message,
  responded_at,
  responded_by,
  admin_email_sent,
  false as vendor_email_sent,
  user_confirmation_sent,
  source,
  created_at,
  updated_at
FROM safari_inquiries

UNION ALL

SELECT 
  id,
  'partnership'::TEXT as inquiry_type,
  name,
  email,
  phone,
  COALESCE(subject, 'Partnership Request') as subject,
  message,
  partnership_type as category,
  NULL::UUID as service_id,
  NULL::UUID as vendor_id,
  NULL as service_title,
  company_name as vendor_name,
  NULL as vendor_email,
  status,
  priority,
  response_message,
  responded_at,
  responded_by,
  admin_email_sent,
  false as vendor_email_sent,
  user_confirmation_sent,
  source,
  created_at,
  updated_at
FROM partnership_inquiries;

-- ============================================================================
-- Step 13: Create function to trigger email notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_inquiry_created()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  inquiry_type TEXT;
  vendor_email TEXT;
BEGIN
  -- Determine inquiry type based on table name
  inquiry_type := TG_TABLE_NAME;
  
  -- Build base payload
  payload := jsonb_build_object(
    'inquiry_id', NEW.id,
    'inquiry_type', inquiry_type,
    'name', NEW.name,
    'email', NEW.email,
    'created_at', NEW.created_at
  );
  
  -- Add vendor info for service inquiries
  IF inquiry_type = 'service_inquiries' AND NEW.vendor_id IS NOT NULL THEN
    SELECT business_email INTO vendor_email
    FROM vendors
    WHERE id = NEW.vendor_id;
    
    payload := payload || jsonb_build_object(
      'vendor_id', NEW.vendor_id,
      'vendor_email', vendor_email,
      'service_id', NEW.service_id
    );
  END IF;
  
  -- Send to pg_notify channel for Edge Function to pick up
  PERFORM pg_notify('new_inquiry', payload::TEXT);
  
  -- Also insert into notification queue table (if exists)
  -- This provides reliability if pg_notify is missed
  BEGIN
    INSERT INTO inquiry_notification_queue (
      inquiry_id,
      inquiry_type,
      payload,
      status
    ) VALUES (
      NEW.id,
      inquiry_type,
      payload,
      'pending'
    );
  EXCEPTION WHEN undefined_table THEN
    -- Queue table doesn't exist, skip
    NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 14: Create notification queue table for email reliability
-- ============================================================================
CREATE TABLE IF NOT EXISTS inquiry_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL,
  inquiry_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON inquiry_notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_created ON inquiry_notification_queue(created_at);

-- ============================================================================
-- Step 15: Attach notification triggers to all inquiry tables
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_notify_contact_inquiry ON contact_inquiries;
CREATE TRIGGER trigger_notify_contact_inquiry
  AFTER INSERT ON contact_inquiries
  FOR EACH ROW EXECUTE FUNCTION notify_inquiry_created();

DROP TRIGGER IF EXISTS trigger_notify_service_inquiry ON service_inquiries;
CREATE TRIGGER trigger_notify_service_inquiry
  AFTER INSERT ON service_inquiries
  FOR EACH ROW EXECUTE FUNCTION notify_inquiry_created();

DROP TRIGGER IF EXISTS trigger_notify_safari_inquiry ON safari_inquiries;
CREATE TRIGGER trigger_notify_safari_inquiry
  AFTER INSERT ON safari_inquiries
  FOR EACH ROW EXECUTE FUNCTION notify_inquiry_created();

DROP TRIGGER IF EXISTS trigger_notify_partnership_inquiry ON partnership_inquiries;
CREATE TRIGGER trigger_notify_partnership_inquiry
  AFTER INSERT ON partnership_inquiries
  FOR EACH ROW EXECUTE FUNCTION notify_inquiry_created();

-- ============================================================================
-- Step 16: Create function to get inquiry counts by type (for admin dashboard)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_inquiry_counts()
RETURNS TABLE (
  inquiry_type TEXT,
  total BIGINT,
  unread BIGINT,
  in_progress BIGINT,
  responded BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'contact'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'unread')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'responded')::BIGINT
  FROM contact_inquiries
  
  UNION ALL
  
  SELECT 
    'service'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'unread')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'responded')::BIGINT
  FROM service_inquiries
  
  UNION ALL
  
  SELECT 
    'safari'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'unread')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'responded')::BIGINT
  FROM safari_inquiries
  
  UNION ALL
  
  SELECT 
    'partnership'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'unread')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'responded')::BIGINT
  FROM partnership_inquiries;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 17: Create function to process notification queue (called by Edge Function)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_inquiry_notifications(batch_size INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  inquiry_id UUID,
  inquiry_type TEXT,
  payload JSONB
) AS $$
BEGIN
  RETURN QUERY
  UPDATE inquiry_notification_queue q
  SET 
    status = 'processing',
    last_attempt_at = NOW(),
    attempts = attempts + 1
  WHERE q.id IN (
    SELECT q2.id 
    FROM inquiry_notification_queue q2
    WHERE q2.status = 'pending'
    ORDER BY q2.created_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.id, q.inquiry_id, q.inquiry_type, q.payload;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_notification_sent(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE inquiry_notification_queue
  SET status = 'sent', sent_at = NOW()
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_notification_failed(notification_id UUID, error_msg TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE inquiry_notification_queue
  SET 
    status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
    error_message = error_msg
  WHERE id = notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Table comments
-- ============================================================================
COMMENT ON TABLE contact_inquiries IS 'General contact form submissions';
COMMENT ON TABLE service_inquiries IS 'Service-specific inquiries from customers (sent to both admin and vendor)';
COMMENT ON TABLE safari_inquiries IS 'Custom safari planning requests';
COMMENT ON TABLE partnership_inquiries IS 'Business partnership and vendor onboarding requests';
COMMENT ON VIEW all_inquiries IS 'Unified view of all inquiry types for admin dashboard';
COMMENT ON TABLE inquiry_notification_queue IS 'Queue for reliable email notification delivery';

-- ============================================================================
-- Verification queries
-- ============================================================================
SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contact_inquiries', 'service_inquiries', 'safari_inquiries', 'partnership_inquiries', 'inquiry_notification_queue');

SELECT 'View created:' as info;
SELECT table_name, table_type FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'all_inquiries';

