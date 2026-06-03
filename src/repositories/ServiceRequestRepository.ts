import { supabase } from '../lib/supabaseClient'
import type { ServiceDeleteRequest } from '../types'
import { getAdminProfileId } from './PartnerRepository'
import { sendMessage } from './MessageRepository'
import { getServiceById } from './ServiceRepository'
import { updateService } from './ServiceRepository'

// Re-export the type alias used in database.ts
export type ServiceDeleteRequestStatus = 'pending' | 'approved' | 'rejected'

export async function createServiceDeleteRequest(serviceId: string, vendorId: string, reason: string): Promise<ServiceDeleteRequest> {
  try {
    const { data, error } = await supabase
      .from('service_delete_requests')
      .insert([{
        service_id: serviceId,
        vendor_id: vendorId,
        reason: reason
      }])
      .select(`
        *,
        service:services(*, service_categories(*)),
        vendor:vendors(*)
      `)
      .single()

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message?.includes('relation "service_delete_requests" does not exist')) {
        throw new Error('Delete request functionality is not available yet. Please run the database migration first.')
      }
      console.error('Error creating service delete request:', error)
      throw error
    }

    return data
  } catch (err) {
    // If it's our custom error message, re-throw it
    if (err instanceof Error && err.message.includes('Delete request functionality is not available yet')) {
      throw err
    }
    // Otherwise, provide a generic error
    console.error('Error creating service delete request:', err)
    throw new Error('Failed to create delete request. The database table may not exist yet.')
  }
}

export async function getServiceDeleteRequests(vendorId?: string): Promise<ServiceDeleteRequest[]> {
  try {
    console.log('getServiceDeleteRequests: Called with vendorId:', vendorId);

    let query = supabase
      .from('service_delete_requests')
      .select(`
        *,
        service:services(id, title, description, category_id, service_categories(name, icon)),
        vendor:vendors(id, business_name, user_id)
      `)
      .order('requested_at', { ascending: false })

    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }

    console.log('getServiceDeleteRequests: Executing query...');
    const { data, error } = await query

    if (error) {
      console.error('getServiceDeleteRequests: Query error:', error);
      console.error('getServiceDeleteRequests: Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // Check if the error is because the table doesn't exist
      if (error.message?.includes('relation "service_delete_requests" does not exist')) {
        console.warn('service_delete_requests table does not exist yet. Returning empty array.')
        return []
      }

      // Check if it's an RLS policy error
      if (error.message?.includes('policy') || error.message?.includes('permission denied') || error.code === 'PGRST116') {
        console.warn('RLS policy blocking access. Returning empty array.')
        return []
      }

      console.error('Error fetching service delete requests:', error)
      // Instead of throwing, return empty array for now
      console.warn('Returning empty array due to error, but continuing execution')
      return []
    }

    console.log('getServiceDeleteRequests: Query successful, returned', data?.length || 0, 'records');
    console.log('getServiceDeleteRequests: Sample data:', data?.[0]);
    return data || []
  } catch (err) {
    console.error('getServiceDeleteRequests: Exception:', err);
    console.error('getServiceDeleteRequests: Exception details:', err);

    // If it's our custom error message, return empty array
    if (err instanceof Error && (err.message.includes('table does not exist') || err.message.includes('RLS policy'))) {
      return []
    }
    console.error('Error fetching service delete requests:', err)
    throw err
  }
}

export async function updateServiceDeleteRequestStatus(
  requestId: string,
  status: ServiceDeleteRequestStatus,
  adminNotes?: string
): Promise<ServiceDeleteRequest> {
  const { data, error } = await supabase
    .from('service_delete_requests')
    .update({
      status: status,
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: (await supabase.auth.getUser()).data.user?.id
    })
    .eq('id', requestId)
    .select(`
      *,
      service:services(*, service_categories(*)),
      vendor:vendors(*)
    `)
    .single()

  if (error) {
    console.error('Error updating service delete request status:', error)
    throw error
  }

  return data
}

