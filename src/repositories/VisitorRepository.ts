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
 * Lookup country name for an IP address using ipapi.co with a short timeout.
 * Caches results in-memory. Returns null if lookup fails or no country found.
 */
const ipCountryCache = new Map<string, string | null>()

async function lookupCountryByIp(_ip: string): Promise<string | null> {
  const ip = String(_ip || '').trim()
  if (!ip) return null

  if (ipCountryCache.has(ip)) {
    return ipCountryCache.get(ip) || null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const country = (data?.country_name || data?.country || data?.region_name || data?.region || null)
      ? String(data?.country_name || data?.country || data?.region_name || data?.region).trim()
      : null

    ipCountryCache.set(ip, country)
    return country
  } catch (error) {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

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
    // Get all services for this vendor
    const { data: vendorServices, error: servicesError } = await supabase
      .from('services')
      .select('id, title')
      .eq('vendor_id', vendorId)

    if (servicesError) throw servicesError

    // Get all bookings for this vendor's services
    const { data: vendorBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, tourist_id, service_id, status, created_at, total_amount, currency, profiles(full_name)')
      .in('service_id', vendorServices?.map((s: any) => s.id) || [])

    if (bookingsError) throw bookingsError

    // Get visitor sessions and view logs for this vendor's services
    let visitorSessions: any[] = []
    let serviceViewLogs: any[] = []
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('visitor_sessions')
        .select('id, ip_address, country, city, device_type, user_id, first_visit_at, last_visit_at, created_at, visit_count')
        .order('first_visit_at', { ascending: false })
        .limit(100)

      if (!sessionsError && sessionsData) {
        visitorSessions = sessionsData
      } else if (sessionsError) {
        console.warn('Visitor sessions table unavailable:', sessionsError)
      }

      // For sessions missing country info, attempt an IP->country lookup (cached)
      try {
        const sessionsToLookup = visitorSessions.filter((s: any) => (!s.country || s.country === '') && s.ip_address)
        if (sessionsToLookup.length > 0) {
          await Promise.all(sessionsToLookup.map(async (s: any) => {
            try {
              const country = await lookupCountryByIp(s.ip_address)
              if (country) s.country = country
            } catch (err) {
              // ignore lookup errors per-session
            }
          }))
        }
      } catch (err) {
        console.warn('Error during IP->country lookups:', err)
      }

      // Get view logs for services
      const { data: viewLogsData, error: viewLogsError } = await supabase
        .from('service_view_logs')
        .select('id, service_id, visitor_session_id, viewed_at, services(title)')
        .in('service_id', vendorServices?.map((s: any) => s.id) || [])
        .order('viewed_at', { ascending: false })
        .limit(100)

      if (!viewLogsError && viewLogsData) {
        serviceViewLogs = viewLogsData
      } else if (viewLogsError) {
        console.warn('Service view logs table unavailable:', viewLogsError)
      }
    } catch (error) {
      console.warn('Error fetching visitor sessions or view logs:', error)
    }

    // Get reviews for this vendor's services
    let vendorReviews: any[] = []
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('service_reviews')
      .select('id, service_id, user_id, rating, comment, helpful_count, created_at, visitor_name, services(title)')
      .in('service_id', vendorServices?.map((s: any) => s.id) || [])
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(50)

    if (reviewsError) {
      console.warn(`Reviews table unavailable for vendor ${vendorId}:`, reviewsError)
      vendorReviews = []
    } else {
      vendorReviews = reviewsData
    }

    // Track visitor sessions and unique guest IPs for this vendor
    const sessionById: Record<string, any> = {}
    visitorSessions.forEach((s: any) => {
      if (s && s.id) sessionById[s.id] = s
    })

    const viewedSessionIds = new Set(
      serviceViewLogs
        .map((log: any) => log.visitor_session_id)
        .filter((id: any) => id)
    )

    const relevantSessions = [...viewedSessionIds]
      .map((id: any) => sessionById[id])
      .filter(Boolean)

    const sessionsToCount = relevantSessions.length > 0 ? relevantSessions : visitorSessions

    const uniqueVisitorIps = new Set(
      sessionsToCount
        .map((session: any) => (session.ip_address || '').trim())
        .filter((ip: string) => ip)
    )

    const countryCounts: Record<string, number> = {}

    // Count countries for relevant visitor sessions
    sessionsToCount.forEach((session: any) => {
      const country = (session.country || 'Unknown').trim() || 'Unknown'
      countryCounts[country] = (countryCounts[country] || 0) + 1
    })

    // Fallback: if no view-log-derived countries, fall back to counting all recent sessions
    if (Object.keys(countryCounts).length === 0) {
      visitorSessions.forEach((session: any) => {
        if (session && session.country) {
          countryCounts[session.country] = (countryCounts[session.country] || 0) + 1
        }
      })
    }

    // Compute total for percentage calculations
    const totalCountryCount = Object.values(countryCounts).reduce((s, v) => s + v, 0) || visitorSessions.length || 1

    // Get top countries (sorted)
    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({
        country,
        count: count as number,
        percentage: ((count / totalCountryCount) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Track services checked by visitors
    const serviceCheckedCounts: Record<string, { title: string; count: number }> = {}
    serviceViewLogs.forEach((log: any) => {
      const serviceTitle = log.services?.title || 'Unknown Service'
      if (!serviceCheckedCounts[log.service_id]) {
        serviceCheckedCounts[log.service_id] = { title: serviceTitle, count: 0 }
      }
      serviceCheckedCounts[log.service_id].count += 1
    })

    // Get top services checked
    const servicesChecked = Object.entries(serviceCheckedCounts)
      .map(([id, data]) => ({
        id,
        serviceName: data.title,
        timesChecked: data.count,
        category: '',
        totalLikes: 0,
        avgRating: 0
      }))
      .sort((a, b) => b.timesChecked - a.timesChecked)
      .slice(0, 5)

    // Get top services for this vendor (just first 5)
    const topServices = vendorServices
      ?.slice(0, 5)
      .map((s: any) => ({
        id: s.id,
        serviceName: s.title,
        category: '',
        totalLikes: 0,
        avgRating: 0
      })) || []

    // Get vendor reviews
    const vendorReviewsList = vendorReviews
      ?.map((r: any) => ({
        id: r.id,
        serviceName: r.services?.title || 'Unknown Service',
        rating: r.rating || 0,
        comment: r.comment || '',
        visitorName: r.visitor_name || 'Anonymous',
        date: r.created_at || new Date().toISOString(),
        helpful: r.helpful_count || 0
      })) || []

    // Count reviews this month
    const now = new Date()
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
    const reviewsThisMonth = vendorReviews?.filter((r: any) => new Date(r.created_at) >= monthAgo).length || 0

    // Calculate average rating
    const avgRating = vendorReviews && vendorReviews.length > 0
      ? (vendorReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / vendorReviews.length).toFixed(1)
      : '0'

    // Calculate metrics
    const totalBookings = vendorBookings?.length || 0
    const confirmedBookings = vendorBookings?.filter((b: any) => b.status === 'confirmed').length || 0
    const conversionRate = totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(1) : '0'

    return {
      vendorId,
      totalVisitors: sessionsToCount.length,
      uniqueVisitors: uniqueVisitorIps.size,
      totalServices: vendorServices?.length || 0,
      totalBookings: confirmedBookings,
      conversionRate: parseFloat(conversionRate as string),
      topCountries,
      ageGroups: [],
      genderDistribution: { male: 0, female: 0, other: 0 },
      topServices,
      servicesChecked,
      visitorSessions: await enhanceVisitorSessions(visitorSessions.slice(0, 10), serviceViewLogs),
      recentReviews: vendorReviewsList,
      reviewsThisMonth,
      avgRating: parseFloat(avgRating as string)
    }
  } catch (error) {
    console.error(`Error fetching vendor activity stats for ${vendorId}:`, error)
    throw error
  }
}

/**
 * Enhance visitor sessions with session duration and pages visited
 */
async function enhanceVisitorSessions(sessions: any[], viewLogs: any[]): Promise<any[]> {
  try {
    // Create a map of IP addresses to their view logs
    const ipViewMap: Record<string, any[]> = {}

    viewLogs.forEach((log: any) => {
      const sessionId = log.visitor_session_id
      if (!ipViewMap[sessionId]) {
        ipViewMap[sessionId] = []
      }
      ipViewMap[sessionId].push(log)
    })

    // Enhance sessions with page visit info and session duration
    const enhancedSessions = sessions.map((session: any) => {
      const sessionViews = ipViewMap[session.id] || []

      // Calculate session duration (time between first and last view)
      let sessionDuration = 0
      if (sessionViews.length > 1) {
        const firstView = new Date(sessionViews[0].viewed_at).getTime()
        const lastView = new Date(sessionViews[sessionViews.length - 1].viewed_at).getTime()
        sessionDuration = Math.floor((lastView - firstView) / 1000 / 60) // Convert to minutes
      }

      // Get unique pages (services) visited
      const pagesVisited = new Set(sessionViews.map((log: any) => log.service_id))
      const pageCount = pagesVisited.size

      // Calculate time since first visit
      const firstVisit = new Date(session.first_visit_at)
      const now = new Date()
      const daysSinceFirstVisit = Math.floor((now.getTime() - firstVisit.getTime()) / 1000 / 60 / 60 / 24)

      const locationParts = []
      if (session.city && session.city !== '') locationParts.push(session.city)
      if (session.country && session.country !== '') locationParts.push(session.country)
      const location = locationParts.length > 0 ? locationParts.join(', ') : (session.ip_address || 'Unknown')

      return {
        ...session,
        sessionDuration,
        pagesVisited: pageCount,
        viewCount: sessionViews.length,
        daysSinceFirstVisit,
        ipAddress: session.ip_address || 'Unknown',
        location,
        visitedAt: (session.last_visit_at || session.first_visit_at || session.created_at) ? new Date(session.last_visit_at || session.first_visit_at || session.created_at).toISOString() : null
      }
    })

    return enhancedSessions
  } catch (error) {
    console.warn('Error enhancing visitor sessions:', error)
    return sessions // Return original sessions if enhancement fails
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
