import { supabase } from '../lib/supabaseClient'

// Re-export types from database.ts for use by consumers
export type InquiryType = 'contact' | 'service' | 'safari' | 'partnership'
export type InquiryStatus = 'unread' | 'read' | 'in_progress' | 'responded' | 'archived' | 'converted'
export type InquiryPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Inquiry {
  id: string
  service_id: string
  vendor_id: string
  name: string
  email: string
  phone?: string
  preferred_date?: string
  number_of_guests: number
  message?: string
  contact_method: 'email' | 'phone'
  category_specific_data: Record<string, any>
  status: 'unread' | 'read' | 'responded' | 'archived'
  responded_at?: string
  response_message?: string
  created_at: string
  updated_at: string
  services?: {
    id: string
    title: string
    service_categories?: {
      name: string
    }
  }
  vendors?: any
}

export interface ContactInquiry {
  id: string
  name: string
  email: string
  subject: string
  message: string
  category: 'general' | 'booking' | 'technical' | 'partnership' | 'complaint' | 'other'
  status: 'unread' | 'read' | 'responded' | 'archived'
  response_message?: string
  responded_at?: string
  responded_by?: string
  created_at: string
  updated_at: string
}

export interface UnifiedInquiry {
  id: string
  inquiry_type: InquiryType
  name: string
  email: string
  phone?: string
  subject?: string
  message?: string
  category?: 'general' | 'booking' | 'technical' | 'partnership' | 'complaint' | 'other'
  service_id?: string
  vendor_id?: string
  preferred_date?: string
  number_of_guests?: number
  contact_method?: 'email' | 'phone' | 'whatsapp'
  service_specific_data?: Record<string, any>
  safari_data?: Record<string, any>
  company_name?: string
  website?: string
  status: InquiryStatus
  priority: InquiryPriority
  response_message?: string
  responded_at?: string
  responded_by?: string
  responder_name?: string
  admin_email_sent: boolean
  vendor_email_sent: boolean
  user_confirmation_sent: boolean
  source: string
  created_at: string
  updated_at: string
  service_title?: string
  service_name?: string
  vendor_name?: string
  vendor_email?: string
  services?: {
    id: string
    title: string
    service_categories?: {
      name: string
    }
  }
  vendors?: {
    id: string
    business_name: string
    business_email?: string
  }
}