export async function deleteServiceDeleteRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('service_delete_requests')
    .delete()
    .eq('id', requestId)

  if (error) {
    console.error('Error deleting service delete request:', error)
    throw error
  }
}

export async function createActivationRequest(serviceId: string, vendorId: string, requesterId?: string) {
  try {
    const { data, error } = await supabase
      .from('activation_requests')
      .insert([{ service_id: serviceId, vendor_id: vendorId, requester_id: requesterId }])
      .select(`*, service:services(*), vendor:vendors(*)`)
      .single()

    if (error) {
      if (error.message?.includes('relation "activation_requests" does not exist')) {
        throw new Error('Activation request functionality is not available yet. Please run the database migration first.')
      }
      console.error('Error creating activation request:', error)
      throw error
    }

    // Notify admin about the activation request using messages
    const adminId = await getAdminProfileId()
    if (adminId) {
      // Try to find vendor user/profile id
      let vendorProfileId: string | null = null
      try {
        const { data: vendorRecord } = await supabase.from('vendors').select('user_id').eq('id', vendorId).single()
        vendorProfileId = vendorRecord?.user_id || null
      } catch (e) {
        console.warn('Could not fetch vendor record for activation notification', e)
      }

      const subject = `Activation request for service ${data?.service?.title || serviceId}`
      const message = `Vendor ${data?.vendor?.business_name || vendorId} has requested activation for service ${data?.service?.title || serviceId}. Service ID: ${serviceId}`

      if (vendorProfileId) {
        // sendMessage expects sender_id, recipient_id to be profile ids. Use vendor as sender to admin.
        await sendMessage({ sender_id: vendorProfileId, sender_role: 'vendor', recipient_id: adminId, recipient_role: 'admin', subject, message })
      } else {
        // fallback: send system message
        await sendMessage({ sender_id: adminId, sender_role: 'admin', recipient_id: adminId, recipient_role: 'admin', subject, message })
      }
    }

    return data
  } catch (err) {
    if (err instanceof Error && err.message.includes('Activation request functionality is not available yet')) throw err
    console.error('Error creating activation request:', err)
    throw new Error('Failed to create activation request')
  }
}

export async function getActivationRequests(vendorId?: string) {
  try {
    let query = supabase.from('activation_requests').select(`*, service:services(*), vendor:vendors(*)`).order('requested_at', { ascending: false })
    if (vendorId) query = query.eq('vendor_id', vendorId)
    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching activation requests:', err)
    throw err
  }
}

export async function updateActivationRequestStatus(requestId: string, status: 'pending' | 'approved' | 'rejected', adminId?: string, adminNotes?: string) {
  try {
    const updates: any = { status }
    if (adminId) updates.admin_id = adminId
    if (adminNotes) updates.admin_notes = adminNotes
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase.from('activation_requests').update(updates).eq('id', requestId).select(`*, service:services(*), vendor:vendors(*)`).single()
    if (error) throw error

    // If approved, enable scan_enabled on the service
    if (status === 'approved' && data?.service?.id) {
      await updateService(data.service.id, undefined, { scan_enabled: true } as any)
    }

    return data
  } catch (err) {
    console.error('Error updating activation request status:', err)
    throw err
  }
}

