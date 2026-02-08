-- Migration: Visitor Activity Tracking System
-- This migration creates tables to track visitor activity, likes, and reviews
-- Visitors are tracked by IP address with fallback to user ID

-- Create pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create visitor_sessions table
-- Tracks unique visitors by IP address with optional user association
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  country text,
  city text,
  device_type text, -- 'mobile', 'tablet', 'desktop'
  browser_info text,
  user_agent text,
  first_visit_at timestamptz NOT NULL DEFAULT now(),
  last_visit_at timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: IP + User combination (handles NULLs by excluding)
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_sessions_ip_user ON public.visitor_sessions(ip_address, user_id) WHERE user_id IS NOT NULL;
-- Also track IP-only sessions for anonymous visitors
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_sessions_ip_anon ON public.visitor_sessions(ip_address) WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_user_id ON public.visitor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_ip_address ON public.visitor_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_country ON public.visitor_sessions(country);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_visit ON public.visitor_sessions(last_visit_at DESC);

-- 2) Create service_likes table
-- Tracks which services visitors have liked
CREATE TABLE IF NOT EXISTS public.service_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  visitor_session_id uuid NOT NULL REFERENCES public.visitor_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet NOT NULL,
  liked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_likes_unique ON public.service_likes(service_id, visitor_session_id);
CREATE INDEX IF NOT EXISTS idx_service_likes_service_id ON public.service_likes(service_id);
CREATE INDEX IF NOT EXISTS idx_service_likes_visitor_session_id ON public.service_likes(visitor_session_id);
CREATE INDEX IF NOT EXISTS idx_service_likes_user_id ON public.service_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_service_likes_created_at ON public.service_likes(created_at DESC);

-- 3) Create service_reviews table
-- Tracks reviews and ratings left by visitors on services
CREATE TABLE IF NOT EXISTS public.service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  visitor_session_id uuid REFERENCES public.visitor_sessions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  visitor_name text NOT NULL,
  visitor_email text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  helpful_count integer NOT NULL DEFAULT 0,
  unhelpful_count integer NOT NULL DEFAULT 0,
  is_verified_booking boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_service_reviews_service_id ON public.service_reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_visitor_session_id ON public.service_reviews(visitor_session_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_user_id ON public.service_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_status ON public.service_reviews(status);
CREATE INDEX IF NOT EXISTS idx_service_reviews_created_at ON public.service_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_reviews_rating ON public.service_reviews(rating);

-- 4) Create visitor_activity table
-- Aggregated analytics per service from visitor activity
CREATE TABLE IF NOT EXISTS public.visitor_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  total_views integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  total_likes integer NOT NULL DEFAULT 0,
  total_reviews integer NOT NULL DEFAULT 0,
  approved_reviews integer NOT NULL DEFAULT 0,
  average_rating numeric(3,2) NOT NULL DEFAULT 0.00,
  total_helpful_count integer NOT NULL DEFAULT 0,
  views_this_month integer NOT NULL DEFAULT 0,
  likes_this_month integer NOT NULL DEFAULT 0,
  reviews_this_month integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_activity_service_id ON public.visitor_activity(service_id);
CREATE INDEX IF NOT EXISTS idx_visitor_activity_vendor_id ON public.visitor_activity(vendor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_activity_total_views ON public.visitor_activity(total_views DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_activity_average_rating ON public.visitor_activity(average_rating DESC);

-- 5) Create service_view_logs table
-- Detailed logs of service views for analytics
CREATE TABLE IF NOT EXISTS public.service_view_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  visitor_session_id uuid NOT NULL REFERENCES public.visitor_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet NOT NULL,
  referrer text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_view_logs_service_id ON public.service_view_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_service_view_logs_visitor_session_id ON public.service_view_logs(visitor_session_id);
CREATE INDEX IF NOT EXISTS idx_service_view_logs_viewed_at ON public.service_view_logs(viewed_at DESC);

-- Enable RLS on all tables
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_view_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visitor_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own session' AND tablename = 'visitor_sessions'
  ) THEN
    CREATE POLICY "Users can view their own session" ON public.visitor_sessions
      FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
END $$;

-- Allow anonymous inserts to visitor_sessions table for creating new sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can create visitor sessions' AND tablename = 'visitor_sessions'
  ) THEN
    CREATE POLICY "Anyone can create visitor sessions" ON public.visitor_sessions
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- RLS Policies for service_likes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service likes are publicly readable' AND tablename = 'service_likes'
  ) THEN
    CREATE POLICY "Service likes are publicly readable" ON public.service_likes
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can like a service' AND tablename = 'service_likes'
  ) THEN
    CREATE POLICY "Anyone can like a service" ON public.service_likes
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- RLS Policies for service_reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service reviews are publicly readable' AND tablename = 'service_reviews'
  ) THEN
    CREATE POLICY "Service reviews are publicly readable" ON public.service_reviews
      FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own reviews' AND tablename = 'service_reviews'
  ) THEN
    CREATE POLICY "Users can create their own reviews" ON public.service_reviews
      FOR INSERT WITH CHECK (
        (auth.uid() = user_id) OR (user_id IS NULL AND visitor_session_id IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can view pending reviews they created' AND tablename = 'service_reviews'
  ) THEN
    CREATE POLICY "Users can view pending reviews they created" ON public.service_reviews
      FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = approved_by OR
        (status = 'approved')
      );
  END IF;
