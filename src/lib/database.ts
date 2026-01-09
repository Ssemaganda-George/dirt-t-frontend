// Database types
export type UserRole = 'tourist' | 'vendor' | 'admin'
export type UserStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'suspended'
export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ServiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type TransactionType = 'payment' | 'withdrawal' | 'refund'
export type TransactionStatus = 'pending' | 'completed' | 'failed'
export type ServiceDeleteRequestStatus = 'pending' | 'approved' | 'rejected'

import type { Flight } from '../types'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role: UserRole
  status?: UserStatus
  created_at: string
  updated_at: string
}

export interface Tourist {
  id: string
  user_id: string
  first_name?: string
  last_name?: string
  phone?: string
  emergency_contact?: string
  emergency_phone?: string
  travel_preferences?: string
  dietary_restrictions?: string
  medical_conditions?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface Vendor {
  id: string
  user_id: string
  business_name: string
  business_description?: string
  business_address?: string
  business_phone?: string
  business_email?: string
  business_website?: string
  business_type?: string
  operating_hours?: string
  years_in_business?: string
  business_license?: string
  tax_id?: string
  status: VendorStatus
  approved_at?: string
  approved_by?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export interface ServiceCategory {
  id: string
  name: string
  description?: string
  icon?: string
  created_at: string
}

export interface Service {
  id: string
  vendor_id: string
  category_id: string
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  location?: string
  duration_hours?: number
  max_capacity?: number
  amenities: string[]
  status: ServiceStatus
  approved_at?: string
  approved_by?: string
  created_at: string
  updated_at: string

  // Enhanced general fields
  duration_days?: number
  group_size_min?: number
  group_size_max?: number
  best_time_to_visit?: string
  what_to_bring?: string[]
  age_restrictions?: string
  health_requirements?: string
  accessibility_features?: string[]
  sustainability_certified?: boolean
  eco_friendly?: boolean

  // Hotel-specific fields
  room_types?: string[]
  check_in_time?: string
  check_out_time?: string
  star_rating?: number
  facilities?: string[]
  total_rooms?: number
  room_amenities?: string[]
  nearby_attractions?: string[]
  parking_available?: boolean
  pet_friendly?: boolean
  breakfast_included?: boolean

  // Tour-specific fields
  itinerary?: string[]
  included_items?: string[]
  excluded_items?: string[]
  difficulty_level?: 'easy' | 'moderate' | 'challenging' | 'difficult'
  minimum_age?: number
  languages_offered?: string[]
  tour_highlights?: string[]
  meeting_point?: string
  end_point?: string
  transportation_included?: boolean
  meals_included?: string[]
  guide_included?: boolean

  // Transport-specific fields
  vehicle_type?: string
  vehicle_capacity?: number
  pickup_locations?: string[]
  dropoff_locations?: string[]
  route_description?: string
  driver_included?: boolean
  air_conditioning?: boolean
  gps_tracking?: boolean
  fuel_included?: boolean
  tolls_included?: boolean
  insurance_included?: boolean

  // Restaurant-specific fields
  cuisine_type?: string
  opening_hours?: { [key: string]: string }
  menu_items?: string[]
  dietary_options?: string[]
  average_cost_per_person?: number
  reservations_required?: boolean
  outdoor_seating?: boolean
  live_music?: boolean
  private_dining?: boolean
  alcohol_served?: boolean

  // Guide-specific fields
  languages_spoken?: string[]
  specialties?: string[]
  certifications?: string[]
  years_experience?: number
  service_area?: string
  license_number?: string
  emergency_contact?: string
  first_aid_certified?: boolean
  vehicle_owned?: boolean

  // Activity-specific fields
  activity_type?: string
  skill_level_required?: string
  equipment_provided?: string[]
  safety_briefing_required?: boolean
  weather_dependent?: boolean
  seasonal_availability?: string

  // Rental-specific fields
  rental_items?: string[]
  rental_duration?: string
  deposit_required?: number
  insurance_required?: boolean
  delivery_available?: boolean
  maintenance_included?: boolean

  // Event-specific fields
  event_type?: string
  event_date?: string
  event_duration_hours?: number
  max_participants?: number
  materials_included?: string[]
  prerequisites?: string

  // Agency-specific fields
  services_offered?: string[]
  destinations_covered?: string[]
  booking_fee?: number
  customization_available?: boolean
  emergency_support?: boolean

  // Flight-specific fields
  flight_number?: string
  airline?: string
  departure_airport?: string
  arrival_airport?: string
  departure_city?: string
  arrival_city?: string
  departure_time?: string
  arrival_time?: string
  duration_minutes?: number
  aircraft_type?: string
  business_price?: number
  first_class_price?: number
  total_seats?: number
  available_seats?: number
  flight_class?: 'economy' | 'business' | 'first_class'
  baggage_allowance?: string

  // Enhanced contact and booking info
  tags?: string[]
  contact_info?: { phone?: string; email?: string; website?: string }
  booking_requirements?: string
  cancellation_policy?: string
  website_url?: string
  social_media?: { [key: string]: string }
  emergency_phone?: string
  booking_deadline_hours?: number
  payment_methods?: string[]
  refund_policy?: string

  vendors?: Vendor
  service_categories?: ServiceCategory
}

export interface ServiceDeleteRequest {
  id: string
  service_id: string
  vendor_id: string
  reason: string
  status: ServiceDeleteRequestStatus
  admin_notes?: string
  requested_at: string
  reviewed_at?: string
  reviewed_by?: string
  created_at: string
  updated_at: string

  // Relations
  service?: Service
  vendor?: Vendor
  reviewer?: Profile
}

export interface Booking {
  id: string
  service_id: string
  tourist_id: string
  vendor_id: string
  booking_date: string
  booking_time?: string
  guests: number
  total_amount: number
  currency: string
  status: BookingStatus
  special_requests?: string
  payment_reference?: string
  created_at: string
  updated_at: string
  services?: Service
  profiles?: Profile
}

export interface Wallet {
  id: string
  vendor_id: string
  balance: number
  currency: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  wallet_id: string
  booking_id?: string
  type: TransactionType
  amount: number
  currency: string
  status: TransactionStatus
  reference?: string
  description?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Database functions
import { supabase } from './supabaseClient'

// Service CRUD operations
export async function getServices(vendorId?: string) {
  let query = supabase
    .from('services')
    .select(`
      *,
      vendors (
        id,
        business_name,
        business_description,
        business_email,
        status
      ),
      service_categories (
        id,
        name,
        icon
      )
    `)

  if (vendorId) {
    query = query.eq('vendor_id', vendorId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching services:', error)
    throw error
  }

  return data || []
}

export async function getServiceById(serviceId: string) {
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      vendors (
        id,
        business_name,
        business_description,
        business_phone,
        business_email,
        business_address,
        status
      ),
      service_categories (
        id,
        name,
        icon
      )
    `)
    .eq('id', serviceId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching service:', error)
    throw error
  }

  return data
}

export async function createService(serviceData: {
  vendor_id: string
  category_id: string
  title: string
  description: string
  price: number
  currency?: string
  images?: string[]
  location?: string
  duration_hours?: number
  max_capacity?: number
  amenities?: string[]

  // Hotel-specific fields
  room_types?: string[]
  check_in_time?: string
  check_out_time?: string
  star_rating?: number
  facilities?: string[]

  // Tour-specific fields
  itinerary?: string[]
  included_items?: string[]
  excluded_items?: string[]
  difficulty_level?: 'easy' | 'moderate' | 'challenging' | 'difficult'
  minimum_age?: number
  languages_offered?: string[]

  // Transport-specific fields
  vehicle_type?: string
  vehicle_capacity?: number
  pickup_locations?: string[]
  dropoff_locations?: string[]
  route_description?: string

  // Restaurant-specific fields
  cuisine_type?: string
  opening_hours?: { [key: string]: string }
  menu_items?: string[]
  dietary_options?: string[]
  average_cost_per_person?: number

  // Guide-specific fields
  languages_spoken?: string[]
  specialties?: string[]
  certifications?: string[]
  years_experience?: number
  service_area?: string

  // General metadata
  tags?: string[]
  contact_info?: { phone?: string; email?: string; website?: string }
  booking_requirements?: string
  cancellation_policy?: string

  status?: string
}) {
  // Only insert fields that exist in the basic services table schema
  const basicServiceData = {
    vendor_id: serviceData.vendor_id,
    category_id: serviceData.category_id,
    title: serviceData.title,
    description: serviceData.description,
    price: serviceData.price,
    currency: serviceData.currency || 'UGX',
    images: serviceData.images || [],
    location: serviceData.location,
    duration_hours: serviceData.duration_hours,
    max_capacity: serviceData.max_capacity,
    amenities: serviceData.amenities || [],
    status: serviceData.status || 'pending'
  }

  const { data, error } = await supabase
    .from('services')
    .insert([basicServiceData])
    .select(`
      *,
      vendors (
        id,
        business_name,
        business_description,
        business_email,
        status
      ),
      service_categories (
        id,
        name,
        icon
      )
    `)
    .single()

  if (error) {
    console.error('Error creating service:', error)
    throw error
  }

  // If the service was created successfully and there are additional fields,
  // update the service with the additional fields (this will work if the migration has been run)
  if (data && Object.keys(serviceData).some(key => !Object.keys(basicServiceData).includes(key))) {
    try {
      // Extract additional fields that aren't in the basic schema
      const additionalFields: any = {}
      Object.keys(serviceData).forEach(key => {
        if (!Object.keys(basicServiceData).includes(key) && serviceData[key as keyof typeof serviceData] !== undefined) {
          additionalFields[key] = serviceData[key as keyof typeof serviceData]
        }
      })

      if (Object.keys(additionalFields).length > 0) {
        await updateService(data.id, data.vendor_id, additionalFields)
        // Re-fetch the service with updated data
        const { data: updatedData, error: updateError } = await supabase
          .from('services')
          .select(`
            *,
            vendors (
              id,
              business_name,
              business_description,
              business_email,
              status
            ),
            service_categories (
              id,
              name,
              icon
            )
          `)
          .eq('id', data.id)
          .single()

        if (!updateError) {
          return updatedData
        }
      }
    } catch (updateError) {
      // If updating additional fields fails, just return the basic service
      // This allows service creation to work even without the comprehensive migration
      console.warn('Failed to update additional service fields:', updateError)
    }
  }

  return data
}

export async function updateService(serviceId: string, vendorId: string | undefined, updates: Partial<{
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  location: string
  duration_hours: number
  max_capacity: number
  amenities: string[]
  status: string
  category_id: string

  // Hotel-specific fields
  room_types?: string[]
  check_in_time?: string
  check_out_time?: string
  star_rating?: number
  facilities?: string[]

  // Tour-specific fields
  itinerary?: string[]
  included_items?: string[]
  excluded_items?: string[]
  difficulty_level?: 'easy' | 'moderate' | 'challenging' | 'difficult'
  minimum_age?: number
  languages_offered?: string[]

  // Transport-specific fields
  vehicle_type?: string
  vehicle_capacity?: number
  pickup_locations?: string[]
  dropoff_locations?: string[]
  route_description?: string

  // Restaurant-specific fields
  cuisine_type?: string
  opening_hours?: { [key: string]: string }
  menu_items?: string[]
  dietary_options?: string[]
  average_cost_per_person?: number

  // Guide-specific fields
  languages_spoken?: string[]
  specialties?: string[]
  certifications?: string[]
  years_experience?: number
  service_area?: string

  // General metadata
  tags?: string[]
  contact_info?: { phone?: string; email?: string; website?: string }
  booking_requirements?: string
  cancellation_policy?: string
}>): Promise<any> {
  // Separate basic fields from additional fields
  const basicFields = {
    title: updates.title,
    description: updates.description,
    price: updates.price,
    currency: updates.currency,
    images: updates.images,
    location: updates.location,
    duration_hours: updates.duration_hours,
    max_capacity: updates.max_capacity,
    amenities: updates.amenities,
    status: updates.status,
    category_id: updates.category_id,
    updated_at: new Date().toISOString()
  }

  // Filter out undefined values from basic fields
  const filteredBasicFields: any = {}
  Object.keys(basicFields).forEach(key => {
    if (basicFields[key as keyof typeof basicFields] !== undefined) {
      filteredBasicFields[key] = basicFields[key as keyof typeof basicFields]
    }
  })

  // Extract additional fields
  const additionalFields: any = {}
  const basicKeys = Object.keys(basicFields)
  Object.keys(updates).forEach(key => {
    if (!basicKeys.includes(key) && updates[key as keyof typeof updates] !== undefined) {
      additionalFields[key] = updates[key as keyof typeof updates]
    }
  })

  try {
    // Authorization check: ensure the service belongs to the specified vendor (if vendorId provided)
    if (vendorId) {
      const { data: serviceCheck, error: checkError } = await supabase
        .from('services')
        .select('vendor_id')
        .eq('id', serviceId)
        .single()

      if (checkError || !serviceCheck) {
        throw new Error('Service not found')
      }

      if (serviceCheck.vendor_id !== vendorId) {
        throw new Error('Unauthorized: Service does not belong to this vendor')
      }
    }

    // First, update the basic fields
    const { data, error } = await supabase
      .from('services')
      .update(filteredBasicFields)
      .eq('id', serviceId)
      .select(`
        *,
        vendors (
          id,
          business_name,
          business_description,
          business_email,
          status
        ),
        service_categories (
          id,
          name,
          icon
        )
      `)
      .single()

    if (error) {
      console.error('Error updating basic service fields:', error)
      throw error
    }

    // If there are additional fields and the basic update succeeded,
    // try to update the additional fields (this will work if the migration has been run)
    if (Object.keys(additionalFields).length > 0) {
      try {
        await supabase
          .from('services')
          .update({
            ...additionalFields,
            updated_at: new Date().toISOString()
          })
          .eq('id', serviceId)

        // Re-fetch the service with updated data
        const { data: updatedData, error: updateError } = await supabase
          .from('services')
          .select(`
            *,
            vendors (
              id,
              business_name,
              business_description,
              business_email,
              status
            ),
            service_categories (
              id,
              name,
              icon
            )
          `)
          .eq('id', serviceId)
          .single()

        if (!updateError) {
          return updatedData
        }
      } catch (additionalError) {
        // If updating additional fields fails, just return the basic service data
        // This allows service updates to work even without the comprehensive migration
        console.warn('Failed to update additional service fields:', additionalError)
      }
    }

    return data
  } catch (error) {
    console.error('Error updating service:', error)
    throw error
  }
}

export async function deleteService(serviceId: string, vendorId?: string) {
  console.log('deleteService called with:', { serviceId, vendorId });

  // Authorization check: ensure the service belongs to the specified vendor (if vendorId provided)
  // OR allow admins to delete any service
  if (vendorId) {
    console.log('Checking vendor authorization...');
    const { data: serviceCheck, error: checkError } = await supabase
      .from('services')
      .select('vendor_id')
      .eq('id', serviceId)
      .single()

    if (checkError || !serviceCheck) {
      console.error('Service not found:', checkError);
      throw new Error('Service not found')
    }

    if (serviceCheck.vendor_id !== vendorId) {
      console.error('Unauthorized: Service does not belong to this vendor');
      throw new Error('Unauthorized: Service does not belong to this vendor')
    }
  } else {
    console.log('Checking admin authorization...');
    // If no vendorId provided, check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('Unauthorized: User not authenticated');
      throw new Error('Unauthorized: User not authenticated')
    }

    console.log('User authenticated:', user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('Unauthorized: Profile not found')
    }

    console.log('User profile:', profile);

    if (profile.role !== 'admin') {
      console.error('Unauthorized: User is not admin, role:', profile.role);
      throw new Error('Unauthorized: Only admins can delete services without vendor context')
    }

    console.log('Admin authorization confirmed');
  }

  console.log('Deleting service from database...');
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)

  if (error) {
    console.error('Error deleting service:', error)
    throw error
  }

  console.log('Service deleted successfully');
}

// Get service categories
export async function getServiceCategories() {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching service categories:', error)
    throw error
  }

  return data || []
}

// Image upload functions
export async function uploadServiceImage(file: File, serviceId?: string): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${serviceId || 'temp'}_${Date.now()}.${fileExt}`
  const filePath = `services/${fileName}`

  const { error } = await supabase.storage
    .from('service-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Error uploading image:', error)
    throw error
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('service-images')
    .getPublicUrl(filePath)

  return publicUrl
}

export async function deleteServiceImage(imageUrl: string): Promise<void> {
  // Extract file path from URL
  const urlParts = imageUrl.split('/')
  const fileName = urlParts[urlParts.length - 1]
  const filePath = `services/${fileName}`

  const { error } = await supabase.storage
    .from('service-images')
    .remove([filePath])

  if (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}

// Flight-related database functions
export async function getFlights(): Promise<Flight[]> {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .order('departure_time', { ascending: true })

  if (error) {
    console.error('Error fetching flights:', error)
    throw error
  }

  return data || []
}

export async function getFlightById(id: string): Promise<Flight | null> {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching flight:', error)
    throw error
  }

  return data
}

export async function createFlight(flight: Omit<Flight, 'id' | 'created_at' | 'updated_at'>): Promise<Flight> {
  const { data, error } = await supabase
    .from('flights')
    .insert(flight)
    .select()
    .single()

  if (error) {
    console.error('Error creating flight:', error)
    throw error
  }

  return data
}

export async function updateFlight(id: string, updates: Partial<Flight>): Promise<Flight> {
  const { data, error } = await supabase
    .from('flights')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating flight:', error)
    throw error
  }

  return data
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await supabase
    .from('flights')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting flight:', error)
    throw error
  }
}

export async function updateFlightStatus(id: string, status: Flight['status']): Promise<Flight> {
  const { data, error } = await supabase
    .from('flights')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating flight status:', error)
    throw error
  }

  return data
}

// Service Delete Request functions
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
        service:services(id, title, description, category_id, service_categories(name, emoji)),
        vendor:vendors(id, business_name, user_id),
        reviewer:profiles(id, full_name, email)
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
      vendor:vendors(*),
      reviewer:profiles(id, full_name, email)
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

// User management functions
export async function deleteUser(userId: string): Promise<void> {
  try {
    // First, get the user's role to determine what related data to delete
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      throw profileError
    }

    // Delete related data based on user role
    if (profile.role === 'vendor') {
      // Delete vendor-specific data
      const { error: vendorError } = await supabase
        .from('vendors')
        .delete()
        .eq('user_id', userId)

      if (vendorError) {
        console.error('Error deleting vendor data:', vendorError)
        throw vendorError
      }

      // Delete all services and related data for this vendor
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('vendor_id', userId)

      if (servicesError) {
        console.error('Error fetching vendor services:', servicesError)
        throw servicesError
      }

      if (services && services.length > 0) {
        const serviceIds = services.map(s => s.id)

        // Delete service images (this will be handled by storage policies)
        // Delete bookings related to these services
        const { error: bookingsError } = await supabase
          .from('bookings')
          .delete()
          .in('service_id', serviceIds)

        if (bookingsError) {
          console.error('Error deleting service bookings:', bookingsError)
          throw bookingsError
        }

        // Delete transactions related to these services
        const { error: transactionsError } = await supabase
          .from('transactions')
          .delete()
          .in('service_id', serviceIds)

        if (transactionsError) {
          console.error('Error deleting service transactions:', transactionsError)
          throw transactionsError
        }

        // Delete the services themselves
        const { error: deleteServicesError } = await supabase
          .from('services')
          .delete()
          .eq('vendor_id', userId)

        if (deleteServicesError) {
          console.error('Error deleting services:', deleteServicesError)
          throw deleteServicesError
        }
      }
    } else if (profile.role === 'tourist') {
      // Delete tourist-specific data
      const { error: touristError } = await supabase
        .from('tourists')
        .delete()
        .eq('user_id', userId)

      if (touristError) {
        console.error('Error deleting tourist data:', touristError)
        throw touristError
      }

      // Delete bookings made by this tourist
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('tourist_id', userId)

      if (bookingsError) {
        console.error('Error deleting tourist bookings:', bookingsError)
        throw bookingsError
      }

      // Delete transactions made by this tourist
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('tourist_id', userId)

      if (transactionsError) {
        console.error('Error deleting tourist transactions:', transactionsError)
        throw transactionsError
      }
    }

    // Finally, delete the user profile
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      console.error('Error deleting user profile:', deleteProfileError)
      throw deleteProfileError
    }

    console.log(`User ${userId} and all related data deleted successfully`)
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}