-- =====================================================
-- Migration 009: Fix review RLS policies
-- =====================================================
-- Problem 1: Guest users cannot submit reviews because 
-- the service_reviews INSERT policy requires either
--   auth.uid() = user_id   (NULL = NULL → false in SQL)
--   OR user_id IS NULL AND visitor_session_id IS NOT NULL
-- But guest reviews don't have a visitor_session_id, so
-- both branches fail → 401 / RLS violation.
--
-- Problem 2: The handle_service_review_insert() trigger
-- tries to INSERT/UPDATE visitor_activity, but there is
-- no INSERT policy on that table → RLS violation.
--
-- Fix: Create a SECURITY DEFINER RPC function that handles
-- review creation, bypassing RLS entirely on the server side.
-- Also fix the trigger functions that write to visitor_activity.
-- =====================================================

-- =====================================================
-- FIX 1: RPC function for creating reviews (bypasses RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION create_service_review(
  p_service_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_visitor_session_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_visitor_name text DEFAULT NULL,
  p_visitor_email text DEFAULT NULL,
  p_rating numeric DEFAULT 0,
  p_kpi_ratings jsonb DEFAULT NULL,
  p_comment text DEFAULT NULL,
  p_is_verified_booking boolean DEFAULT false
)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  INSERT INTO public.service_reviews (
    service_id, user_id, visitor_session_id, ip_address,
    visitor_name, visitor_email, rating, kpi_ratings,
    comment, is_verified_booking, status
  ) VALUES (
    p_service_id, p_user_id, p_visitor_session_id, p_ip_address,
    p_visitor_name, p_visitor_email, p_rating, p_kpi_ratings,
    p_comment, p_is_verified_booking, 'pending'
  )
  RETURNING row_to_json(service_reviews.*) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIX 2: SECURITY DEFINER on visitor_activity writers
-- =====================================================

-- 1. Fix the review INSERT trigger function
CREATE OR REPLACE FUNCTION handle_service_review_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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

-- 2. Fix the review UPDATE trigger function
CREATE OR REPLACE FUNCTION handle_service_review_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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

-- 3. Fix the average rating calculation function
CREATE OR REPLACE FUNCTION update_service_average_rating(p_service_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public
AS $$
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

-- 4. Fix the service like recording function
CREATE OR REPLACE FUNCTION record_service_like(
  p_service_id uuid,
  p_visitor_session_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
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
  INSERT INTO public.visitor_activity (service_id, vendor_id, total_likes, likes_this_month)
  SELECT id, vendor_id, 1, 1 FROM public.services WHERE id = p_service_id
  ON CONFLICT (service_id) DO UPDATE SET
    total_likes = visitor_activity.total_likes + 1,
    likes_this_month = visitor_activity.likes_this_month + 1,
    last_activity_at = NOW();

  RETURN v_like_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Fix the service unlike function
CREATE OR REPLACE FUNCTION remove_service_like(
  p_service_id uuid,
  p_visitor_session_id uuid
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
AS $$
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

-- 6. Fix the service view logging function
CREATE OR REPLACE FUNCTION log_service_view(
  p_service_id uuid,
  p_visitor_session_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_referrer text DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
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

-- =====================================================
-- FIX 3: Admin review management RPCs (bypass RLS)
-- =====================================================
-- Problem: The admin panel calls supabase.from('service_reviews').select(...)
-- but RLS SELECT policies are restrictive:
--   - "Service reviews are publicly readable": status = 'approved' OR auth.uid() = user_id
--   - "Anyone can read approved reviews": status = 'approved' OR auth.role() = 'authenticated'
-- Even though auth.role() = 'authenticated' SHOULD return all rows,
-- the embedded resource JOIN to services/vendors can cause PostgREST
-- to silently drop rows where the joined table has no matching row
-- (inner-join semantics). Using SECURITY DEFINER RPCs ensures admins
-- always get ALL reviews regardless of RLS or join issues.
-- =====================================================

-- 7. Admin: Get all reviews (all statuses) with service + vendor info
CREATE OR REPLACE FUNCTION get_all_reviews_admin()
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT
        r.*,
        s.title AS service_title,
        v.business_name AS vendor_name
      FROM public.service_reviews r
      LEFT JOIN public.services s ON s.id = r.service_id
      LEFT JOIN public.vendors v ON v.id = s.vendor_id
      ORDER BY r.created_at DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Admin: Approve a review
CREATE OR REPLACE FUNCTION admin_approve_review(
  p_review_id uuid,
  p_approved_by uuid DEFAULT NULL
)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE public.service_reviews
  SET
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_review_id
  RETURNING row_to_json(service_reviews.*) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 9. Admin: Reject a review
CREATE OR REPLACE FUNCTION admin_reject_review(
  p_review_id uuid,
  p_reason text DEFAULT 'Review does not meet guidelines'
)
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE public.service_reviews
  SET
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_review_id
  RETURNING row_to_json(service_reviews.*) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