END $$;

-- RLS Policies for visitor_activity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Visitor activity is publicly readable' AND tablename = 'visitor_activity'
  ) THEN
    CREATE POLICY "Visitor activity is publicly readable" ON public.visitor_activity
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can update their service activity' AND tablename = 'visitor_activity'
  ) THEN
    CREATE POLICY "Vendors can update their service activity" ON public.visitor_activity
      FOR UPDATE USING (
        vendor_id = (SELECT vendor_id FROM public.services WHERE id = service_id)
        AND vendor_id IN (
          SELECT id FROM public.vendors WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS Policies for service_view_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'View logs are not directly accessible' AND tablename = 'service_view_logs'
  ) THEN
    CREATE POLICY "View logs are not directly accessible" ON public.service_view_logs
      FOR SELECT USING (false);
  END IF;
END $$;

-- Create updated_at trigger for visitor_sessions
CREATE OR REPLACE FUNCTION update_visitor_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_visitor_sessions_updated_at' AND tgrelid = 'public.visitor_sessions'::regclass
  ) THEN
    CREATE TRIGGER update_visitor_sessions_updated_at
      BEFORE UPDATE ON public.visitor_sessions
      FOR EACH ROW EXECUTE FUNCTION update_visitor_sessions_updated_at();
  END IF;
END $$;

-- Create updated_at trigger for service_reviews
CREATE OR REPLACE FUNCTION update_service_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_service_reviews_updated_at' AND tgrelid = 'public.service_reviews'::regclass
  ) THEN
    CREATE TRIGGER update_service_reviews_updated_at
      BEFORE UPDATE ON public.service_reviews
      FOR EACH ROW EXECUTE FUNCTION update_service_reviews_updated_at();
  END IF;
END $$;

-- Create updated_at trigger for visitor_activity
CREATE OR REPLACE FUNCTION update_visitor_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_visitor_activity_updated_at' AND tgrelid = 'public.visitor_activity'::regclass
  ) THEN
    CREATE TRIGGER update_visitor_activity_updated_at
      BEFORE UPDATE ON public.visitor_activity
      FOR EACH ROW EXECUTE FUNCTION update_visitor_activity_updated_at();
  END IF;
END $$;

-- Function to get or create visitor session
CREATE OR REPLACE FUNCTION get_or_create_visitor_session(
  p_ip_address inet,
  p_user_id uuid DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_browser_info text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_session_id uuid;
  v_country text;
  v_city text;
BEGIN
  -- Use provided location or default to empty string
  v_country := COALESCE(p_country, 'Unknown');
  v_city := COALESCE(p_city, 'Unknown');

  -- Try to find existing session
  SELECT id INTO v_session_id
  FROM public.visitor_sessions
  WHERE ip_address = p_ip_address 
    AND (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL))
  LIMIT 1;

  -- If not found, create new session
  IF v_session_id IS NULL THEN
    INSERT INTO public.visitor_sessions (
      ip_address, user_id, country, city, device_type, browser_info, user_agent
    ) VALUES (
      p_ip_address, p_user_id, v_country, v_city, p_device_type, p_browser_info, p_user_agent
    )
    RETURNING id INTO v_session_id;
  ELSE
    -- Update last visit and increment counter
    UPDATE public.visitor_sessions
    SET 
      last_visit_at = NOW(),
      visit_count = visit_count + 1,
      user_id = COALESCE(p_user_id, user_id),
      country = CASE WHEN p_country IS NOT NULL THEN p_country ELSE country END,
      city = CASE WHEN p_city IS NOT NULL THEN p_city ELSE city END
    WHERE id = v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record a service like