export async function createInquiry(inquiryData: {
  service_id: string
  name: string
  email: string
  phone?: string
  preferred_date?: string
  number_of_guests: number
  message?: string
  contact_method: 'email' | 'phone'
  category_specific_data?: Record<string, any>
}): Promise<Inquiry> {
  try {
    // Get the vendor_id from the service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('vendor_id')
      .eq('id', inquiryData.service_id)
      .single()

    if (serviceError || !service) {
      throw new Error('Service not found')
    }

    const { data, error } = await supabase
      .from('inquiries')
      .insert([{
        service_id: inquiryData.service_id,
        vendor_id: service.vendor_id,
        name: inquiryData.name,
        email: inquiryData.email,
        phone: inquiryData.phone,
        preferred_date: inquiryData.preferred_date,
        number_of_guests: inquiryData.number_of_guests,
        message: inquiryData.message,
        contact_method: inquiryData.contact_method,
        category_specific_data: inquiryData.category_specific_data || {}
      }])
      .select(`
        *,
        services (
          id,
          title,
          service_categories (
            name
          )
        ),
        vendors (
          id,
          business_name,
          business_email
        )
      `)
      .single()

    if (error) {
      console.error('Error creating inquiry:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in createInquiry:', error)
    throw error
  }
}

export async function getVendorInquiries(vendorId: string): Promise<Inquiry[]> {
  try {
    // First try to get vendor record from user_id
    let actualVendorId = vendorId

    // Check if vendorId is a user_id and get the actual vendor.id
    const { data: vendorRecord } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', vendorId)
      .single()

    if (vendorRecord) {
      actualVendorId = vendorRecord.id
    }

    // Query from service_inquiries table (new separate tables system)
    const { data, error } = await supabase
      .from('service_inquiries')
      .select(`
        *,
        services (
          id,
          title,
          service_categories (
            name
          )
        )
      `)
      .eq('vendor_id', actualVendorId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching vendor inquiries:', error)
      throw error
    }

    // Transform to match Inquiry interface
    return (data || []).map(inquiry => ({
      ...inquiry,
      inquiry_type: 'service' as const,
      subject: inquiry.services?.title || 'Service Inquiry'
    }))
  } catch (error) {
    console.error('Error in getVendorInquiries:', error)
    throw error
  }
}

export async function updateInquiryStatus(inquiryId: string, status: 'unread' | 'read' | 'responded' | 'archived', responseMessage?: string, respondedBy?: string): Promise<Inquiry> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'responded') {
      updateData.responded_at = new Date().toISOString()
      if (responseMessage) {
        updateData.response_message = responseMessage
      }
      if (respondedBy) {
        updateData.responded_by = respondedBy
      }
    }

    // Use service_inquiries table (new separate tables system)
    const { data, error } = await supabase
      .from('service_inquiries')
      .update(updateData)
      .eq('id', inquiryId)
      .select(`
        *,
        services (
          id,
          title,
          service_categories (
            name
          )
        ),
        vendors (
          id,
          business_name,
          business_email
        )
      `)
      .single()

    if (error) {
      console.error('Error updating inquiry status:', error)
      throw error
    }

    return { ...data, inquiry_type: 'service' as const }
  } catch (error) {
    console.error('Error in updateInquiryStatus:', error)
    throw error
  }
}