// Event OTP functions
export async function createEventOTP(serviceId: string, ttlMinutes = 30) {
  try {
    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()

    const { data, error } = await supabase.from('event_otps').insert([{ service_id: serviceId, otp, expires_at: expiresAt }]).select().single()
    if (error) throw error

    // Notify admin and event organizer via email and SMS
    const service = await getServiceById(serviceId)
    const adminId = await getAdminProfileId()
    let vendorProfileId: string | null = null
    try {
      const { data: vendorRecord } = await supabase.from('vendors').select('user_id').eq('id', service?.vendor_id).single()
      vendorProfileId = vendorRecord?.user_id || null
    } catch (e) {
      console.warn('Could not fetch vendor profile for OTP notification', e)
    }

    // Get admin and vendor contact information
    let adminEmail: string | null = null
    let adminPhone: string | null = null
    let vendorEmail: string | null = null
    let vendorPhone: string | null = null

    if (adminId) {
      try {
        const { data: adminProfile } = await supabase.from('profiles').select('email, phone').eq('id', adminId).single()
        adminEmail = adminProfile?.email || null
        adminPhone = adminProfile?.phone || null
      } catch (e) {
        console.warn('Could not fetch admin profile for OTP notification', e)
      }
    }

    if (vendorProfileId) {
      try {
        const { data: vendorProfile } = await supabase.from('profiles').select('email, phone').eq('id', vendorProfileId).single()
        vendorEmail = vendorProfile?.email || null
        vendorPhone = vendorProfile?.phone || null
      } catch (e) {
        console.warn('Could not fetch vendor profile for OTP notification', e)
      }
    }

    const subject = `OTP for event access: ${service?.title || serviceId}`
    const message = `An OTP was issued for access to event ${service?.title || serviceId}: ${otp}. It expires at ${expiresAt}.`

    // Send email notifications
    if (adminEmail) {
      await sendOTPNotification({
        to: adminEmail,
        subject,
        message: `Admin notification: ${message}`,
        type: 'email'
      })
    }

    if (vendorEmail) {
      await sendOTPNotification({
        to: vendorEmail,
        subject,
        message: `Vendor notification: ${message}`,
        type: 'email'
      })
    }

    // Send SMS notifications
    if (adminPhone) {
      await sendOTPNotification({
        to: adminPhone,
        message: `Admin notification: ${message}`,
        type: 'sms'
      })
    }

    if (vendorPhone) {
      await sendOTPNotification({
        to: vendorPhone,
        message: `Vendor notification: ${message}`,
        type: 'sms'
      })
    }

    // Also send internal messages as backup
    if (adminId) {
      // Send to admin from vendor if vendorProfileId else from admin
      if (vendorProfileId) await sendMessage({ sender_id: vendorProfileId, sender_role: 'vendor', recipient_id: adminId, recipient_role: 'admin', subject, message })
      else await sendMessage({ sender_id: adminId, sender_role: 'admin', recipient_id: adminId, recipient_role: 'admin', subject, message })
    }

    if (vendorProfileId) {
      await sendMessage({ sender_id: adminId || vendorProfileId, sender_role: adminId ? 'admin' : 'vendor', recipient_id: vendorProfileId, recipient_role: 'vendor', subject, message })
    }

    return data
  } catch (err) {
    console.error('Error creating event OTP:', err)
    throw err
  }
}

export async function verifyEventOTP(serviceId: string, otp: string) {
  try {
    const { data: rows, error } = await supabase.from('event_otps').select('*').eq('service_id', serviceId).eq('otp', otp).eq('used', false)
    if (error) throw error
    const found = (rows || []).find((r: any) => new Date(r.expires_at) > new Date())
    if (!found) return { valid: false }

    // mark used
    await supabase.from('event_otps').update({ used: true }).eq('id', found.id)
    return { valid: true }
  } catch (err) {
    console.error('Error verifying event OTP:', err)
    throw err
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-password', {
      body: { password }
    })

    if (error) {
      console.error('Error verifying password:', error)
      return false
    }

    return data?.valid === true
  } catch (err) {
    console.error('Error verifying password:', err)
    return false
  }
}

export async function sendOTPNotification(notificationData: {
  to: string
  subject?: string
  message: string
  type: 'email' | 'sms'
}) {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp-notification', {
      body: notificationData
    })

    if (error) {
      console.warn(`Error sending ${notificationData.type} notification:`, error)
      // Don't throw error for notifications - they're supplementary
      return { sent: false, error }
    }

    return { sent: true, data }
  } catch (err) {
    console.warn(`Exception sending ${notificationData.type} notification:`, err)
    // Don't throw error for notifications - they're supplementary
    return { sent: false, error: err }
  }
}
