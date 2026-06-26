import { supabase } from '../lib/supabaseClient'
import type { VisitorSession, ServiceLike, VisitorActivity } from '../types'

export interface AppVisit {
  id: string;
  visitor_session_id: string;
  page_path: string;
  page_name?: string;
  referrer?: string;
  ip_address?: string;
  country?: string;
  city?: string;
  user_agent?: string;
  visited_at: string;
}

export type { ScanSession } from './ScanSessionRepository'
export {
  createScanSession,
  getActiveScanSession,
  expireScanSession,
  getScanSessionsForService,
} from './ScanSessionRepository'

/**
 * Get or create a visitor session based on IP address
 */
export async function getOrCreateVisitorSession(
  ipAddress: string,
  options?: {
    userId?: string;
    country?: string;
    city?: string;
    deviceType?: string;
    browserInfo?: string;
    userAgent?: string;
  }
): Promise<VisitorSession> {
  try {
    const { data, error } = await supabase.rpc('get_or_create_visitor_session', {
      p_ip_address: ipAddress,
      p_user_id: options?.userId,
      p_country: options?.country,
      p_city: options?.city,
      p_device_type: options?.deviceType,
      p_browser_info: options?.browserInfo,
      p_user_agent: options?.userAgent,
    });

    if (error) throw error;

    // Fetch the created/updated session
    const { data: session, error: fetchError } = await supabase
      .from('visitor_sessions')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) throw fetchError;
    return session;
  } catch (err) {
    console.error('Error getting/creating visitor session:', err);
    throw err;
  }
}

/**
 * Record a like on a service
 */
export async function likeService(
  serviceId: string,
  visitorSessionId: string,
  options?: {
    userId?: string;
    ipAddress?: string;
  }
): Promise<ServiceLike> {
  try {
    const { data, error } = await supabase.rpc('record_service_like', {
      p_service_id: serviceId,
      p_visitor_session_id: visitorSessionId,
      p_user_id: options?.userId,
      p_ip_address: options?.ipAddress,
    });

    if (error) throw error;

    // Fetch the created like
    const { data: like, error: fetchError } = await supabase
      .from('service_likes')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) throw fetchError;
    return like;
  } catch (err) {
    console.error('Error liking service:', err);
    throw err;
  }
}

/**
 * Remove a like from a service
 */
export async function unlikeService(
  serviceId: string,
  visitorSessionId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('remove_service_like', {
      p_service_id: serviceId,
      p_visitor_session_id: visitorSessionId,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error unliking service:', err);
    throw err;
  }
}

/**
 * Check if a visitor has liked a service
 */
export async function hasVisitorLikedService(
  serviceId: string,
  visitorSessionId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('service_likes')
      .select('id')
      .eq('service_id', serviceId)
      .eq('visitor_session_id', visitorSessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return !!data;
  } catch (err) {
    console.error('Error checking if service is liked:', err);
    return false;
  }
}

/**
 * Get all likes for a service
 */
export async function getServiceLikes(serviceId: string): Promise<ServiceLike[]> {
  try {
    const { data, error } = await supabase
      .from('service_likes')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching service likes:', err);
    throw err;
  }
}

/**
 * Get visitor activity for a service
 */
export async function getServiceVisitorActivity(serviceId: string): Promise<VisitorActivity | null> {
  try {
    const { data, error } = await supabase
      .from('visitor_activity')
      .select('*')
      .eq('service_id', serviceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data || null;
  } catch (err) {
    console.error('Error fetching visitor activity:', err);
    return null;
  }
}

/**
 * Log a service view
 */
export async function logServiceView(
  serviceId: string,
  visitorSessionId: string,
  options?: {
    userId?: string;
    ipAddress?: string;
    referrer?: string;
  }
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_service_view', {
      p_service_id: serviceId,
      p_visitor_session_id: visitorSessionId,
      p_user_id: options?.userId,
      p_ip_address: options?.ipAddress,
      p_referrer: options?.referrer,
    });

    if (error) throw error;
  } catch (err) {
    console.error('Error logging service view:', err);
    // Don't throw - this is analytics data, not critical
  }
}

/**
 * Record a service like by a visitor
 */