export async function getInquiryCount(vendorId: string): Promise<number> {
  try {
    // Get the actual vendor.id from user_id if needed
    let actualVendorId = vendorId

    const { data: vendorRecord } = await supabase
      .from('vendors')
      .select('id')
      .eq('user_id', vendorId)
      .single()

    if (vendorRecord) {
      actualVendorId = vendorRecord.id
    }

    // Query from service_inquiries table (new separate tables system)
    const { count, error } = await supabase
      .from('service_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', actualVendorId)

    if (error) {
      console.error('Error counting inquiries:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getInquiryCount:', error)
    throw error
  }
}

// ============================================
// Contact Inquiries (General Support from Contact Page)
// ============================================

export async function createContactInquiry(inquiryData: {
  name: string
  email: string
  subject: string
  message: string
  category: 'general' | 'booking' | 'technical' | 'partnership' | 'complaint' | 'other'
}): Promise<ContactInquiry> {
  try {
    const { data, error } = await supabase
      .from('contact_inquiries')
      .insert([{
        name: inquiryData.name,
        email: inquiryData.email,
        subject: inquiryData.subject,
        message: inquiryData.message,
        category: inquiryData.category,
        status: 'unread'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating contact inquiry:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in createContactInquiry:', error)
    throw error
  }
}

export async function getContactInquiries(): Promise<ContactInquiry[]> {
  try {
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contact inquiries:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getContactInquiries:', error)
    throw error
  }
}

export async function updateContactInquiryStatus(
  inquiryId: string,
  status: 'unread' | 'read' | 'responded' | 'archived',
  responseMessage?: string,
  respondedBy?: string
): Promise<ContactInquiry> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'responded' && responseMessage) {
      updateData.responded_at = new Date().toISOString()
      updateData.response_message = responseMessage
      if (respondedBy) {
        updateData.responded_by = respondedBy
      }
    }

    const { data, error } = await supabase
      .from('contact_inquiries')
      .update(updateData)
      .eq('id', inquiryId)
      .select()
      .single()

    if (error) {
      console.error('Error updating contact inquiry status:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateContactInquiryStatus:', error)
    throw error
  }
}

export async function getContactInquiryCount(): Promise<{ total: number; unread: number }> {
  try {
    const { count: total, error: totalError } = await supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact', head: true })

    const { count: unread, error: unreadError } = await supabase
      .from('contact_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'unread')

    if (totalError || unreadError) {
      throw totalError || unreadError
    }

    return { total: total || 0, unread: unread || 0 }
  } catch (error) {
    console.error('Error in getContactInquiryCount:', error)
    return { total: 0, unread: 0 }
  }
}

// ============================================
// Unified Inquiry Functions (Separate Tables System)
// ============================================

/**
 * Create an inquiry - routes to the appropriate table based on type
 * Triggers email notifications to admin (and vendor for service inquiries)
 */
export async function createUnifiedInquiry(data: {
  inquiry_type: InquiryType
  name: string
  email: string
  phone?: string
  subject?: string
  message?: string
  category?: 'general' | 'booking' | 'technical' | 'partnership' | 'complaint' | 'other'
  service_id?: string
  vendor_id?: string
  preferred_date?: string
  number_of_guests?: number
  contact_method?: 'email' | 'phone' | 'whatsapp'
  service_specific_data?: Record<string, any>
  safari_data?: Record<string, any>
  priority?: InquiryPriority
  source?: string
}): Promise<UnifiedInquiry> {
  try {
    let inquiry: any = null

    switch (data.inquiry_type) {
      case 'contact': {
        const insertData = {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          subject: data.subject || 'General Inquiry',
          message: data.message || '',
          category: data.category || 'general',
          priority: data.priority || 'normal',
          source: data.source || 'website',
          status: 'unread'
        }
        const { error } = await supabase
          .from('contact_inquiries')
          .insert([insertData])

        if (error) throw error
        // Return constructed object (anon users can't SELECT back)
        inquiry = {
          ...insertData,
          id: crypto.randomUUID(), // Temporary ID for client use
          inquiry_type: 'contact',
          created_at: new Date().toISOString()
        }
        break
      }

      case 'service': {
        // Fetch vendor_id if only service_id is provided
        let vendorId = data.vendor_id
        if (data.service_id && !vendorId) {
          const { data: service } = await supabase
            .from('services')
            .select('vendor_id')
            .eq('id', data.service_id)
            .single()
          if (service) vendorId = service.vendor_id
        }

        const serviceInsertData = {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          service_id: data.service_id,
          vendor_id: vendorId || null,
          message: data.message || null,
          preferred_date: data.preferred_date || null,
          number_of_guests: data.number_of_guests || 1,
          contact_method: data.contact_method || 'email',
          service_specific_data: data.service_specific_data || {},
          priority: data.priority || 'normal',
          source: data.source || 'website',
          status: 'unread'
        }
        const { error } = await supabase
          .from('service_inquiries')
          .insert([serviceInsertData])

        if (error) throw error
        // Return constructed object (anon users can't SELECT back)
        inquiry = {
          ...serviceInsertData,
          id: crypto.randomUUID(),
          inquiry_type: 'service',
          subject: 'Service Inquiry',
          created_at: new Date().toISOString()
        }
        break
      }

      case 'safari': {
        const safariData = data.safari_data || {}
        const safariInsertData = {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          country: safariData.country || null,
          countries: safariData.countries || [],
          activities: safariData.activities || [],
          travel_with: safariData.travelWith || null,
          days: safariData.days || null,
          budget: safariData.budget || null,
          start_date: safariData.startDate || data.preferred_date || null,
          adults: safariData.adults || 1,
          children: safariData.children || 0,
          rooms: safariData.rooms || 1,
          extra_info: data.message || safariData.extraInfo || null,
          priority: data.priority || 'normal',
          source: data.source || 'website',
          status: 'unread'
        }
        const { error } = await supabase
          .from('safari_inquiries')
          .insert([safariInsertData])

        if (error) throw error
        // Return constructed object (anon users can't SELECT back)
        inquiry = {
          ...safariInsertData,
          id: crypto.randomUUID(),
          inquiry_type: 'safari',
          subject: `Safari: ${(safariData.countries || []).join(', ') || 'Custom Request'}`,
          safari_data: safariData,
          created_at: new Date().toISOString()
        }
        break
      }

      case 'partnership': {
        const partnershipInsertData = {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          subject: data.subject || null,
          message: data.message || '',
          partnership_type: data.category || 'other',
          priority: data.priority || 'normal',
          source: data.source || 'website',
          status: 'unread'
        }
        const { error } = await supabase
          .from('partnership_inquiries')
          .insert([partnershipInsertData])

        if (error) throw error
        // Return constructed object (anon users can't SELECT back)
        inquiry = {
          ...partnershipInsertData,
          id: crypto.randomUUID(),
          inquiry_type: 'partnership',
          created_at: new Date().toISOString()
        }
        break
      }

      default:
        throw new Error(`Unknown inquiry type: ${data.inquiry_type}`)
    }

    // Send notification emails asynchronously
    // Admin always gets notified; vendor only for service inquiries
    if (inquiry?.id) {
      sendInquiryNotificationEmails(inquiry.id, {
        sendAdmin: true,
        sendVendor: data.inquiry_type === 'service',
        sendUser: true
      }).catch(err => {
        console.error('Failed to send inquiry notification emails:', err)
      })
    }

    return inquiry
  } catch (error) {
    console.error('Error in createUnifiedInquiry:', error)
    throw error
  }
}

/**
 * Get all inquiries using the unified view (for admin dashboard)
 */
export async function getUnifiedInquiries(filters?: {
  inquiry_type?: InquiryType
  status?: InquiryStatus
  vendor_id?: string
  priority?: InquiryPriority
}): Promise<UnifiedInquiry[]> {
  try {
    // Use the all_inquiries view for unified access
    let query = supabase
      .from('all_inquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.inquiry_type) {
      query = query.eq('inquiry_type', filters.inquiry_type)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.vendor_id) {
      query = query.eq('vendor_id', filters.vendor_id)
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching unified inquiries:', error)
      throw error
    }

    // Fetch responder names for inquiries that have responded_by
    const inquiriesWithResponders = data || []
    const responderIds = [...new Set(inquiriesWithResponders
      .filter(i => i.responded_by)
      .map(i => i.responded_by))]

    if (responderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', responderIds)

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || p.email || 'Unknown']) || [])

      return inquiriesWithResponders.map(inquiry => ({
        ...inquiry,
        responder_name: inquiry.responded_by ? profileMap.get(inquiry.responded_by) || 'Unknown' : undefined
      }))
    }

    return inquiriesWithResponders
  } catch (error) {
    console.error('Error in getUnifiedInquiries:', error)
    throw error
  }
}

