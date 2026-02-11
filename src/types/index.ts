export interface User {
  id: string;
  email: string;
  user_type: 'tourist' | 'vendor' | 'admin';
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  profile_picture?: string;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  user_id: string;
  business_name: string;
  business_type: 'hotel' | 'transport' | 'guide' | 'restaurant' | 'tour_package';
  description: string;
  location: string;
  contact_phone: string;
  contact_email: string;
  business_license?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user_profile?: UserProfile;
}

export interface Service {
  id: string
  slug?: string
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
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive'
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
  property_type?: string
  wifi_available?: boolean
  minimum_stay?: number
  maximum_guests?: number
  common_facilities?: string[]
  generator_backup?: boolean
  smoking_allowed?: boolean
  children_allowed?: boolean
  disabled_access?: boolean
  concierge_service?: boolean
  house_rules?: string[]
  local_recommendations?: string[]
  check_in_process?: string

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
  accommodation_included?: boolean

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
  license_required?: string
  booking_notice_hours?: number
  usb_charging?: boolean
  child_seat?: boolean
  roof_rack?: boolean
  towing_capacity?: boolean
  four_wheel_drive?: boolean
  automatic_transmission?: boolean
  transport_terms?: string

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
  price_range?: string
  advance_booking_days?: number
  dress_code?: string
  menu_highlights?: string[]
  restaurant_atmosphere?: string
  restaurant_notes?: string

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

  // Activity/Event-specific fields
  event_status?: string
  ticket_price?: number
  early_bird_price?: number
  // Internal ticketing flag and ticket types stored for events
  internal_ticketing?: boolean
  ticket_types?: any[]
  ticket_purchase_link?: string
  event_location?: string
  event_highlights?: string[]
  event_inclusions?: string[]
  event_prerequisites?: string[]
  meals_provided?: boolean

  // Rental-specific fields
  rental_items?: string[]
  rental_duration?: string
  deposit_required?: number
  insurance_required?: boolean
  delivery_available?: boolean
  maintenance_included?: boolean
  replacement_value?: number
  delivery_radius?: number
  usage_instructions?: string[]
  maintenance_requirements?: string[]
  training_provided?: boolean
  cleaning_included?: boolean
  repair_service?: boolean
  equipment_condition?: string
  rental_terms?: string

  // Event-specific fields
  event_type?: string
  event_date?: string
  event_duration_hours?: number
  max_participants?: number
  materials_included?: string[]
  prerequisites?: string[]
  event_datetime?: string
  registration_deadline?: string
  learning_outcomes?: string[]
  instructor_credentials?: string
  certificates_provided?: boolean
  refreshments_included?: boolean
  take_home_materials?: boolean
  photography_allowed?: boolean
  recording_allowed?: boolean
  group_discounts?: boolean
  event_description?: string
  event_cancellation_policy?: string
  // Whether the event scan/link is enabled by an admin. When false the scan link is inactive.
  scan_enabled?: boolean

  // Agency-specific fields
  services_offered?: string[]
  destinations_covered?: string[]
  booking_fee?: number
  customization_available?: boolean
  emergency_support?: boolean
  iata_number?: string
  specializations?: string[]
  success_stories?: string[]
  insurance_brokerage?: boolean
  visa_assistance?: boolean
  group_bookings?: boolean
  corporate_accounts?: boolean
  agency_description?: string

  // Flight-specific fields
  flight_number?: string
  airline?: string
  aircraft_type?: string
  departure_city?: string
  arrival_city?: string
  departure_airport?: string
  arrival_airport?: string
  departure_time?: string
  arrival_time?: string
  duration_minutes?: number
  economy_price?: number
  business_price?: number
  first_class_price?: number
  total_seats?: number
  available_seats?: number
  flight_class?: string
  flight_status?: string
  baggage_allowance?: string
  flight_amenities?: string[]
  flexible_booking?: boolean
  lounge_access?: boolean
  priority_boarding?: boolean
  flight_meals_included?: boolean
  flight_notes?: string

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
  refund_policy?: boolean

  // Shop-specific fields
  shop_type?: string
  store_size?: number
  opening_time?: string
  closing_time?: string
  products_offered?: string[]
  in_store_pickup?: boolean
  online_orders?: boolean
  minimum_order_value?: number
  delivery_fee?: number
  shop_policies?: string
  shop_notes?: string

  vendors?: {
    id: string;
    business_name: string;
    business_description?: string;
    business_email: string;
    status: string;
  };
  service_categories?: {
    id: string;
    name: string;
    icon?: string;
  };
}

export interface Booking {
  id: string;
  service_id: string;
  tourist_id?: string; // Made optional for guest bookings
  vendor_id: string; // Added missing vendor_id field
  booking_date: string;
  service_date?: string;
  guests: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded';
  special_requests?: string;
  created_at: string;
  updated_at: string;
  service?: Service;
  services?: { title: string }; // Added for Supabase joins
  tourist_profile?: UserProfile;
  profiles?: { full_name: string }; // Added for Supabase joins
  // Guest booking fields
  is_guest_booking?: boolean;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  // Transport-specific fields
  pickup_location?: string;
  dropoff_location?: string;
  driver_option?: string;
  return_trip?: boolean;
  start_time?: string;
  end_time?: string;
  end_date?: string;
}

export interface Transaction {
  id: string;
  booking_id?: string;
  vendor_id?: string;
  tourist_id?: string;
  amount: number;
  currency: string;
  transaction_type: 'payment' | 'withdrawal' | 'refund';
  status: 'pending' | 'approved' | 'completed' | 'failed' | 'rejected';
  payment_method: 'card' | 'mobile_money' | 'bank_transfer';
  reference: string;
  receipt_url?: string;
  payment_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
  vendors?: {
    business_name: string;
    user_id: string;
  };
}

export interface Wallet {
  id: string;
  vendor_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Flight {
  id: string;
  flight_number: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  aircraft_type?: string;
  economy_price: number;
  business_price?: number;
  first_class_price?: number;
  currency: string;
  total_seats: number;
  available_seats: number;
  status: 'active' | 'cancelled' | 'delayed' | 'completed';
  flight_class: 'economy' | 'business' | 'first_class';
  amenities: string[];
  baggage_allowance?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  // Region/currency/language are stored in the DB (see db/004_user_preferences.sql)
  region?: string;
  currency: string;
  language: string;
  // Legacy/optional notification fields (not present in current DB schema)
  email_bookings?: boolean;
  email_promotions?: boolean;
  push_bookings?: boolean;
  push_promotions?: boolean;
  // Optional timezone kept for compatibility with older UI
  timezone?: string;
  created_at: string;
  updated_at: string;
}