export async function recordServiceLike(
  serviceId: string,
  visitorSessionId: string,
  options?: {
    userId?: string;
    ipAddress?: string;
  }
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('record_service_like', {
      p_service_id: serviceId,
      p_visitor_session_id: visitorSessionId,
      p_user_id: options?.userId,
      p_ip_address: options?.ipAddress,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error recording service like:', err);
    throw err;
  }
}

/**
 * Remove a service like by a visitor
 */
export async function removeServiceLike(
  serviceId: string,
  visitorSessionId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('remove_service_like', {
      p_service_id: serviceId,
      p_visitor_session_id: visitorSessionId,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error removing service like:', err);
    throw err;
  }
}

/**
 * Check if a service is liked by a visitor session
 */
export async function checkServiceLiked(
  serviceId: string,
  visitorSessionId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('service_likes')
      .select('id')
      .eq('service_id', serviceId)
      .eq('visitor_session_id', visitorSessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return !!data;
  } catch (err) {
    console.error('Error checking if service is liked:', err);
    return false;
  }
}

/**
 * Get visitor activity for all services of a vendor
 */
export async function getVendorVisitorActivity(vendorId: string): Promise<VisitorActivity[]> {
  try {
    const { data, error } = await supabase
      .from('visitor_activity')
      .select(`
        *,
        services:service_id (
          id,
          title,
          slug
        )
      `)
      .eq('vendor_id', vendorId)
      .order('total_views', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching vendor visitor activity:', err);
    throw err;
  }
}

/**
 * Get service activity statistics
 */
export async function getServiceActivityStats(serviceId: string) {
  try {
    const activity = await getServiceVisitorActivity(serviceId);
    const { getServiceReviews } = await import('./ReviewRepository')
    const reviews = await getServiceReviews(serviceId, { limit: 5 });
    const likes = await getServiceLikes(serviceId);

    return {
      activity,
      recentReviews: reviews,
      totalLikes: likes.length,
      reviewCount: reviews.length,
      averageRating: activity?.average_rating || 0,
    };
  } catch (err) {
    console.error('Error fetching service activity stats:', err);
    throw err;
  }
}

export async function getVisitorActivityStats() {
  try {
    // Get all profiles (visitors/tourists)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at, role')
      .eq('role', 'tourist')

    if (profilesError) throw profilesError

    // Get all bookings with service and profile info
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, tourist_id, service_id, status, created_at, total_amount, currency')
      .in('status', ['confirmed', 'completed', 'pending'])

    if (bookingsError) throw bookingsError

    // Get all services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title')

    if (servicesError) throw servicesError

    // Get all reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, service_id, user_id, rating, comment, helpful_count, created_at, profiles(full_name), services(title)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (reviewsError) throw reviewsError

    // Process data for analytics
    const uniqueVisitorIds = new Set<string>()

    profiles?.forEach((profile: any) => {
      uniqueVisitorIds.add(profile.id)
    })

    // Get top liked services (based on service count)
    const topLikedServices = services
      ?.slice(0, 5)
      .map((s: any) => ({
        id: s.id,
        serviceName: s.title,
        category: '',
        totalLikes: 0,
        avgRating: 0
      })) || []

    // Get recent reviews with formatted data
    const recentReviewsList = reviews
      ?.map((r: any) => ({
        id: r.id,
        serviceName: r.services?.title || 'Unknown Service',
        rating: r.rating || 0,
        comment: r.comment || '',
        visitorName: r.profiles?.full_name || 'Anonymous',
        date: r.created_at || new Date().toISOString(),
        helpful: r.helpful_count || 0
      })) || []

    // Count reviews this month
    const now = new Date()
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
    const reviewsThisMonth = reviews?.filter((r: any) => new Date(r.created_at) >= monthAgo).length || 0

    // Calculate average rating
    const avgRating = reviews && reviews.length > 0
      ? (reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : '0'

    // Calculate average session duration (using booking data as proxy)
    const avgSessionDuration = bookings?.length ? (bookings.length * 0.5).toFixed(1) : '0'
    const bounceRate = bookings?.length ? ((1 - (bookings.filter((b: any) => b.status === 'confirmed').length / bookings.length)) * 100).toFixed(1) : '0'

    return {
      totalVisitors: profiles?.length || 0,
      uniqueVisitors: uniqueVisitorIds.size,
      avgSessionDuration: parseFloat(avgSessionDuration as string),
      bounceRate: parseFloat(bounceRate as string),
      topCountries: [],
      ageGroups: [],
      genderDistribution: { male: 0, female: 0, other: 0 },
      topLikedServices,
      recentReviews: recentReviewsList,
      reviewsThisMonth,
      avgRating: parseFloat(avgRating as string)
    }
  } catch (error) {
    console.error('Error fetching visitor activity stats:', error)
    throw error
  }
}

export async function getVendorActivityStats(vendorId: string) {
  try {
    const { data, error } = await supabase.rpc('get_vendor_visitor_stats', {
      p_vendor_id: vendorId,
    })

    if (error) throw error

    const stats = data || {}

    return {
      vendorId,
      totalVisitors: stats.totalListingViews ?? 0,
      uniqueVisitors: stats.uniqueViewers ?? 0,
      viewsLast7Days: stats.viewsLast7Days ?? 0,
      viewsLast30Days: stats.viewsLast30Days ?? 0,
      totalInquiries: stats.totalInquiries ?? 0,
      totalLikes: stats.totalLikes ?? 0,
      totalServices: stats.totalServices ?? 0,
      totalBookings: stats.confirmedBookings ?? 0,
      conversionRate: Number(stats.conversionRate ?? 0),
      inquiryRate: Number(stats.inquiryRate ?? 0),
      topCountries: stats.topCountries ?? [],
      topServices: stats.topServices ?? [],
      servicesChecked: stats.servicesChecked ?? [],
      visitorSessions: stats.visitorSessions ?? [],
      recentReviews: stats.recentReviews ?? [],
      reviewsThisMonth: stats.reviewsThisMonth ?? 0,
      avgRating: Number(stats.avgRating ?? 0),
      ageGroups: [],
      genderDistribution: { male: 0, female: 0, other: 0 },
    }
  } catch (error) {
    console.error(`Error fetching vendor activity stats for ${vendorId}:`, error)
    throw error
  }
}

export async function getAllVendorsWithActivity() {
  try {
    // Prefer vendors from the vendors table, joined to profiles when available.
    const { data: vendorRows, error: vendorRowsError } = await supabase
      .from('vendors')
      .select('id, business_name, business_email, avatar_url, user_id, profiles(id, full_name, email, avatar_url)')
      .order('created_at', { ascending: false })

    if (vendorRowsError) {
      console.error('Error fetching vendors from vendors table:', vendorRowsError)
      throw vendorRowsError
    }

    let finalVendors: any[] = (vendorRows || []).map((vendor: any) => ({
      id: vendor.id,
      business_name: vendor.business_name,
      business_email: vendor.business_email,
      avatar_url: vendor.avatar_url || vendor.profiles?.avatar_url || null,
      profile_full_name: vendor.profiles?.full_name,
      profile_email: vendor.profiles?.email,
      profile_id: vendor.profiles?.id
    }))

    // Fallback: if vendor table is empty, try to derive vendors from service vendor_ids
    if (!finalVendors || finalVendors.length === 0) {
      console.log('No vendors found in vendors table, checking services fallback...')
      const { data: serviceVendors, error: serviceVendorsError } = await supabase
        .from('services')
        .select('vendor_id')

      if (!serviceVendorsError && serviceVendors) {
        const uniqueVendorIds = [...new Set(serviceVendors.map((s: any) => s.vendor_id))]
        console.log('Unique vendor IDs from services:', uniqueVendorIds)

        if (uniqueVendorIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, role')
            .in('id', uniqueVendorIds)

          if (!profileError && profileData) {
            finalVendors = profileData.map((vendor: any) => ({
              id: vendor.id,
              business_name: vendor.full_name,
              business_email: vendor.email,
              avatar_url: vendor.avatar_url
            }))
            console.log('Vendors from services vendor_ids:', finalVendors)
          }
        }
      }
    }

    if (!finalVendors || finalVendors.length === 0) {
      console.log('No vendors found')
      return []
    }

    const vendorStats = await Promise.all(
      finalVendors.map(async (vendor: any) => {
        try {
          const stats = await getVendorActivityStats(vendor.id)
          console.log(`Stats for vendor ${vendor.business_name || vendor.profile_full_name}:`, stats)
          const { vendorId: _unusedVendorId, ...cleanedStats } = stats || {}
          return {
            vendorId: vendor.id,
            vendorName: vendor.business_name || vendor.profile_full_name || 'Unknown Vendor',
            vendorEmail: vendor.business_email || vendor.profile_email || 'Unknown',
            vendorAvatar: vendor.avatar_url || null,
            ...cleanedStats
          }
        } catch (error) {
          console.error(`Error getting stats for vendor ${vendor.id}:`, error)
          return {
            vendorId: vendor.id,
            vendorName: vendor.business_name || vendor.profile_full_name || 'Unknown Vendor',
            vendorEmail: vendor.business_email || vendor.profile_email || 'Unknown',
            vendorAvatar: vendor.avatar_url || null,
            totalVisitors: 0,
            uniqueVisitors: 0,
            totalServices: 0,
            totalBookings: 0,
            conversionRate: 0,
            avgRating: 0,
            topCountries: [],
            ageGroups: [],
            genderDistribution: { male: 0, female: 0, other: 0 },
            topServices: [],
            recentReviews: [],
            reviewsThisMonth: 0
          }
        }
      })
    )

    console.log('Final vendor stats:', vendorStats)
    return vendorStats
  } catch (error) {
    console.error('Error fetching all vendors activity:', error)
    throw error
  }
}

/**
 * Get app visit statistics for the platform
 */
export async function getAppVisitStats(daysBack: number = 30): Promise<{
  totalVisits: number;
  uniqueVisitors: number;
  topPages: Array<{ page_name: string; count: number }>;
  visitorsByCountry: Array<{ country: string; count: number }>;
  recentVisits: AppVisit[];
}> {
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysBack);

    // Get total visits and unique visitors
    const { data: visits, error: visitsError } = await supabase
      .from('app_visits')
      .select('id, visitor_session_id, page_name, country', { count: 'exact' })
      .gte('visited_at', sinceDate.toISOString());

    if (visitsError) throw visitsError;

    const totalVisits = visits?.length || 0;
    const uniqueVisitors = new Set(
      visits?.map((v) => v.visitor_session_id) || []
    ).size;

    // Get top pages
    const pageStats = new Map<string, number>();
    visits?.forEach((v) => {
      const page = v.page_name || 'Unknown';
      pageStats.set(page, (pageStats.get(page) || 0) + 1);
    });

    const topPages = Array.from(pageStats.entries())
      .map(([page_name, count]) => ({ page_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get visitors by country
    const countryStats = new Map<string, number>();
    visits?.forEach((v) => {
      const country = v.country || 'Unknown';
      countryStats.set(country, (countryStats.get(country) || 0) + 1);
    });

    const visitorsByCountry = Array.from(countryStats.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Get recent visits
    const { data: recentVisits, error: recentError } = await supabase
      .from('app_visits')
      .select('*')
      .gte('visited_at', sinceDate.toISOString())
      .order('visited_at', { ascending: false })
      .limit(20);

    if (recentError) throw recentError;

    return {
      totalVisits,
      uniqueVisitors,
      topPages,
      visitorsByCountry,
      recentVisits: recentVisits || [],
    };
  } catch (err) {
    console.error('Error fetching app visit stats:', err);
    throw err;
  }
}

/**
 * Get app visit analytics by page
 */
export async function getPageVisitStats(pageName: string, daysBack: number = 30) {
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('app_visits')
      .select('*')
      .eq('page_name', pageName)
      .gte('visited_at', sinceDate.toISOString())
      .order('visited_at', { ascending: false });

    if (error) throw error;

    const uniqueVisitors = new Set(data?.map((v) => v.visitor_session_id) || [])
      .size;

    return {
      pageName,
      totalVisits: data?.length || 0,
      uniqueVisitors,
      visits: data || [],
    };
  } catch (err) {
    console.error('Error fetching page visit stats:', err);
    throw err;
  }
}

/**
 * Get visitor journey (page visit sequence)
 */
export async function getVisitorJourney(visitorSessionId: string) {
  try {
    const { data, error } = await supabase
      .from('app_visits')
      .select('*')
      .eq('visitor_session_id', visitorSessionId)
      .order('visited_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error('Error fetching visitor journey:', err);
    throw err;
  }
}
