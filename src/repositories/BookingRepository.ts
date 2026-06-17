import { supabase } from '../lib/supabaseClient'
import { getAccessToken } from '../services/AuthService'
import { buildCreateBookingAtomicRpcPayload } from '../lib/createBookingAtomicRpc'
import { normalizeServiceCurrency } from '../lib/utils'
import type { Booking } from '../types'
import { getAdminProfileId } from './PartnerRepository'
import {
  shouldSendReservationEmails,
} from '../lib/bookingCategories'

// Re-export the type alias used in database.ts
export type BookingStatus = 'pending' | 'confirmed' | 'reserved' | 'cancelled' | 'completed'

/**
 * Calls the Supabase edge function to send booking confirmation emails
 * to tourist, vendor, and admin
 */
async function sendBookingEmails(bookingId: string): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase env vars not set, skipping email notification')
      return
    }

    console.log('📧 Calling send-booking-emails edge function for booking:', bookingId)

    // Get current session token for authentication
    const authToken = await getAccessToken()

    // Call the edge function directly with fetch, with retry/backoff for 429 rate limits
    const maxAttempts = 4
    let attempt = 0
    let lastError: any = null

    while (attempt < maxAttempts) {
      attempt += 1
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-booking-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({ booking_id: bookingId }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Booking emails sent successfully:', data)
          return
        }

        // Handle 429 (rate limit) specially: use Retry-After header if present
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : Math.min(2 ** attempt, 10)
          console.warn(`Rate limited sending emails (attempt ${attempt}). Waiting ${waitSeconds}s before retry.`)
          await new Promise(res => setTimeout(res, waitSeconds * 1000))
          lastError = new Error(`429 Rate limited (attempt ${attempt})`)
          continue
        }

        const errorText = await response.text()
        console.error('❌ Edge function returned error:', response.status, errorText)
        lastError = new Error(`Failed to send booking emails: ${response.status} ${errorText}`)
        break
      } catch (err) {
        // Network or other error - backoff and retry
        console.error(`Error calling send-booking-emails (attempt ${attempt}):`, err)
        lastError = err
        const backoff = Math.min(2 ** attempt, 10)
        await new Promise(res => setTimeout(res, backoff * 1000))
      }
    }

    if (lastError) {
      console.error('❌ All attempts to call send-booking-emails failed:', lastError)
      // We don't rethrow; email failures shouldn't block booking creation
    }
  } catch (error: any) {
    console.error('❌ Error calling send-booking-emails edge function:', error)
    console.error('Error details:', error?.message, error?.stack)
    // Don't throw - email failure shouldn't break the booking creation
  }
}

