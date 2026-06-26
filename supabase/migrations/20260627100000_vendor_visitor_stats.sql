-- Vendor-scoped visitor analytics RPC + safer session geo defaults

CREATE OR REPLACE FUNCTION public.get_or_create_visitor_session(
  p_ip_address inet,
  p_user_id uuid DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_browser_info text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_country text;
  v_city text;
BEGIN
  v_country := NULLIF(TRIM(COALESCE(p_country, '')), '');
  v_city := NULLIF(TRIM(COALESCE(p_city, '')), '');

  SELECT id INTO v_session_id
  FROM public.visitor_sessions
  WHERE ip_address = p_ip_address
    AND (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL))
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO public.visitor_sessions (
      ip_address, user_id, country, city, device_type, browser_info, user_agent
    ) VALUES (
      p_ip_address, p_user_id, v_country, v_city, p_device_type, p_browser_info, p_user_agent
    )
    RETURNING id INTO v_session_id;
  ELSE
    UPDATE public.visitor_sessions
    SET
      last_visit_at = NOW(),
      visit_count = visit_count + 1,
      user_id = COALESCE(p_user_id, user_id),
      country = CASE
        WHEN v_country IS NOT NULL AND (country IS NULL OR LOWER(TRIM(country)) IN ('', 'unknown')) THEN v_country
        ELSE country
      END,
      city = CASE
        WHEN v_city IS NOT NULL AND (city IS NULL OR LOWER(TRIM(city)) IN ('', 'unknown')) THEN v_city
        ELSE city
      END,
      device_type = COALESCE(p_device_type, device_type),
      browser_info = COALESCE(p_browser_info, browser_info),
      user_agent = COALESCE(p_user_agent, user_agent),
      updated_at = NOW()
    WHERE id = v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_or_create_visitor_session(inet, uuid, text, text, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_vendor_visitor_stats(p_vendor_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vendors v WHERE v.id = p_vendor_id AND v.user_id = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_user_id AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH vendor_services AS (
    SELECT id, title FROM public.services WHERE vendor_id = p_vendor_id
  ),
  view_logs AS (
    SELECT
      svl.id,
      svl.service_id,
      svl.visitor_session_id,
      svl.viewed_at,
      vs.country,
      vs.city,
      vs.device_type,
      vs.last_visit_at,
      vs.first_visit_at,
      vs.ip_address,
      s.title AS service_title
    FROM public.service_view_logs svl
    INNER JOIN vendor_services s ON s.id = svl.service_id
    LEFT JOIN public.visitor_sessions vs ON vs.id = svl.visitor_session_id
  ),
  service_views AS (
    SELECT
      s.id,
      s.title,
      COUNT(svl.id)::int AS view_count
    FROM vendor_services s
    LEFT JOIN public.service_view_logs svl ON svl.service_id = s.id
    GROUP BY s.id, s.title
  ),
  country_stats AS (
    SELECT
      COALESCE(NULLIF(TRIM(country), ''), 'Unknown') AS country,
      COUNT(*)::int AS cnt
    FROM view_logs
    GROUP BY 1
  ),
  country_total AS (
    SELECT GREATEST(SUM(cnt), 1)::numeric AS total FROM country_stats
  ),
  recent_sessions AS (
    SELECT DISTINCT ON (vl.visitor_session_id)
      vl.visitor_session_id,
      vl.country,
      vl.city,
      vl.device_type,
      vl.last_visit_at,
      vl.first_visit_at,
      vl.service_title,
      vl.viewed_at
    FROM view_logs vl
    WHERE vl.visitor_session_id IS NOT NULL
    ORDER BY vl.visitor_session_id, vl.viewed_at DESC
  ),
  vendor_reviews AS (
    SELECT
      sr.id,
      sr.rating,
      sr.comment,
      sr.helpful_count,
      sr.created_at,
      sr.visitor_name,
      s.title AS service_title
    FROM public.service_reviews sr
    INNER JOIN vendor_services s ON s.id = sr.service_id
    WHERE sr.status = 'approved'
    ORDER BY sr.created_at DESC
    LIMIT 50
  ),
  metrics AS (
    SELECT
      (SELECT COUNT(*)::int FROM view_logs) AS total_listing_views,
      (SELECT COUNT(DISTINCT visitor_session_id)::int FROM view_logs WHERE visitor_session_id IS NOT NULL) AS unique_viewers,
      (SELECT COUNT(*)::int FROM view_logs WHERE viewed_at >= NOW() - INTERVAL '7 days') AS views_last_7_days,
      (SELECT COUNT(*)::int FROM view_logs WHERE viewed_at >= NOW() - INTERVAL '30 days') AS views_last_30_days,
      (SELECT COUNT(*)::int FROM public.service_inquiries WHERE vendor_id = p_vendor_id) AS total_inquiries,
      (SELECT COUNT(*)::int FROM public.service_likes sl INNER JOIN vendor_services s ON s.id = sl.service_id) AS total_likes,
      (SELECT COUNT(*)::int FROM vendor_services) AS total_services,
      (SELECT COUNT(*)::int FROM public.bookings b INNER JOIN vendor_services s ON s.id = b.service_id WHERE b.status IN ('confirmed', 'completed')) AS confirmed_bookings,
      (SELECT COUNT(*)::int FROM public.bookings b INNER JOIN vendor_services s ON s.id = b.service_id) AS total_bookings
  )
  SELECT jsonb_build_object(
    'totalListingViews', m.total_listing_views,
    'uniqueViewers', m.unique_viewers,
    'viewsLast7Days', m.views_last_7_days,
    'viewsLast30Days', m.views_last_30_days,
    'totalInquiries', m.total_inquiries,
    'totalLikes', m.total_likes,
    'totalServices', m.total_services,
    'totalBookings', m.total_bookings,
    'confirmedBookings', m.confirmed_bookings,
    'conversionRate', CASE
      WHEN m.unique_viewers > 0 THEN ROUND((m.confirmed_bookings::numeric / m.unique_viewers::numeric) * 100, 1)
      ELSE 0
    END,
    'inquiryRate', CASE
      WHEN m.unique_viewers > 0 THEN ROUND((m.total_inquiries::numeric / m.unique_viewers::numeric) * 100, 1)
      ELSE 0
    END,
    'topCountries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'country', cs.country,
        'count', cs.cnt,
        'percentage', ROUND((cs.cnt::numeric / ct.total) * 100, 1)::text
      ) ORDER BY cs.cnt DESC)
      FROM country_stats cs CROSS JOIN country_total ct
    ), '[]'::jsonb),
    'servicesChecked', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sv.id,
        'serviceName', sv.title,
        'timesChecked', sv.view_count,
        'category', '',
        'totalLikes', 0,
        'avgRating', 0
      ) ORDER BY sv.view_count DESC)
      FROM service_views sv
      WHERE sv.view_count > 0
    ), '[]'::jsonb),
    'topServices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sv.id,
        'serviceName', sv.title,
        'timesChecked', sv.view_count,
        'category', '',
        'totalLikes', 0,
        'avgRating', 0
      ) ORDER BY sv.view_count DESC)
      FROM (SELECT * FROM service_views ORDER BY view_count DESC LIMIT 5) sv
    ), '[]'::jsonb),
    'visitorSessions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rs.visitor_session_id,
        'country', rs.country,
        'city', rs.city,
        'deviceType', rs.device_type,
        'serviceTitle', rs.service_title,
        'location', NULLIF(TRIM(BOTH ', ' FROM CONCAT_WS(', ', NULLIF(TRIM(rs.city), ''), NULLIF(TRIM(rs.country), ''))), ''),
        'visitedAt', COALESCE(rs.last_visit_at, rs.viewed_at, rs.first_visit_at)
      ) ORDER BY COALESCE(rs.last_visit_at, rs.viewed_at, rs.first_visit_at) DESC)
      FROM (SELECT * FROM recent_sessions ORDER BY COALESCE(last_visit_at, viewed_at, first_visit_at) DESC LIMIT 10) rs
    ), '[]'::jsonb),
    'recentReviews', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', vr.id,
        'serviceName', vr.service_title,
        'rating', vr.rating,
        'comment', COALESCE(vr.comment, ''),
        'visitorName', COALESCE(vr.visitor_name, 'Anonymous'),
        'date', vr.created_at,
        'helpful', COALESCE(vr.helpful_count, 0)
      ) ORDER BY vr.created_at DESC)
      FROM (SELECT * FROM vendor_reviews ORDER BY created_at DESC LIMIT 5) vr
    ), '[]'::jsonb),
    'reviewsThisMonth', (
      SELECT COUNT(*)::int
      FROM public.service_reviews sr
      INNER JOIN vendor_services s ON s.id = sr.service_id
      WHERE sr.status = 'approved'
        AND sr.created_at >= date_trunc('month', NOW())
    ),
    'avgRating', COALESCE((
      SELECT ROUND(AVG(vr.rating)::numeric, 1) FROM vendor_reviews vr
    ), 0)
  )
  INTO v_result
  FROM metrics m;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_vendor_visitor_stats(uuid) TO authenticated;
