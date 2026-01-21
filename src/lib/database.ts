// Partnership types
export interface PartnerRequest {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  message?: string;
  status: string;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Partner Requests API
export async function getPartnerRequests(): Promise<PartnerRequest[]> {
  const { data, error } = await supabase
    .from('partner_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PartnerRequest[];
}

export async function updatePartnerRequestStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('partner_requests')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

// Partners API
export async function getPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Partner[];
}

export async function addPartner(partner: Omit<Partner, 'id' | 'created_at' | 'updated_at'>): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .insert([{ ...partner }])
    .select()
    .single();
  if (error) throw error;
  return data as Partner;
}

export async function updatePartner(id: string, updates: Partial<Omit<Partner, 'id' | 'created_at' | 'updated_at'>>): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Partner;
}
// Utility to get the first admin profile's ID

/**
 * Fetches the first admin profile's ID from the database.
 * Returns null if not found or on error.
 */
export async function getAdminProfileId(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();
    if (error || !data) {
      console.error('Error fetching admin profile ID:', error);
      return null;
    }
    return data.id;
  } catch (err) {
    console.error('Exception fetching admin profile ID:', err);
    return null;
  }
}
// Database types
export type UserRole = 'tourist' | 'vendor' | 'admin'
export type UserStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'suspended'
export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ServiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type TransactionType = 'payment' | 'withdrawal' | 'refund'
export type TransactionStatus = 'pending' | 'approved' | 'completed' | 'failed' | 'rejected'
export type ServiceDeleteRequestStatus = 'pending' | 'approved' | 'rejected'

import type { Flight } from '../types'
import { formatCurrency } from './utils'
import { creditWallet } from './creditWallet'

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
  emergency_relationship?: string
  emergency_email?: string
  emergency_address?: string
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
  tourist_id?: string // Made optional for guest bookings
  vendor_id: string
  booking_date: string
  service_date?: string
  booking_time?: string
  guests: number
  total_amount: number
  currency: string
  status: BookingStatus
  payment_status: 'pending' | 'paid' | 'refunded'
  special_requests?: string
  payment_reference?: string
  created_at: string
  updated_at: string
  services?: Service
  profiles?: Profile
  // Guest booking fields
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  is_guest_booking?: boolean
  // Transport-specific fields
  pickup_location?: string
  dropoff_location?: string
  driver_option?: string
  return_trip?: boolean
  start_time?: string
  end_time?: string
  end_date?: string
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
  booking_id?: string
  vendor_id?: string
  tourist_id?: string
  amount: number
  currency: string
  transaction_type: 'payment' | 'withdrawal' | 'refund'
  status: TransactionStatus
  payment_method: 'card' | 'mobile_money' | 'bank_transfer'
  reference: string
  created_at: string
}

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

  // Relations
  services?: {
    id: string
    title: string
    service_categories?: {
      name: string
    }
  }
  vendors?: Vendor
}

// Database functions
import { supabase } from './supabaseClient'

