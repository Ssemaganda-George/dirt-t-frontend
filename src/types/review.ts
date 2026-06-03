export interface VisitorSession {
  id: string;
  ip_address: string;
  user_id?: string;
  country?: string;
  city?: string;
  device_type?: string;
  browser_info?: string;
  user_agent?: string;
  first_visit_at: string;
  last_visit_at: string;
  visit_count: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceLike {
  id: string;
  service_id: string;
  visitor_session_id: string;
  user_id?: string;
  ip_address: string;
  liked_at: string;
  created_at: string;
}

export interface ServiceReview {
  id: string;
  service_id: string;
  visitor_session_id?: string;
  user_id?: string;
  ip_address?: string;
  visitor_name: string;
  visitor_email?: string;
  rating: number;
  kpi_ratings?: Record<string, number> | null;
  comment?: string;
  helpful_count: number;
  unhelpful_count: number;
  is_verified_booking: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  rejection_reason?: string;
  reviewer_city?: string;
  reviewer_country?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
}

export interface VisitorActivity {
  id: string;
  service_id: string;
  vendor_id: string;
  total_views: number;
  unique_visitors: number;
  total_likes: number;
  total_reviews: number;
  approved_reviews: number;
  average_rating: number;
  total_helpful_count: number;
  views_this_month: number;
  likes_this_month: number;
  reviews_this_month: number;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceViewLog {
  id: string;
  service_id: string;
  visitor_session_id: string;
  user_id?: string;
  ip_address: string;
  referrer?: string;
  viewed_at: string;
}
