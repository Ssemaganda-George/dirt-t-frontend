-- Admin visitor-activity dashboard. SPA cannot SELECT app_visits (RLS USING false).
-- Age/gender are not collected; RPC leaves those empty.

CREATE OR REPLACE FUNCTION public.normalize_visit_country(p_country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_country IS NULL OR btrim(p_country) = '' OR lower(btrim(p_country)) = 'unknown' THEN 'Unknown'
    WHEN upper(btrim(p_country)) IN ('UG', 'UGA', 'UGANDA') THEN 'Uganda'
    WHEN upper(btrim(p_country)) IN ('US', 'USA', 'UNITED STATES') THEN 'United States'
    WHEN upper(btrim(p_country)) IN ('RW', 'RWA', 'RWANDA') THEN 'Rwanda'
    WHEN upper(btrim(p_country)) IN ('DE', 'DEU', 'GERMANY') THEN 'Germany'
    WHEN upper(btrim(p_country)) IN ('FR', 'FRA', 'FRANCE') THEN 'France'
    WHEN upper(btrim(p_country)) IN ('GH', 'GHA', 'GHANA') THEN 'Ghana'
    WHEN upper(btrim(p_country)) IN ('NL', 'NLD', 'NETHERLANDS') THEN 'Netherlands'
    WHEN upper(btrim(p_country)) IN ('KE', 'KEN', 'KENYA') THEN 'Kenya'
    WHEN upper(btrim(p_country)) IN ('TZ', 'TZA', 'TANZANIA') THEN 'Tanzania'
    WHEN upper(btrim(p_country)) IN ('GB', 'UK', 'UNITED KINGDOM') THEN 'United Kingdom'
    ELSE btrim(p_country)
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_visitor_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_admin');
  END IF;

  WITH visit_sessions AS (
    SELECT
      av.visitor_session_id,
      COUNT(*)::int AS page_hits,
      EXTRACT(EPOCH FROM (MAX(av.visited_at) - MIN(av.visited_at))) / 60.0 AS duration_minutes
    FROM public.app_visits av
    GROUP BY av.visitor_session_id
  ),
  country_stats AS (
    SELECT
      public.normalize_visit_country(av.country) AS country,
      COUNT(*)::int AS cnt
    FROM public.app_visits av
    GROUP BY 1
  ),
  country_total AS (
    SELECT GREATEST(SUM(cnt), 1)::numeric AS total FROM country_stats
  ),
  session_metrics AS (
    SELECT
      (SELECT COUNT(*)::int FROM public.visitor_sessions) AS unique_visitors,
      COALESCE(ROUND(AVG(vs.duration_minutes) FILTER (
        WHERE vs.duration_minutes > 0 AND vs.duration_minutes <= 120
      )::numeric, 1), 0) AS avg_session_duration,
      COALESCE(ROUND((
        COUNT(*) FILTER (WHERE vs.page_hits <= 1)::numeric
        / GREATEST(COUNT(*), 1)::numeric
      ) * 100, 1), 0) AS bounce_rate
    FROM visit_sessions vs
  ),
  top_services AS (
    SELECT
      s.id,
      s.title,
      COALESCE(s.category_id, '') AS category,
      (SELECT COUNT(*)::int FROM public.service_likes sl WHERE sl.service_id = s.id) AS total_likes,
      COALESCE((
        SELECT ROUND(AVG(sr.rating)::numeric, 1)
        FROM public.service_reviews sr
        WHERE sr.service_id = s.id AND sr.status = 'approved'
      ), 0) AS avg_rating,
      (SELECT COUNT(*)::int FROM public.service_view_logs svl WHERE svl.service_id = s.id) AS total_views
    FROM public.services s
    ORDER BY total_likes DESC, total_views DESC, s.title
    LIMIT 5
  ),
  recent_reviews AS (
    SELECT
      sr.id,
      COALESCE(s.title, 'Unknown Service') AS service_title,
      sr.rating,
      COALESCE(sr.comment, '') AS comment,
      COALESCE(sr.visitor_name, 'Anonymous') AS visitor_name,
      sr.created_at,
      COALESCE(sr.helpful_count, 0) AS helpful_count
    FROM public.service_reviews sr
    LEFT JOIN public.services s ON s.id = sr.service_id
    ORDER BY sr.created_at DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'totalVisitors', (SELECT COUNT(*)::int FROM public.app_visits),
    'uniqueVisitors', sm.unique_visitors,
    'avgSessionDuration', sm.avg_session_duration,
    'bounceRate', sm.bounce_rate,
    'topCountries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'country', cs.country,
        'count', cs.cnt,
        'percentage', ROUND((cs.cnt::numeric / ct.total) * 100, 1)::text
      ) ORDER BY cs.cnt DESC)
      FROM (SELECT * FROM country_stats ORDER BY cnt DESC LIMIT 8) cs
      CROSS JOIN country_total ct
    ), '[]'::jsonb),
    'topLikedServices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ts.id,
        'serviceName', ts.title,
        'category', ts.category,
        'totalLikes', ts.total_likes,
        'avgRating', ts.avg_rating
      ) ORDER BY ts.total_likes DESC, ts.total_views DESC)
      FROM top_services ts
    ), '[]'::jsonb),
    'recentReviews', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rr.id,
        'serviceName', rr.service_title,
        'rating', rr.rating,
        'comment', rr.comment,
        'visitorName', rr.visitor_name,
        'date', rr.created_at,
        'helpful', rr.helpful_count
      ) ORDER BY rr.created_at DESC)
      FROM recent_reviews rr
    ), '[]'::jsonb),
    'reviewsThisMonth', (
      SELECT COUNT(*)::int FROM public.service_reviews
      WHERE created_at >= date_trunc('month', timezone('utc', now()))
    ),
    'avgRating', COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1) FROM public.service_reviews WHERE status = 'approved'
    ), 0)
  )
  INTO v_result
  FROM session_metrics sm;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_visitor_stats() TO authenticated;
REVOKE ALL ON FUNCTION public.get_admin_visitor_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_visit_country(text) TO authenticated;