async function generateReviewToken(bookingId: string): Promise<any | null> {
  try {
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

async function sendReviewRequestEmail(
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

export async function createBooking(
  booking: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'vendor_id'> & {
    vendor_id?: string
    /** Pre-fee line total for commission in create_booking_atomic; optional. */
    pricing_base_amount?: number | null
  }
): Promise<Booking> {
  console.log('createBooking called with:', booking)

  // Check if this is a guest booking
  const isGuestBooking = !booking.tourist_id

  if (isGuestBooking && (!booking.guest_name || !booking.guest_email || !booking.guest_phone)) {
    throw new Error('Guest name, email, and phone are required for guest bookings')
  }

  // If vendor_id is not provided, fetch it from the service
  let bookingData = { ...booking }
  if (!bookingData.vendor_id && bookingData.service_id) {
    try {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('vendor_id')
        .eq('id', bookingData.service_id)
        .single()

      if (serviceError) {
        console.error('Error fetching service vendor_id:', serviceError)
      } else if (service?.vendor_id) {
        bookingData.vendor_id = service.vendor_id
        console.log('Auto-set vendor_id from service:', service.vendor_id)
      }
    } catch (error) {
      console.error('Exception fetching service vendor_id:', error)
    }
  }

  console.log('Final booking data with vendor_id:', bookingData.vendor_id)

  if (!bookingData.vendor_id) {
    throw new Error('vendor_id is required to create a booking (could not resolve from service)')
  }

  // Use atomic function to create booking with capacity validation (14-arg overload; see createBookingAtomicRpc.ts)
  const result = await supabase.rpc(
    'create_booking_atomic',
    buildCreateBookingAtomicRpcPayload({
      p_service_id: bookingData.service_id,
      p_vendor_id: bookingData.vendor_id,
      p_booking_date: bookingData.booking_date,
      p_guests: bookingData.guests,
      p_total_amount: bookingData.total_amount,
      p_tourist_id: bookingData.tourist_id || null,
      p_service_date: bookingData.service_date || null,
      p_currency: normalizeServiceCurrency(bookingData.currency),
      p_special_requests: bookingData.special_requests || null,
      p_guest_name: bookingData.guest_name || null,
      p_guest_email: bookingData.guest_email || null,
      p_guest_phone: bookingData.guest_phone || null,
      p_pickup_location: bookingData.pickup_location || null,
      p_dropoff_location: bookingData.dropoff_location || null,
      p_pricing_base_amount:
        bookingData.pricing_base_amount !== undefined && bookingData.pricing_base_amount !== null
          ? Number(bookingData.pricing_base_amount)
          : null,
    })
  );

  if (result.error) throw result.error;

  if (!result.data?.success) {
    throw new Error(result.data?.error || 'Failed to create booking');
  }

  const bookingId: string = result.data.booking_id
  console.log('Booking created successfully (atomic):', bookingId)

  const requestedStatus = (bookingData as any).status ?? 'pending'
  let requestedPaymentStatus =
    (bookingData as any).payment_status ?? 'pending'
  const requestedPaymentReference =
    (bookingData as any).payment_reference || (bookingData as any).paymentReference

  if (requestedPaymentStatus === 'paid') {
    console.warn('createBooking: ignoring client payment_status=paid for booking', bookingId)
    requestedPaymentStatus = 'pending'
  }

  const needsPatch =
    bookingData.platform_fee != null ||
    requestedStatus !== 'pending' ||
    requestedPaymentStatus !== 'pending' ||
    Boolean(requestedPaymentReference)

  if (needsPatch) {
    const { data: patchResult, error: patchError } = await supabase.rpc(
      'patch_booking_after_create',
      {
        p_booking_id: bookingId,
        p_status: requestedStatus !== 'pending' ? requestedStatus : null,
        p_payment_status: requestedPaymentStatus !== 'pending' ? requestedPaymentStatus : null,
        p_payment_reference: requestedPaymentReference || null,
        p_platform_fee:
          bookingData.platform_fee != null ? Number(bookingData.platform_fee) : null,
      },
    )

    if (patchError) {
      console.warn('patch_booking_after_create failed:', patchError)
    } else if (!(patchResult as { success?: boolean })?.success) {
      console.warn(
        'patch_booking_after_create rejected:',
        (patchResult as { error?: string })?.error,
      )
    }
  }

  // Fetch complete booking with relations (used by callers and downstream logic)
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      services (
        id,
        title,
        vendors (
          id,
          business_name
        )
      ),
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('id', bookingId)
    .single()

  if (error || !data) {
    throw error || new Error('Failed to fetch created booking')
  }

  let finalBooking: any = data

  // Status/payment patches applied via patch_booking_after_create RPC above.

  // Settlement is server-only: marzpay-webhook → payment_fulfillment_jobs → process-payment-fulfillment-queue.

  // Only send confirmation emails after payment is actually paid (webhook/queue also sends on success).
  const shouldSendBookingEmails =
    (finalBooking.payment_status === 'paid' &&
      ['confirmed', 'completed'].includes(String(finalBooking.status || ''))) ||
    shouldSendReservationEmails(finalBooking)

  if (shouldSendBookingEmails) {
    sendBookingEmails(finalBooking.id).catch(error => {
      console.error('Failed to send booking emails:', error)
    })
  }

  return finalBooking as Booking
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      services (
        id,
        title,
        description,
        vendor_id,
        category_id,
        service_categories (
          name
        ),
        vendors (
          business_name
        )
      ),
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('id', bookingId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('Error fetching booking:', error)
    throw error
  }

  return data
}

export async function getBookingsByUser(userId: string): Promise<Booking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          id,
          title,
          description,
          price,
          currency,
          images,
          location,
          vendors (
            business_name,
            business_phone,
            business_email
          )
        )
      `)
      .or(`tourist_id.eq.${userId},and(is_guest_booking.eq.true,guest_email.eq.${await getUserEmail(userId)})`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getBookingsByUser:', error)
    throw error
  }
}

async function getUserEmail(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data?.email || ''
  } catch (error) {
    console.error('Error getting user email:', error)
    return ''
  }
}

export async function getBookingsForUser(userId: string): Promise<Booking[]> {
  return getBookingsByUser(userId)
}

export async function getBookingsByVendor(vendorId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      services (
        id,
        title,
        description
      ),
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vendor bookings:', error)
    throw error
  }

  return data || []
}

export async function getVendorBookings(vendorId: string): Promise<Booking[]> {
  return getBookingsByVendor(vendorId)
}

export async function getAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      services (
        id,
        title,
        description,
        vendor_id,
        category_id,
        service_categories (
          name
        ),
        vendors (
          business_name
        )
      ),
      profiles (
        id,
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    throw error
  }

  // Transform the data to match the expected Booking interface
  const transformedData = (data || []).map(booking => {
    // Create a new object without the services property to avoid conflicts
    const { services, profiles, ...rest } = booking;
    return {
      ...rest,
      service: services ? {
        id: services.id,
        title: services.title,
        description: services.description,
        vendor_id: services.vendor_id,
        category_id: services.category_id,
        service_categories: services.service_categories,
        vendors: services.vendors
      } : undefined,
      tourist_profile: profiles ? {
        id: profiles.id,
        full_name: profiles.full_name,
        email: profiles.email
      } : undefined
    };
  });

  return transformedData
}

export async function updateBooking(id: string, updates: Partial<Pick<Booking, 'status' | 'payment_status'>> & { rejection_reason?: string | null }): Promise<Booking> {
  try {
    console.log('DB: updateBooking called with id:', id, 'updates:', updates)

    // Direct update to bookings table instead of using non-existent RPC function
    const { data, error } = await supabase
      .from('bookings')
      .update({
        ...(updates.status && { status: updates.status }),
        ...(updates.payment_status && { payment_status: updates.payment_status }),
        ...(updates.rejection_reason !== undefined && { rejection_reason: updates.rejection_reason }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        services (
          id,
          title,
          vendors (
            id,
            business_name
          )
        ),
        profiles (
          id,
          full_name,
          email
        )
      `)
      .single()

    if (error) throw error;

    console.log('DB: Booking updated successfully. New status:', data.status, 'payment_status:', data.payment_status)

    // When booking is completed, generate a review token and send review request email
    if (data.status === 'completed') {
      try {
        const reviewToken = await generateReviewToken(id);
        if (reviewToken) {
          const serviceName = data.services?.title || 'the service';
          const vendorName = data.services?.vendors?.business_name || 'the provider';
          const result = await sendReviewRequestEmail(
            id,
            reviewToken.token,
            reviewToken.guest_email,
            reviewToken.guest_name,
            serviceName,
            vendorName
          );
          console.log('Review request generated for booking:', id, 'Review URL:', result.reviewUrl, 'Email sent:', result.sent);
        }
      } catch (reviewError) {
        console.error('Error generating review request (non-blocking):', reviewError);
        // Don't throw - this is non-critical
      }
    }

    return data
  } catch (error) {
    console.error('Error in updateBooking:', error)
    throw error
  }
}