// Service CRUD operations
export async function getServices(vendorId?: string) {
  let query = supabase
    .from('services')
    .select('*')

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
      service_categories(*),
      vendors(*)
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
          .select('*')
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
  // Whitelist of columns that actually exist in the database
  const validColumns = new Set([
    'title', 'description', 'price', 'currency', 'images', 'location', 'duration_hours',
    'max_capacity', 'amenities', 'status', 'category_id', 'updated_at',
    // Enhanced general fields
    'duration_days', 'group_size_min', 'group_size_max', 'best_time_to_visit', 'what_to_bring',
    'age_restrictions', 'health_requirements', 'accessibility_features', 'sustainability_certified', 'eco_friendly',
    // Hotel fields (note: check_in_time and check_out_time don't exist, but check_in_process does)
    'total_rooms', 'room_amenities', 'nearby_attractions', 'parking_available', 'pet_friendly',
    'breakfast_included', 'star_rating', 'property_type', 'facilities', 'wifi_available',
    'minimum_stay', 'maximum_guests', 'common_facilities', 'generator_backup', 'smoking_allowed',
    'children_allowed', 'disabled_access', 'concierge_service', 'house_rules', 'local_recommendations',
    'check_in_process',
    // Tour fields
    'itinerary', 'included_items', 'excluded_items', 'difficulty_level', 'minimum_age', 'languages_offered',
    'tour_highlights', 'meeting_point', 'end_point', 'transportation_included', 'meals_included',
    'guide_included', 'accommodation_included',
    // Transport fields
    'vehicle_type', 'vehicle_capacity', 'pickup_locations', 'dropoff_locations', 'route_description',
    'license_required', 'booking_notice_hours', 'usb_charging', 'child_seat', 'roof_rack',
    'towing_capacity', 'four_wheel_drive', 'automatic_transmission', 'transport_terms',
    'driver_included', 'air_conditioning', 'gps_tracking', 'fuel_included', 'tolls_included',
    'insurance_included', 'reservations_required',
    // Restaurant fields
    'cuisine_type', 'opening_hours', 'menu_items', 'dietary_options', 'average_cost_per_person',
    'price_range', 'advance_booking_days', 'dress_code', 'menu_highlights', 'restaurant_atmosphere',
    'restaurant_notes', 'outdoor_seating', 'live_music', 'private_dining', 'alcohol_served',
    // Guide fields
    'languages_spoken', 'specialties', 'certifications', 'years_experience', 'service_area',
    'first_aid_certified', 'emergency_contact',
    // Activity fields
    'activity_type', 'skill_level_required', 'equipment_provided', 'safety_briefing_required',
    'weather_dependent', 'seasonal_availability',
    // Equipment rental fields
    'rental_items', 'rental_duration', 'deposit_required', 'insurance_required', 'delivery_available',
    'maintenance_included', 'replacement_value', 'delivery_radius', 'usage_instructions',
    'maintenance_requirements', 'training_provided', 'cleaning_included', 'repair_service',
    'equipment_condition', 'rental_terms',
    // Event fields
    'event_type', 'event_date', 'event_duration_hours', 'max_participants', 'materials_included',
    'prerequisites', 'learning_outcomes', 'instructor_credentials', 'certificates_provided',
    'refreshments_included', 'take_home_materials', 'photography_allowed', 'recording_allowed',
    'group_discounts', 'event_status', 'event_datetime', 'registration_deadline', 'ticket_price',
    'early_bird_price', 'ticket_purchase_link', 'event_location', 'event_highlights',
    'event_inclusions', 'event_prerequisites', 'event_description', 'event_cancellation_policy',
    // Travel agency fields
    'services_offered', 'destinations_covered', 'booking_fee', 'customization_available',
    'emergency_support', 'website_url', 'social_media', 'emergency_phone', 'booking_deadline_hours',
    'payment_methods', 'refund_policy', 'iata_number', 'specializations', 'success_stories',
    'insurance_brokerage', 'visa_assistance', 'group_bookings', 'corporate_accounts', 'agency_description',
    // Flight fields
    'flight_number', 'airline', 'aircraft_type', 'departure_city', 'arrival_city', 'departure_airport',
    'arrival_airport', 'departure_time', 'arrival_time', 'duration_minutes', 'economy_price',
    'business_price', 'first_class_price', 'total_seats', 'available_seats', 'flight_class',
    'flight_status', 'baggage_allowance', 'flight_amenities', 'flexible_booking', 'lounge_access',
    'priority_boarding', 'flight_meals_included', 'flight_notes',
    // General metadata
    'tags', 'contact_info', 'booking_requirements', 'cancellation_policy'
  ]);

  // Filter updates to only include valid columns
  const filteredUpdates: any = {};
  Object.keys(updates).forEach(key => {
    if (validColumns.has(key) && updates[key as keyof typeof updates] !== undefined) {
      filteredUpdates[key] = updates[key as keyof typeof updates];
    }
  });

  // Always include updated_at
  filteredUpdates.updated_at = new Date().toISOString();

  console.log('Valid updates:', filteredUpdates);

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

    console.log('All updates being sent:', filteredUpdates)

    const { data, error } = await supabase
      .from('services')
      .update(filteredUpdates)
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
      console.error('Error updating service:', error)
      console.error('Update data that failed:', filteredUpdates)
      throw error
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

// Admin dashboard functions
export async function getAllVendors(): Promise<Vendor[]> {
  // First try a simple query without joins to test RLS
  const { data: simpleData, error: simpleError } = await supabase
    .from('vendors')
    .select('id, user_id, business_name, business_email, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (simpleError) {
    console.error('Error fetching vendors (simple query):', simpleError)
    throw simpleError
  }

  console.log('getAllVendors: Found', simpleData?.length || 0, 'vendors')

  // If simple query works, try with profiles join
  if (simpleData && simpleData.length > 0) {
    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        profiles (
          id,
          full_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching vendors with profiles:', error)
      // Return simple data if join fails, but ensure it matches Vendor interface
      return simpleData.map(vendor => ({
        ...vendor,
        business_description: undefined,
        business_address: undefined,
        business_phone: undefined,
        business_website: undefined,
        business_type: undefined,
        operating_hours: undefined,
        years_in_business: undefined,
        business_license: undefined,
        tax_id: undefined,
        approved_at: undefined,
        approved_by: undefined,
        profiles: {
          id: vendor.user_id,
          full_name: vendor.business_name,
          email: vendor.business_email,
          phone: undefined
        }
      })) as Vendor[]
    }

    return data || []
  }

  // If no data from simple query, return empty array
  return []
}

export async function getAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    throw error
  }

  return data || []
}

export async function createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'vendor_id'> & { vendor_id?: string }): Promise<Booking> {
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

  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      is_guest_booking: isGuestBooking,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating booking:', error)
    throw error
  }

  console.log('Booking created successfully:', data)
  return data
}