/**
 * Update a unified inquiry's status - routes to correct table based on inquiry_type
 */
export async function updateUnifiedInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
  responseMessage?: string,
  respondedBy?: string,
  inquiryType?: InquiryType
): Promise<UnifiedInquiry> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'responded' && responseMessage) {
      updateData.responded_at = new Date().toISOString()
      updateData.response_message = responseMessage
      if (respondedBy) {
        updateData.responded_by = respondedBy
      }
    }

    // If inquiry_type not provided, look it up from the view
    let type = inquiryType
    if (!type) {
      const { data: existing } = await supabase
        .from('all_inquiries')
        .select('inquiry_type')
        .eq('id', inquiryId)
        .single()
      type = existing?.inquiry_type as InquiryType
    }

    // Get the correct table name
    const tableMap: Record<InquiryType, string> = {
      contact: 'contact_inquiries',
      service: 'service_inquiries',
      safari: 'safari_inquiries',
      partnership: 'partner_requests' // Note: partner_requests is the actual table used
    }

    const tableName = type ? tableMap[type] : null
    if (!tableName) {
      throw new Error(`Could not determine table for inquiry ${inquiryId}`)
    }

    const { data, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', inquiryId)
      .select()
      .single()

    if (error) {
      console.error('Error updating inquiry status:', error)
      throw error
    }

    return { ...data, inquiry_type: type }
  } catch (error) {
    console.error('Error in updateUnifiedInquiryStatus:', error)
    throw error
  }
}

