import { supabase } from '../lib/supabaseClient'

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
      ),
      ticket_types (
        id,
        title,
        description,
        price,
        quantity,
        sold,
        metadata,
        sale_start,
        sale_end
      )
    `)

  if (vendorId) {
    // Vendor wants to see their own services (including pending)
    query = query.eq('vendor_id', vendorId)
  } else {
    // Check if current user is admin — wrapped defensively so a stale auth
    // session never prevents the public listing from loading.
    let isAdmin = false;
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        isAdmin = profile?.role === 'admin';
      }
    } catch {
      // auth check failed — treat as public user
    }

    if (!isAdmin) {
      // Public listings should only include approved/active services
      query = query.in('status', ['approved', 'active'])
    }
    // If admin, don't filter by status - show all services
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching services:', error)
    throw error
  }

  return data || []
}

export async function getServicesByCategory(categoryId: string, excludeServiceId?: string, limit: number = 10) {
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
      ),
      ticket_types (
        id,
        title,
        description,
        price,
        quantity,
        sold,
        metadata,
        sale_start,
        sale_end
      )
    `)
    .eq('category_id', categoryId)

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    isAdmin = profile?.role === 'admin';
  }

  if (!isAdmin) {
    // Public listings should only include approved/active services
    query = query.in('status', ['approved', 'active'])
  }

  if (excludeServiceId) {
    query = query.neq('id', excludeServiceId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching services by category:', error)
    throw error
  }

  return data || []
}

export async function getServiceCategories() {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching service categories:', error)
    throw error
  }

  return data || []
}

export async function getServiceById(serviceId: string, options?: { vendorId?: string; includeUnapproved?: boolean }) {
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

  if (!data) return data

  // If caller didn't request unapproved services, hide them from public consumers
  if (!options?.includeUnapproved) {
    const status = data.status
    const isOwner = options?.vendorId && data.vendor_id === options.vendorId
    if (!isOwner && status !== 'approved' && status !== 'active') {
      return null
    }
  }

  return data
}