export async function updateBooking(id: string, updates: Partial<Pick<Booking, 'status' | 'payment_status'>>): Promise<Booking> {
  try {
    console.log('DB: updateBooking called with id:', id, 'updates:', updates)

    // Get the current booking to check if we need to create a transaction
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('DB: Error fetching current booking:', fetchError)
      throw fetchError
    }

    console.log('DB: Current booking status:', currentBooking.status, 'payment_status:', currentBooking.payment_status)

    // Update the booking
    const { data, error } = await supabase
      .from('bookings')
      .update({
        ...updates,
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

    if (error) {
      console.error('DB: Error updating booking:', error)
      throw error
    }

    console.log('DB: Booking updated successfully. New status:', data.status, 'payment_status:', data.payment_status)

    // Check if we need to create a transaction and credit wallets
    // Create transaction and credit wallets when booking is "confirmed AND paid" (after update)
    const finalStatus = data.status;
    const finalPaymentStatus = data.payment_status;
    const shouldCreateTransaction = finalStatus === 'confirmed' && finalPaymentStatus === 'paid';

    console.log('DB: Transaction check - finalStatus:', finalStatus, 'finalPaymentStatus:', finalPaymentStatus, 'shouldCreateTransaction:', shouldCreateTransaction);

    if (shouldCreateTransaction) {
      console.log('[Wallet Debug] Attempting to create payment transaction for booking:', id, {
        vendor_id: data.vendor_id,
        tourist_id: data.tourist_id,
        amount: data.total_amount,
        currency: data.currency,
        transaction_type: 'payment',
        status: 'completed',
        payment_method: 'card',
        reference: `PMT_${id.slice(0, 8)}_${Date.now()}`
      });
      // Check if a payment transaction already exists for this booking
      const { data: existingTransaction, error: transactionCheckError } = await supabase
        .from('transactions')
        .select('id')
        .eq('booking_id', id)
        .eq('transaction_type', 'payment')
        .eq('status', 'completed')
        .single();

      if (transactionCheckError && transactionCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
        // If table doesn't exist, skip transaction creation
        if (transactionCheckError.message?.includes('relation "transactions" does not exist')) {
          console.warn('Transactions table does not exist. Skipping payment transaction creation.');
        } else {
          console.error('Error checking existing transaction:', transactionCheckError);
        }
      } else {
        // Only create transaction if one doesn't already exist
        if (!existingTransaction) {
          try {
            const reference = `PMT_${id.slice(0, 8)}_${Date.now()}`;
            await addTransaction({
              booking_id: id,
              vendor_id: data.vendor_id,
              tourist_id: data.tourist_id,
              amount: data.total_amount,
              currency: data.currency,
              transaction_type: 'payment',
              status: 'completed',
              payment_method: 'card', // Default payment method
              reference
            });
            console.log('Created payment transaction for booking:', id);
            // Credit vendor wallet
            await creditWallet(data.vendor_id, data.total_amount, data.currency);
            // Credit admin wallet (platform fee logic can be added here)
            const adminId = await getAdminProfileId();
            if (adminId) {
              // For now, credit full amount to admin as well. Adjust for fee split if needed.
              await creditWallet(adminId, data.total_amount, data.currency);
            }
          } catch (transactionError) {
            // If transactions table doesn't exist, just log and continue
            if (transactionError instanceof Error && transactionError.message.includes('Transactions table does not exist')) {
              console.warn('Transactions table does not exist. Payment transaction not created.');
            } else {
              console.error('Error creating payment transaction:', transactionError);
              // Don't throw here - the booking update was successful
            }
          }
        }
      }
    }

    return data
  } catch (error) {
    console.error('Error in updateBooking:', error)
    throw error
  }
}

export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    // First get all transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }

    if (!transactions || transactions.length === 0) {
      return []
    }

    // Get vendor IDs from transactions
    const vendorIds = transactions.map(t => t.vendor_id).filter(id => id)

    if (vendorIds.length === 0) {
      return transactions
    }

    // Fetch vendor information separately
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, business_name, business_email, status')
      .in('id', vendorIds)

    if (vendorsError) {
      console.error('Error fetching vendors for transactions:', vendorsError)
      // Return transactions without vendor info rather than failing
      return transactions
    }

    // Map vendor information to transactions
    const vendorMap = new Map(vendors?.map(v => [v.id, v]) || [])

    const transactionsWithVendors = transactions.map(transaction => ({
      ...transaction,
      vendors: vendorMap.get(transaction.vendor_id) || null
    }))

    return transactionsWithVendors
  } catch (error) {
    console.error('Error in getAllTransactions:', error)
    return []
  }
}