/**
 * Get unified inquiry counts by type (using the all_inquiries view)
 */
export async function getUnifiedInquiryCounts(): Promise<{
  total: number
  unread: number
  byType: Record<InquiryType, { total: number; unread: number }>
}> {
  try {
    const { data, error } = await supabase
      .from('all_inquiries')
      .select('inquiry_type, status')

    if (error) {
      throw error
    }

    const counts = {
      total: data?.length || 0,
      unread: data?.filter(i => i.status === 'unread').length || 0,
      byType: {
        contact: { total: 0, unread: 0 },
        service: { total: 0, unread: 0 },
        safari: { total: 0, unread: 0 },
        partnership: { total: 0, unread: 0 }
      } as Record<InquiryType, { total: number; unread: number }>
    }

    data?.forEach(item => {
      const type = item.inquiry_type as InquiryType
      if (counts.byType[type]) {
        counts.byType[type].total++
        if (item.status === 'unread') {
          counts.byType[type].unread++
        }
      }
    })

    return counts
  } catch (error) {
    console.error('Error in getUnifiedInquiryCounts:', error)
    return {
      total: 0,
      unread: 0,
      byType: {
        contact: { total: 0, unread: 0 },
        service: { total: 0, unread: 0 },
        safari: { total: 0, unread: 0 },
        partnership: { total: 0, unread: 0 }
      }
    }
  }
}

/**
 * Mark email notification as sent - routes to correct table
 */
export async function markInquiryEmailSent(
  inquiryId: string,
  emailType: 'admin' | 'vendor' | 'user',
  inquiryType?: InquiryType
): Promise<void> {
  try {
    const updateField = emailType === 'admin'
      ? 'admin_email_sent'
      : emailType === 'vendor'
        ? 'vendor_email_sent'
        : 'user_confirmation_sent'

    // If inquiry_type not provided, look it up from the view
    let type = inquiryType
    if (!type) {
      const { data: existing } = await supabase
        .from('all_inquiries')
        .select('inquiry_type')
        .eq('id', inquiryId)
        .single()
      type = existing?.inquiry_type as InquiryType
    }

    const tableMap: Record<InquiryType, string> = {
      contact: 'contact_inquiries',
      service: 'service_inquiries',
      safari: 'safari_inquiries',
      partnership: 'partnership_inquiries'
    }

    const tableName = type ? tableMap[type] : null
    if (!tableName) return

    await supabase
      .from(tableName)
      .update({ [updateField]: true })
      .eq('id', inquiryId)
  } catch (error) {
    console.error('Error marking email sent:', error)
  }
}

/**
 * Send inquiry notification emails via Edge Function
 * Sends emails to admin, vendor (if service inquiry), and user confirmation
 */
export async function sendInquiryNotificationEmails(
  inquiryId: string,
  options?: {
    sendAdmin?: boolean
    sendVendor?: boolean
    sendUser?: boolean
  }
): Promise<{ success: boolean; results?: Record<string, boolean>; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-inquiry-emails', {
      body: {
        inquiry_id: inquiryId,
        send_admin: options?.sendAdmin ?? true,
        send_vendor: options?.sendVendor ?? true,
        send_user: options?.sendUser ?? true
      }
    })

    if (error) {
      console.error('Error calling send-inquiry-emails function:', error)
      return { success: false, error: error.message }
    }

    return { success: true, results: data?.results }
  } catch (error) {
    console.error('Error in sendInquiryNotificationEmails:', error)
    return { success: false, error: String(error) }
  }
}