export async function getServiceBySlug(serviceSlug: string, options?: { vendorId?: string; includeUnapproved?: boolean }) {
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      service_categories(*),
      vendors(*)
    `)
    .eq('slug', serviceSlug)
    .maybeSingle()

  if (error) {
    console.error('Error fetching service by slug:', error)
    throw error
  }

  if (!data) return data

  // Hide unapproved services from public consumers unless caller is the owner or explicitly included
  if (!options?.includeUnapproved) {
    const status = data.status
    const isOwner = options?.vendorId && data.vendor_id === options.vendorId
    if (!isOwner && status !== 'approved' && status !== 'active') {
      return null
    }
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
  try {
    // Try atomic RPC first, fall back to direct insert if RPC fails
    let serviceId: string;
    try {
      const result = await supabase.rpc('create_service_atomic', {
        p_vendor_id: serviceData.vendor_id,
        p_category_id: serviceData.category_id,
        p_title: serviceData.title,
        p_description: serviceData.description,
        p_price: serviceData.price,
        p_currency: serviceData.currency || 'UGX',
        p_images: serviceData.images || [],
        p_location: serviceData.location,
        p_duration_hours: serviceData.duration_hours,
        p_max_capacity: serviceData.max_capacity,
        p_amenities: serviceData.amenities || [],
        p_status: serviceData.status || 'pending'
      });

      if (result.error) throw result.error;

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to create service');
      }

      serviceId = result.data.service_id;
    } catch (rpcError: any) {
      console.warn('RPC create_service_atomic failed, falling back to direct insert:', rpcError?.code || rpcError?.message);

      // Fallback: direct table insert
      const { data: inserted, error: insertError } = await supabase
        .from('services')
        .insert({
          vendor_id: serviceData.vendor_id,
          category_id: serviceData.category_id,
          title: serviceData.title,
          description: serviceData.description,
          price: serviceData.price,
          currency: serviceData.currency || 'UGX',
          images: serviceData.images || [],
          location: serviceData.location || null,
          duration_hours: serviceData.duration_hours || null,
          max_capacity: serviceData.max_capacity || null,
          amenities: serviceData.amenities || [],
          status: serviceData.status || 'pending'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      serviceId = inserted.id;
    }

    const basicFields = ['vendor_id', 'category_id', 'title', 'description', 'price', 'currency', 'images', 'location', 'duration_hours', 'max_capacity', 'amenities', 'status'];

    // If there are additional fields, update the service with them
    if (Object.keys(serviceData).some(key => !basicFields.includes(key))) {
      // Extract additional fields
      const additionalFields: any = {};
      Object.keys(serviceData).forEach(key => {
        if (!basicFields.includes(key) && serviceData[key as keyof typeof serviceData] !== undefined) {
          const value = serviceData[key as keyof typeof serviceData];
          if (value === '') return; // Skip empty strings
          additionalFields[key] = value;
        }
      });

      if (Object.keys(additionalFields).length > 0) {
        await updateService(serviceId, serviceData.vendor_id, additionalFields);
      }
    }

    // Fetch the complete service with relations
    const { data: service, error: fetchError } = await supabase
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
      .single();

    if (fetchError) throw fetchError;
    return service;

  } catch (error) {
    console.error('Error creating service:', error);
    throw error;
  }
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
  // Transport pricing (new)
  price_within_town?: number
  price_upcountry?: number
}>): Promise<any> {
  try {
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
      'vehicle_features', 'vehicle_ccs', 'vehicle_engine', 'fuel_type', 'fuel_km_per_liter',
      'license_required', 'booking_notice_hours', 'usb_charging', 'child_seat', 'roof_rack',
      'towing_capacity', 'four_wheel_drive', 'automatic_transmission', 'transport_terms',
      'driver_included', 'air_conditioning', 'gps_tracking', 'fuel_included', 'tolls_included',
      // Transport pricing
      'price_within_town', 'price_upcountry',
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
      // Admin-controlled scan/link activation for events
      'scan_enabled',
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
        const value = updates[key as keyof typeof updates];
        // Skip empty strings — they cause DB errors on typed columns (timestamps, numerics, etc.)
        if (value === '') return;
        filteredUpdates[key] = value;
      }
    });

    // Always include updated_at
    filteredUpdates.updated_at = new Date().toISOString();
    // Build RPC payload omitting updated_at because the RPC implementation can be strict
    const rpcUpdates = { ...filteredUpdates };
    delete (rpcUpdates as any).updated_at;

    try {
      try {
        console.log('Valid updates:', JSON.stringify(filteredUpdates));
      } catch (e) {
        console.log('Valid updates: (could not stringify)', filteredUpdates);
      }

      // Try atomic RPC first, fall back to direct update if RPC fails (e.g. type mismatches)
      const result = await supabase.rpc('update_service_atomic', {
        p_service_id: serviceId,
        p_updates: rpcUpdates,
        p_vendor_id: vendorId
      });

      console.log('updateService: RPC result:', result);

      if (result.error) throw result.error;

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to update service');
      }
    } catch (rpcError: any) {
      console.warn('RPC update_service_atomic failed, falling back to direct update:', rpcError?.code || rpcError?.message, rpcError);

      // Fallback: direct table update (include updated_at)
      const updateQuery = supabase
        .from('services')
        .update(filteredUpdates)
        .eq('id', serviceId);

      if (vendorId) updateQuery.eq('vendor_id', vendorId);

      const { data: directUpdated, error: directError } = await updateQuery.select().single();
      if (directError) {
        console.error('updateService: direct update error (no rows updated?):', directError);
        throw directError;
      }
      if (!directUpdated) {
        const msg = `updateService: direct update did not return an updated row for ${serviceId}`;
        console.error(msg);
        throw new Error(msg);
      }
      console.log('updateService: direct update succeeded for', serviceId);
    }

    // Fetch the updated service with relations
    const { data, error } = await supabase
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
      .single();

    if (error) throw error;
    console.log('updateService: fetched updated service:', { id: data?.id, title: data?.title });
    // Compare filteredUpdates to returned data for quick mismatch detection
    try {
      const mismatches: string[] = [];
      Object.keys(filteredUpdates).forEach(k => {
        try {
          const sent = filteredUpdates[k as keyof typeof filteredUpdates];
          const got = (data as any)?.[k];
          if (typeof sent === 'object') {
            if (JSON.stringify(sent) !== JSON.stringify(got)) mismatches.push(k);
          } else {
            if (String(sent) !== String(got)) mismatches.push(k);
          }
        } catch (e) {
          mismatches.push(k);
        }
      });
      if (mismatches.length > 0) {
        // Ignore updated_at mismatches caused by formatting differences
        const filteredMismatches = mismatches.filter(k => k !== 'updated_at');
        if (filteredMismatches.length > 0) {
          try {
            console.warn('updateService: mismatch between sent updates and DB for keys:', filteredMismatches, 'details:', JSON.stringify({ sent: filteredUpdates, got: data }));
          } catch (e) {
            console.warn('updateService: mismatch between sent updates and DB for keys:', filteredMismatches, { sent: filteredUpdates, got: data });
          }
          // Retry with direct update to ensure changes are applied
          try {
            console.warn('updateService: attempting direct update retry due to mismatch...');
            const directQuery = supabase.from('services').update(filteredUpdates).eq('id', serviceId);
            if (vendorId) directQuery.eq('vendor_id', vendorId);
            const { data: retryData, error: retryError } = await directQuery.select().single();
            if (retryError) {
              console.error('updateService: direct retry error:', retryError);
            } else {
              console.log('updateService: direct retry returned:', { id: retryData?.id, title: retryData?.title });
              return retryData;
            }
          } catch (retryErr) {
            console.error('updateService: error during direct retry:', retryErr);
          }
        } else {
          console.log('updateService: only timestamp mismatch (ignored)');
        }
      }
    } catch (e) {
      console.warn('updateService: error while comparing updates to DB result', e);
    }
    return data;

  } catch (error) {
    console.error('Error updating service:', error);
    throw error;
  }
}

export async function deleteService(serviceId: string, vendorId?: string) {
  console.log('deleteService called with:', { serviceId, vendorId });

  try {
    // Determine if user is admin
    let isAdmin = false;
    if (!vendorId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Unauthorized: User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Unauthorized: Profile not found');
      }

      isAdmin = profile.role === 'admin';
      if (!isAdmin) {
        throw new Error('Unauthorized: Only admins can delete services without vendor context');
      }
    }

    // Use atomic function for service deletion
    const result = await supabase.rpc('delete_service_atomic', {
      p_service_id: serviceId,
      p_vendor_id: vendorId,
      p_is_admin: isAdmin
    });

    if (result.error) throw result.error;

    if (!result.data?.success) {
      throw new Error(result.data?.error || 'Failed to delete service');
    }

    console.log('Service deleted successfully');
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
}

// Check service availability for a specific date and number of guests
export async function checkServiceAvailability(serviceId: string, serviceDate: string, guests: number): Promise<{
  available: boolean;
  available_capacity?: number;
  requested_guests?: number;
  max_capacity?: number;
  unlimited_capacity?: boolean;
  error?: string;
}> {
  try {
    const result = await supabase.rpc('check_service_availability', {
      p_service_id: serviceId,
      p_service_date: serviceDate,
      p_requested_guests: guests
    });

    if (result.error) throw result.error;

    return result.data as {
      available: boolean;
      available_capacity?: number;
      requested_guests?: number;
      max_capacity?: number;
      unlimited_capacity?: boolean;
      error?: string;
    };
  } catch (error) {
    console.error('Error checking service availability:', error);
    throw error;
  }
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

export async function getVendorServices(vendorId: string) {
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
