import { supabase } from '../lib/supabaseClient'
import type { ServiceReview } from '../types'

export interface ReviewToken {
  id: string;
  booking_id: string;
  service_id: string;
  token: string;
  guest_name: string;
  guest_email: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

/**
 * Create a review for a service
 */
export async function createServiceReview(
  serviceId: string,
  review: {
    visitorSessionId?: string;
    userId?: string;
    ipAddress?: string;
    visitorName: string;
    visitorEmail?: string;
    rating: number;
    kpiRatings?: Record<string, number>;
    comment?: string;
    isVerifiedBooking?: boolean;
    reviewerCity?: string;
    reviewerCountry?: string;
  }
): Promise<ServiceReview> {
  try {
    // Use the SECURITY DEFINER RPC function to bypass RLS for both
    // guest and logged-in review inserts
    const { data, error } = await supabase.rpc('create_service_review', {
      p_service_id: serviceId,
      p_user_id: review.userId || null,
      p_visitor_session_id: review.visitorSessionId || null,
      p_ip_address: review.ipAddress || null,
      p_visitor_name: review.visitorName,
      p_visitor_email: review.visitorEmail || null,
      p_rating: review.rating,
      p_kpi_ratings: review.kpiRatings || null,
      p_comment: review.comment || null,
      p_is_verified_booking: review.isVerifiedBooking || false,
      p_reviewer_city: review.reviewerCity || null,
      p_reviewer_country: review.reviewerCountry || null,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error creating service review:', err);
    throw err;
  }
}

/**
 * Get approved reviews for a service
 */
export async function getServiceReviews(
  serviceId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<ServiceReview[]> {
  try {
    let query = supabase
      .from('service_reviews')
      .select('*')
      .eq('service_id', serviceId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching service reviews:', err);
    throw err;
  }
}

/**
 * Submit a review for a service (direct insert)
 */
export async function submitServiceReview(
  serviceId: string,
  visitorSessionId: string | null,
  review: {
    visitorName: string;
    visitorEmail?: string;
    rating: number;
    comment?: string;
    userId?: string;
    ipAddress?: string;
  }
): Promise<ServiceReview> {
  try {
    const { data, error } = await supabase
      .from('service_reviews')
      .insert({
        service_id: serviceId,
        visitor_session_id: visitorSessionId,
        user_id: review.userId,
        ip_address: review.ipAddress,
        visitor_name: review.visitorName,
        visitor_email: review.visitorEmail,
        rating: review.rating,
        comment: review.comment,
        status: 'pending', // Reviews start as pending for moderation
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error submitting service review:', err);
    throw err;
  }
}

/**
 * Approve a review (uses SECURITY DEFINER RPC to bypass RLS)
 */
export async function approveReview(reviewId: string, approvedBy?: string): Promise<ServiceReview> {
  try {
    const { data, error } = await supabase.rpc('admin_approve_review', {
      p_review_id: reviewId,
      p_approved_by: approvedBy || null,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error approving review:', err);
    throw err;
  }
}

/**
 * Reject a review (uses SECURITY DEFINER RPC to bypass RLS)
 */
export async function rejectReview(reviewId: string, reason?: string): Promise<ServiceReview> {
  try {
    const { data, error } = await supabase.rpc('admin_reject_review', {
      p_review_id: reviewId,
      p_reason: reason || 'Review does not meet guidelines',
    });

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error rejecting review:', err);
    throw err;
  }
}

/**
 * Get average rating for a service from approved reviews
 */
export async function getServiceAverageRating(serviceId: string): Promise<{ average: number; count: number; kpiAverages?: Record<string, { average: number; count: number }> }> {
  try {
    const { data, error } = await supabase
      .from('service_reviews')
      .select('rating, kpi_ratings')
      .eq('service_id', serviceId)
      .eq('status', 'approved');

    if (error) throw error;

    const reviews = data || [];
    if (reviews.length === 0) return { average: 0, count: 0 };

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);

    // Calculate KPI averages from all reviews that have kpi_ratings
    const kpiTotals: Record<string, { total: number; count: number }> = {};
    for (const review of reviews) {
      if (review.kpi_ratings && typeof review.kpi_ratings === 'object') {
        for (const [key, value] of Object.entries(review.kpi_ratings as Record<string, number>)) {
          if (value && value > 0) {
            if (!kpiTotals[key]) kpiTotals[key] = { total: 0, count: 0 };
            kpiTotals[key].total += value;
            kpiTotals[key].count += 1;
          }
        }
      }
    }

    const kpiAverages: Record<string, { average: number; count: number }> = {};
    for (const [key, { total: kpiTotal, count: kpiCount }] of Object.entries(kpiTotals)) {
      kpiAverages[key] = {
        average: Math.round((kpiTotal / kpiCount) * 10) / 10,
        count: kpiCount,
      };
    }

    return {
      average: Math.round((total / reviews.length) * 10) / 10,
      count: reviews.length,
      kpiAverages: Object.keys(kpiAverages).length > 0 ? kpiAverages : undefined,
    };
  } catch (err) {
    console.error('Error fetching average rating:', err);
    return { average: 0, count: 0 };
  }
}

/**
 * Get all pending reviews for admin moderation
 */
export async function getAllPendingReviews(): Promise<(ServiceReview & { service_title?: string; vendor_name?: string })[]> {
  try {
    const allReviews = await getAllReviewsForAdmin();
    return allReviews.filter(r => r.status === 'pending');
  } catch (err) {
    console.error('Error fetching pending reviews:', err);
    return [];
  }
}

/**
 * Get all reviews for admin (all statuses)
 * Uses SECURITY DEFINER RPC to bypass RLS and ensure all reviews are returned
 */
export async function getAllReviewsForAdmin(): Promise<(ServiceReview & { service_title?: string; vendor_name?: string })[]> {
  try {
    const { data, error } = await supabase.rpc('get_all_reviews_admin');

    if (error) throw error;

    // RPC returns a JSON array or null
    const reviews = data || [];
    return reviews.map((r: any) => ({
      ...r,
      service_title: r.service_title || 'Unknown Service',
      vendor_name: r.vendor_name || 'Unknown Vendor',
    }));
  } catch (err) {
    console.error('Error fetching all reviews:', err);
    return [];
  }
}

/**
 * Mark review as helpful
 */
export async function markReviewHelpful(reviewId: string): Promise<ServiceReview> {
  try {
    // Fetch current review
    const { data: review, error: fetchError } = await supabase
      .from('service_reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError) throw fetchError;

    // Update with incremented count
    const { data, error } = await supabase
      .from('service_reviews')
      .update({ helpful_count: (review.helpful_count || 0) + 1 })
      .eq('id', reviewId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error marking review as helpful:', err);
    throw err;
  }
}

/**
 * Mark review as unhelpful
 */
export async function markReviewUnhelpful(reviewId: string): Promise<ServiceReview> {
  try {
    // Fetch current review
    const { data: review, error: fetchError } = await supabase
      .from('service_reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError) throw fetchError;

    // Update with incremented count
    const { data, error } = await supabase
      .from('service_reviews')
      .update({ unhelpful_count: (review.unhelpful_count || 0) + 1 })
      .eq('id', reviewId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error marking review as unhelpful:', err);
    throw err;
  }
}

/**
 * Generate a unique review token for a completed booking
 */
export async function generateReviewToken(bookingId: string): Promise<ReviewToken | null> {
  try {
    // Fetch the booking with service details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services (id, title, slug, vendor_id, vendors (id, business_name)),
        profiles (id, full_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;
    if (!booking) throw new Error('Booking not found');

    const guestName = booking.guest_name || booking.profiles?.full_name || 'Guest';
    const guestEmail = booking.guest_email || booking.profiles?.email || '';

    if (!guestEmail) {
      console.warn('No email available for booking', bookingId);
      return null;
    }

    // Generate a random token
    const token = crypto.randomUUID ? crypto.randomUUID() :
      `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Set expiry to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data, error } = await supabase
      .from('review_tokens')
      .insert({
        booking_id: bookingId,
        service_id: booking.service_id,
        token,
        guest_name: guestName,
        guest_email: guestEmail,
        is_used: false,
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error generating review token:', err);
    return null;
  }
}

/**
 * Validate a review token and return associated data
 */
export async function validateReviewToken(token: string): Promise<{
  valid: boolean;
  tokenData?: ReviewToken;
  booking?: any;
  service?: any;
} | null> {
  try {
    const { data, error } = await supabase
      .from('review_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      return { valid: false };
    }

    // Check if already used
    if (data.is_used) {
      return { valid: false, tokenData: data };
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      return { valid: false, tokenData: data };
    }

    // Fetch service details
    const { data: service } = await supabase
      .from('services')
      .select(`
        id, title, slug, images, location, price, currency,
        vendors (id, business_name),
        service_categories (id, name)
      `)
      .eq('id', data.service_id)
      .single();

    // Fetch booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', data.booking_id)
      .single();

    return {
      valid: true,
      tokenData: data,
      booking,
      service,
    };
  } catch (err) {
    console.error('Error validating review token:', err);
    return null;
  }
}

/**
 * Submit a review using a review token (verified booking review)
 */
export async function submitReviewWithToken(
  token: string,
  review: {
    rating: number;
    comment: string;
    visitorName?: string;
    kpiRatings?: Record<string, number>;
  }
): Promise<ServiceReview | null> {
  try {
    // Validate token first
    const validation = await validateReviewToken(token);
    if (!validation?.valid || !validation.tokenData) {
      throw new Error('Invalid or expired review token');
    }

    const tokenData = validation.tokenData;

    // Create the review as a verified booking review
    const { data: reviewData, error: reviewError } = await supabase
      .from('service_reviews')
      .insert({
        service_id: tokenData.service_id,
        visitor_name: review.visitorName || tokenData.guest_name,
        visitor_email: tokenData.guest_email,
        rating: review.rating,
        kpi_ratings: review.kpiRatings || null,
        comment: review.comment,
        is_verified_booking: true,
        status: 'approved', // Auto-approve verified booking reviews
      })
      .select('*')
      .single();

    if (reviewError) throw reviewError;

    // Mark token as used
    await supabase
      .from('review_tokens')
      .update({ is_used: true })
      .eq('id', tokenData.id);

    return reviewData;
  } catch (err) {
    console.error('Error submitting review with token:', err);
    throw err;
  }
}

/**
 * Send review request email when booking is completed.
 */
export async function sendReviewRequestEmail(
  bookingId: string,
  reviewToken: string,
  guestEmail: string,
  guestName: string,
  serviceName: string,
  vendorName: string
): Promise<{ sent: boolean; reviewUrl: string }> {
  const baseUrl = window.location.origin;
  const reviewUrl = `${baseUrl}/review/${reviewToken}`;

  try {
    // Try to use Supabase Edge Function for email
    const { error } = await supabase.functions.invoke('send-review-email', {
      body: {
        to: guestEmail,
        guestName,
        serviceName,
        vendorName,
        reviewUrl,
        bookingId,
      },
    });

    if (error) {
      console.warn('Edge function email not available, review link generated:', reviewUrl);
      return { sent: false, reviewUrl };
    }

    return { sent: true, reviewUrl };
  } catch (err) {
    console.warn('Email sending failed, review link generated:', reviewUrl);
    return { sent: false, reviewUrl };
  }
}