export async function getFlaggedBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`*, services(id,title,vendors(id,business_name)), profiles(id,full_name,email)`)
    .or("rejection_reason.eq.payment_unverified,payment_status.eq.pending")
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching flagged bookings:', error)
    throw error
  }

  return data || []
}

export async function approveFlaggedBooking(bookingId: string): Promise<void> {
  try {
    await updateBooking(bookingId, {
      payment_status: 'paid',
      rejection_reason: null,
      status: 'confirmed',
    })

    const adminId = await getAdminProfileId()
    if (!adminId) {
      throw new Error('Admin profile not found — cannot settle approved booking')
    }

    const { data: backfillResult, error: backfillError } = await supabase.rpc(
      'backfill_wallet_credits_for_booking',
      { p_booking_id: bookingId, p_admin_id: adminId },
    )

    if (backfillError) throw backfillError
    if (!(backfillResult as { success?: boolean })?.success) {
      throw new Error(
        (backfillResult as { error?: string })?.error || 'Failed to settle approved booking',
      )
    }

    // Best-effort: notify backend/edge function for audit
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseAnonKey) {
        await fetch(`${supabaseUrl}/functions/v1/reconcile-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({ booking_id: bookingId, action: 'approve', timestamp: new Date().toISOString() })
        }).catch(() => {})
      }
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('approveFlaggedBooking error:', err)
    throw err
  }
}

export async function rejectFlaggedBooking(bookingId: string, reason: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: 'pending', rejection_reason: reason || 'rejected_by_admin', status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (error) throw error

    // Best-effort: notify backend/edge function for audit
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseAnonKey) {
        await fetch(`${supabaseUrl}/functions/v1/reconcile-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({ booking_id: bookingId, action: 'reject', reason, timestamp: new Date().toISOString() })
        }).catch(() => {})
      }
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('rejectFlaggedBooking error:', err)
    throw err
  }
}

export async function resolveFlaggedBooking(bookingId: string, notes?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ rejection_reason: notes || 'reviewed', updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (error) throw error

    // Best-effort audit call
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseAnonKey) {
        await fetch(`${supabaseUrl}/functions/v1/reconcile-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({ booking_id: bookingId, action: 'resolve', notes: notes || null, timestamp: new Date().toISOString() })
        }).catch(() => {})
      }
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('resolveFlaggedBooking error:', err)
    throw err
  }
}

export async function getActiveBookings(vendorId?: string): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      services (id, title, vendors (id, business_name)),
      profiles (id, full_name, email)
    `)
    .in('status', ['pending', 'confirmed'])
    .order('created_at', { ascending: false })

  if (vendorId) {
    query = query.eq('vendor_id', vendorId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching active bookings:', error)
    throw error
  }

  return data || []
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  return updateBooking(bookingId, { status: 'cancelled' })
}

/** Keeps payment_status pending so the customer can retry after a failed MarzPay attempt. */
export async function cancelBookingOnPaymentFailure(bookingId: string): Promise<Booking> {
  return updateBooking(bookingId, { status: 'cancelled', payment_status: 'pending' })
}

/** Only cancels when still pending (safe before payment completes). */
export async function cancelPendingBooking(bookingId: string): Promise<void> {
  const { data, error } = await supabase.rpc('cancel_pending_booking_atomic', {
    p_booking_id: bookingId,
  })

  if (error) throw error
  if (!(data as { success?: boolean })?.success) {
    throw new Error((data as { error?: string })?.error || 'Failed to cancel booking')
  }
}