export async function getAllTransactionsForAdmin(): Promise<Transaction[]> {
  try {
    // First check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Access denied: Admin role required')
    }

    // First get all transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin transactions:', error)
      throw error
    }

    if (!transactions || transactions.length === 0) {
      return []
    }

    // Get vendor IDs from transactions
    const vendorIds = transactions.map(t => t.vendor_id).filter(id => id)

    if (vendorIds.length === 0) {
      return transactions
    }

    // Fetch vendor information separately
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, business_name, business_email, status')
      .in('id', vendorIds)

    if (vendorsError) {
      console.error('Error fetching vendors for admin transactions:', vendorsError)
      // Return transactions without vendor info rather than failing
      return transactions
    }

    // Map vendor information to transactions
    const vendorMap = new Map(vendors?.map(v => [v.id, v]) || [])

    const transactionsWithVendors = transactions.map(transaction => ({
      ...transaction,
      vendors: vendorMap.get(transaction.vendor_id) || null
    }))

    return transactionsWithVendors
  } catch (error) {
    console.error('Error in getAllTransactionsForAdmin:', error)
    throw error
  }
}

export async function getAllVendorWallets(): Promise<any[]> {
  try {
    // First get all wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('*')
      .order('balance', { ascending: false })

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError)
      throw walletsError
    }

    if (!wallets || wallets.length === 0) {
      return []
    }

    // Get vendor IDs from wallets
    const vendorIds = wallets.map(w => w.vendor_id).filter(id => id)

    if (vendorIds.length === 0) {
      return wallets
    }

    // Fetch vendor information separately
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, business_name, business_email, status, created_at')
      .in('id', vendorIds)

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError)
      // Return wallets without vendor info rather than failing
      return wallets
    }

    // Map vendor information to wallets
    const vendorMap = new Map(vendors?.map(v => [v.id, v]) || [])

    const walletsWithVendors = wallets.map(wallet => ({
      ...wallet,
      vendors: vendorMap.get(wallet.vendor_id) || null
    }))

    return walletsWithVendors
  } catch (error) {
    console.error('Error in getAllVendorWallets:', error)
    return []
  }
}

export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    throw error
  }

  return data || []
}