CREATE OR REPLACE FUNCTION record_service_like(
  p_service_id uuid,
  p_visitor_session_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_like_id uuid;
BEGIN
  -- Check if already liked
  SELECT id INTO v_like_id
  FROM public.service_likes
  WHERE service_id = p_service_id 
    AND visitor_session_id = p_visitor_session_id;

  -- If already liked, return existing ID
  IF v_like_id IS NOT NULL THEN
    RETURN v_like_id;
  END IF;

  -- Insert new like
  INSERT INTO public.service_likes (
    service_id, visitor_session_id, user_id, ip_address
  ) VALUES (
    p_service_id, p_visitor_session_id, p_user_id, p_ip_address
  )
  RETURNING id INTO v_like_id;

  -- Update visitor activity
  UPDATE public.visitor_activity
  SET 
    total_likes = total_likes + 1,
    likes_this_month = likes_this_month + 1,
    last_activity_at = NOW()
  WHERE service_id = p_service_id;

  RETURN v_like_id;
END;
$$ LANGUAGE plpgsql;

-- Function to remove a service like
CREATE OR REPLACE FUNCTION remove_service_like(
  p_service_id uuid,
  p_visitor_session_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_deleted boolean;
BEGIN
  DELETE FROM public.service_likes
  WHERE service_id = p_service_id 
    AND visitor_session_id = p_visitor_session_id;

  -- Update visitor activity
  UPDATE public.visitor_activity
  SET 
    total_likes = GREATEST(0, total_likes - 1),
    likes_this_month = GREATEST(0, likes_this_month - 1),
    last_activity_at = NOW()
  WHERE service_id = p_service_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate average rating for a service
CREATE OR REPLACE FUNCTION update_service_average_rating(p_service_id uuid)
RETURNS numeric AS $$
DECLARE
  v_avg_rating numeric(3,2);
  v_approved_count integer;
BEGIN
  SELECT 
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*)
  INTO v_avg_rating, v_approved_count
  FROM public.service_reviews
  WHERE service_id = p_service_id AND status = 'approved';

  -- Update visitor activity
  UPDATE public.visitor_activity
  SET 
    average_rating = COALESCE(v_avg_rating, 0),
    approved_reviews = v_approved_count
  WHERE service_id = p_service_id;

  RETURN COALESCE(v_avg_rating, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update visitor activity when a review is inserted
CREATE OR REPLACE FUNCTION handle_service_review_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure visitor activity record exists
  INSERT INTO public.visitor_activity (service_id, vendor_id)
  SELECT id, vendor_id FROM public.services WHERE id = NEW.service_id
  ON CONFLICT (service_id) DO NOTHING;

  -- Update counts based on status
  IF NEW.status = 'approved' THEN
    UPDATE public.visitor_activity
    SET 
      total_reviews = total_reviews + 1,
      reviews_this_month = reviews_this_month + 1,
      last_activity_at = NOW()
    WHERE service_id = NEW.service_id;
    
    -- Update average rating
    PERFORM update_service_average_rating(NEW.service_id);
  ELSE
    UPDATE public.visitor_activity
    SET 
      total_reviews = total_reviews + 1,
      reviews_this_month = reviews_this_month + 1,
      last_activity_at = NOW()
    WHERE service_id = NEW.service_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_service_review_insert_trigger' AND tgrelid = 'public.service_reviews'::regclass
  ) THEN
    CREATE TRIGGER handle_service_review_insert_trigger
      AFTER INSERT ON public.service_reviews
      FOR EACH ROW EXECUTE FUNCTION handle_service_review_insert();
  END IF;
END $$;

-- Trigger to update visitor activity when a review is updated (e.g., approved)
CREATE OR REPLACE FUNCTION handle_service_review_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If review was just approved
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    UPDATE public.visitor_activity
    SET 
      approved_reviews = approved_reviews + 1,
      last_activity_at = NOW()
    WHERE service_id = NEW.service_id;
    
    -- Update average rating
    PERFORM update_service_average_rating(NEW.service_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'handle_service_review_update_trigger' AND tgrelid = 'public.service_reviews'::regclass
  ) THEN
    CREATE TRIGGER handle_service_review_update_trigger
      AFTER UPDATE ON public.service_reviews
      FOR EACH ROW EXECUTE FUNCTION handle_service_review_update();
  END IF;
END $$;

-- Trigger to handle service view logging
CREATE OR REPLACE FUNCTION log_service_view(
  p_service_id uuid,
  p_visitor_session_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_referrer text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert view log
  INSERT INTO public.service_view_logs (
    service_id, visitor_session_id, user_id, ip_address, referrer
  ) VALUES (
    p_service_id, p_visitor_session_id, p_user_id, p_ip_address, p_referrer
  );

  -- Update visitor activity
  INSERT INTO public.visitor_activity (service_id, vendor_id, total_views, unique_visitors)
  SELECT id, vendor_id, 1, 1 FROM public.services WHERE id = p_service_id
  ON CONFLICT (service_id) DO UPDATE SET
    total_views = visitor_activity.total_views + 1,
    views_this_month = visitor_activity.views_this_month + 1,
    last_activity_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6) Create app_visits table
-- Tracks app-level page visits and navigation
CREATE TABLE IF NOT EXISTS public.app_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_session_id uuid NOT NULL REFERENCES public.visitor_sessions(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  page_name text,
  referrer text,
  ip_address inet,
  country text,
  city text,
  user_agent text,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_visits_visitor_session_id ON public.app_visits(visitor_session_id);
CREATE INDEX IF NOT EXISTS idx_app_visits_page_path ON public.app_visits(page_path);
CREATE INDEX IF NOT EXISTS idx_app_visits_page_name ON public.app_visits(page_name);
CREATE INDEX IF NOT EXISTS idx_app_visits_visited_at ON public.app_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_visits_country ON public.app_visits(country);

-- Enable RLS on app_visits
ALTER TABLE public.app_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_visits (must be after table creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'App visits are not directly accessible' AND tablename = 'app_visits'
  ) THEN
    CREATE POLICY "App visits are not directly accessible" ON public.app_visits
      FOR SELECT USING (false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'System can insert app visits' AND tablename = 'app_visits'
  ) THEN
    CREATE POLICY "System can insert app visits" ON public.app_visits
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