export async function updateVendorStatus(vendorId: string, status: VendorStatus): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .update({
      status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', vendorId)
    .select(`
      *,
      profiles (
        id,
        full_name,
        email,
        phone
      )
    `)
    .single()

  if (error) {
    console.error('Error updating vendor status:', error)
    throw error
  }

  return data
}

export async function getDashboardStats() {
  try {
    console.log('getDashboardStats: Starting dashboard stats fetch...');

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('getDashboardStats: Auth check - User:', user?.id, 'Error:', authError);

    if (authError || !user) {
      console.error('getDashboardStats: User not authenticated');
      throw new Error('User not authenticated');
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('getDashboardStats: Profile check - Profile:', profile, 'Error:', profileError);

    if (profileError || !profile) {
      console.error('getDashboardStats: Profile not found');
      throw new Error('Profile not found');
    }

    if (profile.role !== 'admin') {
      console.error('getDashboardStats: User is not admin, role:', profile.role);
      throw new Error('Access denied: Admin role required');
    }

    console.log('getDashboardStats: User is admin, proceeding with queries...');

    // Get vendor stats
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('status')

    console.log('getDashboardStats: Vendors query - Data length:', vendors?.length, 'Error:', vendorsError);

    if (vendorsError) {
      console.error('getDashboardStats: Error fetching vendors:', vendorsError);
      throw vendorsError;
    }

    const totalVendors = vendors?.length || 0
    const pendingVendors = vendors?.filter(v => v.status === 'pending').length || 0

    // Get tourist stats
    const { data: tourists, error: touristsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'tourist')

    console.log('getDashboardStats: Tourists query - Data length:', tourists?.length, 'Error:', touristsError);

    if (touristsError) {
      console.error('getDashboardStats: Error fetching tourists:', touristsError);
      throw touristsError;
    }

    const totalTourists = tourists?.length || 0

    // Get service stats
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('status')

    console.log('getDashboardStats: Services query - Data length:', services?.length, 'Error:', servicesError);

    if (servicesError) {
      console.error('getDashboardStats: Error fetching services:', servicesError);
      throw servicesError;
    }

    const totalServices = services?.length || 0
    const pendingServices = services?.filter(s => s.status === 'pending').length || 0

    // Get booking stats
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('status, total_amount')

    console.log('getDashboardStats: Bookings query - Data length:', bookings?.length, 'Error:', bookingsError);

    if (bookingsError) {
      console.error('getDashboardStats: Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    const totalBookings = bookings?.length || 0
    const totalRevenue = bookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0

    console.log('getDashboardStats: Stats calculated -', {
      totalVendors,
      pendingVendors,
      totalServices,
      pendingServices,
      totalBookings,
      totalRevenue
    });

    // Get recent bookings
    const { data: recentBookings, error: recentBookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          title,
          vendors (
            business_name
          )
        ),
        profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('getDashboardStats: Recent bookings query - Data length:', recentBookings?.length, 'Error:', recentBookingsError);

    if (recentBookingsError) {
      console.error('getDashboardStats: Error fetching recent bookings:', recentBookingsError);
      // Don't throw here, just log and continue
    }

    // Get recent vendors
    const { data: recentVendors, error: recentVendorsError } = await supabase
      .from('vendors')
      .select(`
        *,
        profiles (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('getDashboardStats: Recent vendors query - Data length:', recentVendors?.length, 'Error:', recentVendorsError);

    if (recentVendorsError) {
      console.error('getDashboardStats: Error fetching recent vendors:', recentVendorsError);
      // Don't throw here, just log and continue
    }

    // Get total messages for admin
    const { count: totalMessages, error: totalMessagesError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_role', 'admin')

    console.log('getDashboardStats: Total messages query - Count:', totalMessages, 'Error:', totalMessagesError);

    if (totalMessagesError) {
      console.error('getDashboardStats: Error fetching total messages:', totalMessagesError);
      // Don't throw here, just log and continue
    }

    return {
      totalVendors,
      pendingVendors,
      totalTourists,
      totalServices,
      pendingServices,
      totalBookings,
      totalRevenue,
      totalMessages: totalMessages || 0,
      recentBookings: recentBookings || [],
      recentVendors: recentVendors || []
    }
  } catch (error) {
    console.error('getDashboardStats: Exception caught:', error)
    throw error
  }
}

// Message management functions
export async function getAdminMessages(filter?: 'vendor_to_admin' | 'tourist_to_admin' | 'unread') {
  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, email),
        recipient:profiles!messages_recipient_id_fkey(id, full_name, email)
      `)
      .eq('recipient_role', 'admin')
      .order('created_at', { ascending: false })

    if (filter === 'vendor_to_admin') {
      query = query.eq('sender_role', 'vendor')
    } else if (filter === 'tourist_to_admin') {
      query = query.eq('sender_role', 'tourist')
    } else if (filter === 'unread') {
      query = query.eq('status', 'unread')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching admin messages:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAdminMessages:', error)
    throw error
  }
}

export async function getVendorMessages(vendorId: string, filter?: 'unread' | 'customer' | 'admin') {
  try {
    let query = supabase
      .from('messages')
      .select(`*, sender:profiles!messages_sender_id_fkey(id, full_name, email)`)
      .order('created_at', { ascending: false })

    if (filter === 'unread') {
      query = query
        .or(`recipient_id.eq.${vendorId},sender_id.eq.${vendorId}`)
        .eq('status', 'unread')
    } else if (filter === 'customer') {
      // Only messages from tourists to vendor
      query = query
        .eq('recipient_id', vendorId)
        .eq('recipient_role', 'vendor')
        .eq('sender_role', 'tourist')
    } else if (filter === 'admin') {
      // All messages between vendor and admin (sent or received)
      query = query.or(`and(sender_id.eq.${vendorId},recipient_role.eq.admin),and(recipient_id.eq.${vendorId},sender_role.eq.admin)`)
    } else {
      // All messages where vendor is involved
      query = query.or(`recipient_id.eq.${vendorId},sender_id.eq.${vendorId}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching vendor messages:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getVendorMessages:', error)
    throw error
  }
}

export async function sendMessage(messageData: {
  sender_id: string
  sender_role: string
  recipient_id: string
  recipient_role: string
  subject: string
  message: string
}) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        ...messageData,
        status: 'unread',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in sendMessage:', error)
    throw error
  }
}

export async function markMessageAsRead(messageId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        status: 'read',
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      console.error('Error marking message as read:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in markMessageAsRead:', error)
    throw error
  }
}

export async function replyToMessage(originalMessageId: string, replyData: {
  sender_id: string
  sender_role: string
  recipient_id: string
  recipient_role: string
  subject: string
  message: string
}) {
  try {
    // First, mark the original message as replied
    await supabase
      .from('messages')
      .update({
        status: 'replied',
        updated_at: new Date().toISOString()
      })
      .eq('id', originalMessageId)

    // Then send the reply
    return await sendMessage(replyData)
  } catch (error) {
    console.error('Error in replyToMessage:', error)
    throw error
  }
}
export async function getVendorServices(vendorId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      service_categories (
        id,
        name,
        icon
      )
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vendor services:', error)
    throw error
  }

  return data || []
}

export async function getVendorBookings(vendorId: string): Promise<Booking[]> {
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

export async function getVendorTransactions(vendorId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      bookings (
        id,
        services (
          title
        )
      )
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vendor transactions:', error)
    throw error
  }

  return data || []
}

export async function getVendorWallet(vendorId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('vendor_id', vendorId)
    .single()

  if (error) {
    // If wallet doesn't exist, return a default one
    if (error.code === 'PGRST116') {
      return {
        id: `wallet_${vendorId}`,
        vendor_id: vendorId,
        balance: 0,
        currency: 'UGX',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    console.error('Error fetching vendor wallet:', error)
    throw error
  }

  return data
}

export async function getVendorStats(vendorId: string) {
  try {
    if (!vendorId) {
      console.error('getVendorStats: vendorId is null or undefined')
      return {
        servicesCount: 0,
        pendingBookings: 0,
        completedBookings: 0,
        balance: 0,
        currency: 'UGX',
        messagesCount: 0,
        inquiriesCount: 0,
        recentBookings: [],
        recentTransactions: []
      }
    }

    // Get services count - try with vendorId first, then check if it's a user_id
    let servicesQuery = supabase
      .from('services')
      .select('id, vendor_id, status')
      .eq('vendor_id', vendorId)

    let { data: services, error: servicesError } = await servicesQuery

    // If no services found and vendorId might be a user_id, also check for vendor record
    if ((!services || services.length === 0) && !servicesError) {
      // Check if there's a vendor record for this user_id
      const { data: vendorRecord, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', vendorId)
        .single()

      if (!vendorError && vendorRecord) {
        const { data: vendorServices, error: vendorServicesError } = await supabase
          .from('services')
          .select('id, vendor_id, status')
          .eq('vendor_id', vendorRecord.id)

        if (!vendorServicesError && vendorServices) {
          services = vendorServices
          servicesError = vendorServicesError
        }
      }
    }

    if (servicesError) throw servicesError

    // Get bookings stats
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('status')
      .eq('vendor_id', vendorId)

    if (bookingsError) throw bookingsError

    const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0

    // Get wallet - try to get vendor wallet, fallback to user wallet if vendorId is user.id
    let wallet = null
    try {
      wallet = await getVendorWallet(vendorId)
    } catch (error) {
      console.log('getVendorStats: Could not get wallet with vendorId, trying with user lookup')
      // If vendorId might be a user_id, try to find the vendor record
      const { data: vendorRecord, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', vendorId)
        .single()

      if (!vendorError && vendorRecord) {
        wallet = await getVendorWallet(vendorRecord.id)
      }
    }

    // Get messages count for vendor
    const { count: messagesCount, error: messagesError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', vendorId)
      .eq('recipient_role', 'vendor')

    // If no messages found, try with vendor.id if vendorId is user.id
    let finalMessagesCount = messagesCount
    if ((!messagesCount || messagesCount === 0) && !messagesError) {
      const { data: vendorRecord, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', vendorId)
        .single()

      if (!vendorError && vendorRecord) {
        const { count: vendorMessagesCount, error: vendorMessagesError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', vendorRecord.id)
          .eq('recipient_role', 'vendor')

        if (!vendorMessagesError && vendorMessagesCount) {
          finalMessagesCount = vendorMessagesCount
        }
      }
    }

    if (messagesError) throw messagesError

    // Get inquiries count for vendor
    let inquiriesCount = 0
    try {
      inquiriesCount = await getInquiryCount(vendorId)
    } catch (inquiryError) {
      console.warn('Could not fetch inquiry count (table may not exist yet):', inquiryError)
      inquiriesCount = 0
    }

    // Get recent bookings
    const { data: recentBookings, error: recentBookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          title
        ),
        profiles (
          full_name
        )
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentBookingsError) throw recentBookingsError

    // Get recent transactions
    const { data: recentTx, error: recentTxError } = await supabase
      .from('transactions')
      .select(`
        *,
        bookings (
          services (
            title
          )
        )
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentTxError) throw recentTxError

    return {
      servicesCount: services?.length || 0,
      pendingBookings,
      completedBookings,
      balance: wallet?.balance || 0,
      currency: wallet?.currency || 'UGX',
      messagesCount: finalMessagesCount || 0,
      inquiriesCount,
      recentBookings: recentBookings || [],
      recentTransactions: recentTx || []
    }
  } catch (error) {
    console.error('Error fetching vendor stats:', error)
    throw error
  }
}

// Inquiry functions
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
    // First try with vendorId as vendor.id
    let query = supabase
      .from('inquiries')
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
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    let { data, error } = await query

    // If no inquiries found and vendorId might be a user_id, try with vendor record lookup
    if ((!data || data.length === 0) && !error) {
      const { data: vendorRecord, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', vendorId)
        .single()

      if (!vendorError && vendorRecord) {
        const { data: vendorInquiries, error: vendorInquiriesError } = await supabase
          .from('inquiries')
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
          .eq('vendor_id', vendorRecord.id)
          .order('created_at', { ascending: false })

        if (!vendorInquiriesError) {
          data = vendorInquiries
          error = vendorInquiriesError
        }
      }
    }

    if (error) {
      console.error('Error fetching vendor inquiries:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getVendorInquiries:', error)
    throw error
  }
}

export async function updateInquiryStatus(inquiryId: string, status: 'unread' | 'read' | 'responded' | 'archived', responseMessage?: string): Promise<Inquiry> {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'responded' && responseMessage) {
      updateData.responded_at = new Date().toISOString()
      updateData.response_message = responseMessage
    }

    const { data, error } = await supabase
      .from('inquiries')
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

    return data
  } catch (error) {
    console.error('Error in updateInquiryStatus:', error)
    throw error
  }
}

export async function getInquiryCount(vendorId: string): Promise<number> {
  try {
    // First try with vendorId as vendor.id
    let { count, error } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)

    // If no count and vendorId might be a user_id, try with vendor record lookup
    if ((!count || count === 0) && !error) {
      const { data: vendorRecord, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', vendorId)
        .single()

      if (!vendorError && vendorRecord) {
        const { count: vendorCount, error: vendorCountError } = await supabase
          .from('inquiries')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendorRecord.id)

        if (!vendorCountError) {
          count = vendorCount
        }
      }
    }

    if (error) {
      console.error('Error fetching inquiry count:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getInquiryCount:', error)
    throw error
  }
}

// Transaction functions
export async function getTransactions(vendorId: string) {
  try {
    console.log('getTransactions: Querying transactions for vendorId:', vendorId)
    
    // Try RPC function first (if it exists)
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_vendor_transactions', {
        vendor_id_param: vendorId
      })
      
      if (!rpcError && rpcData) {
        console.log('getTransactions: Got transactions via RPC:', rpcData.length)
        return rpcData
      }
      
      console.log('getTransactions: RPC failed or not available:', rpcError)
    } catch (rpcErr) {
      console.log('getTransactions: RPC not available, using fallback')
    }
    
    // Try querying through vendors relationship
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select(`
        id,
        transactions (*)
      `)
      .eq('id', vendorId)
      .single()

    console.log('getTransactions: Vendor query result:', vendorData, 'error:', vendorError)

    if (!vendorError && vendorData?.transactions) {
      console.log('getTransactions: Got transactions through vendor relationship:', vendorData.transactions.length)
      return vendorData.transactions
    }

    // Fallback: direct query (might be blocked by RLS)
    console.log('getTransactions: Using direct query...')
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    console.log('getTransactions: Direct query result - data length:', data?.length, 'error:', error)

    if (error) {
      if (error.message?.includes('permission denied') || error.message?.includes('insufficient_privilege')) {
        console.warn('RLS blocking transactions query, returning empty array')
        return []
      }
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getTransactions:', error)
    return []
  }
}

export async function addTransaction(transaction: {
  booking_id?: string
  vendor_id: string
  tourist_id?: string
  amount: number
  currency: string
  transaction_type: 'payment' | 'withdrawal' | 'refund'
  status: 'pending' | 'completed' | 'failed'
  payment_method: 'card' | 'mobile_money' | 'bank_transfer'
  reference: string
}) {
  try {

    console.log('[Wallet Debug] addTransaction called with:', transaction);
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single()

    if (error) {
      // If table doesn't exist, throw a more helpful error
      if (error.message?.includes('relation "transactions" does not exist')) {
        throw new Error('Transactions table does not exist. Please run the database migrations first.')
      }
      console.error('Error adding transaction:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in addTransaction:', error)
    throw error
  }
}

/**
 * Reconcile bookings: find bookings that are confirmed AND paid but have no
 * corresponding completed payment transaction, and create one.
 * If vendorId is provided, limit to that vendor only.
 * Returns the number of transactions created.
 */
export async function reconcileMissingPaymentTransactions(vendorId?: string): Promise<number> {
  try {
    // Build base query
    let query = supabase
      .from('bookings')
      .select('id, vendor_id, tourist_id, total_amount, currency')
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid')

    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }

    const { data: bookings, error: bookingsError } = await query
    if (bookingsError) {
      console.error('Error fetching confirmed+paid bookings for reconciliation:', bookingsError)
      throw bookingsError
    }

    if (!bookings || bookings.length === 0) return 0

    let created = 0

    for (const b of bookings) {
      try {
        // Check existing completed payment transaction for this booking
        const { data: existingTx, error: txCheckError } = await supabase
          .from('transactions')
          .select('id')
          .eq('booking_id', b.id)
          .eq('transaction_type', 'payment')
          .eq('status', 'completed')
          .single()

        if (txCheckError && txCheckError.code !== 'PGRST116') {
          console.warn('Error checking transactions for booking', b.id, txCheckError)
          continue
        }

        if (existingTx) {
          // already has payment
          continue
        }

        // create transaction
        const reference = `PMT_${b.id.slice(0, 8)}_${Date.now()}`
        await addTransaction({
          booking_id: b.id,
          vendor_id: b.vendor_id,
          tourist_id: b.tourist_id,
          amount: b.total_amount,
          currency: b.currency || 'UGX',
          transaction_type: 'payment',
          status: 'completed',
          payment_method: 'card',
          reference
        })
        created += 1
        console.log('Reconciliation: created payment transaction for booking', b.id)
      } catch (err) {
        console.error('Reconciliation: failed for booking', b.id, err)
      }
    }

    return created
  } catch (error) {
    console.error('Error in reconcileMissingPaymentTransactions:', error)
    throw error
  }
}

export async function updateTransactionStatus(transactionId: string, status: 'pending' | 'approved' | 'completed' | 'failed') {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('id', transactionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating transaction status:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateTransactionStatus:', error)
    throw error
  }
}

export async function getWalletStats(vendorId: string) {
  try {
    const transactions = await getTransactions(vendorId)

    // If no transactions (table doesn't exist or no data), return default stats
    if (!transactions || transactions.length === 0) {
      return {
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingWithdrawals: 0,
        currentBalance: 0,
        currency: 'UGX',
        totalTransactions: 0,
        completedPayments: 0,
        completedWithdrawals: 0,
        pendingWithdrawalsCount: 0
      }
    }

    // Payments for bookings that are paid but not yet completed
    const pendingPayments = transactions.filter((t: Transaction) => t.transaction_type === 'payment' && t.status === 'completed' && t.booking_id)
    // To distinguish, we need to check booking status for each payment
    // We'll fetch all related bookings and map their status
    let completedBookingIds: string[] = [];
    let pendingBookingIds: string[] = [];
    if (pendingPayments.length > 0) {
      const bookingIds = pendingPayments.map((t: Transaction) => t.booking_id).filter(Boolean) as string[];
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status')
        .in('id', bookingIds);
      if (!bookingsError && bookings) {
        completedBookingIds = bookings.filter((b: any) => b.status === 'completed').map((b: any) => b.id);
        pendingBookingIds = bookings.filter((b: any) => b.status !== 'completed').map((b: any) => b.id);
      }
    }

    // Payments for completed bookings
    const completedPayments = pendingPayments.filter((t: Transaction) => completedBookingIds.includes(t.booking_id!));
    // Payments for bookings not yet completed
    const notCompletedPayments = pendingPayments.filter((t: Transaction) => pendingBookingIds.includes(t.booking_id!));

    const withdrawals = transactions.filter((t: Transaction) => t.transaction_type === 'withdrawal');
    const totalEarned = pendingPayments.reduce((s: number, t: Transaction) => s + t.amount, 0);
    const totalWithdrawn = withdrawals.filter((t: Transaction) => t.status === 'completed').reduce((s: number, t: Transaction) => s + t.amount, 0);
    const pendingWithdrawals = withdrawals.filter((t: Transaction) => t.status === 'pending').reduce((s: number, t: Transaction) => s + t.amount, 0);
    const completedBalance = completedPayments.reduce((s: number, t: Transaction) => s + t.amount, 0) - totalWithdrawn - pendingWithdrawals;
    const pendingBalance = notCompletedPayments.reduce((s: number, t: Transaction) => s + t.amount, 0);
    const currentBalance = completedBalance + pendingBalance;
    const currency = transactions[0]?.currency || 'UGX';

    return {
      totalEarned,
      totalWithdrawn,
      pendingWithdrawals,
      currentBalance,
      completedBalance, // money for completed bookings
      pendingBalance,   // money for paid but not yet completed bookings
      currency,
      totalTransactions: transactions.length,
      completedPayments: completedPayments.length,
      pendingPayments: notCompletedPayments.length,
      completedWithdrawals: withdrawals.filter((t: Transaction) => t.status === 'completed').length,
      pendingWithdrawalsCount: withdrawals.filter((t: Transaction) => t.status === 'pending').length
    }
  } catch (error) {
    console.error('Error in getWalletStats:', error)
    // Return default stats on error
    return {
      totalEarned: 0,
      totalWithdrawn: 0,
      pendingWithdrawals: 0,
      currentBalance: 0,
      currency: 'UGX',
      totalTransactions: 0,
      completedPayments: 0,
      completedWithdrawals: 0,
      pendingWithdrawalsCount: 0
    }
  }
}

export async function requestWithdrawal(vendorId: string, amount: number, currency: string) {
  try {
    // Get current wallet stats to validate the withdrawal amount
    const walletStats = await getWalletStats(vendorId)

    if (amount > walletStats.currentBalance) {
      throw new Error(`Insufficient balance. Available: ${formatCurrency(walletStats.currentBalance, walletStats.currency)}`)
    }

    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0')
    }

    // Check if transactions table exists by trying to insert
    const reference = `WD_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

    const transaction = await addTransaction({
      vendor_id: vendorId,
      amount,
      currency,
      transaction_type: 'withdrawal',
      status: 'pending',
      payment_method: 'mobile_money',
      reference
    })

    return transaction
  } catch (error) {
    console.error('Error in requestWithdrawal:', error)
    throw error
  }
}

// Guest booking support functions
export async function getBookingsForUser(userId: string): Promise<Booking[]> {
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
    console.error('Error in getBookingsForUser:', error)
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