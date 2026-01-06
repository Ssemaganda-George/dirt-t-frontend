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
  tourist_id: string;
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
  tourist_profile?: UserProfile;
}

export interface Transaction {
  id: string;
  booking_id?: string;
  vendor_id?: string;
  tourist_id?: string;
  amount: number;
  currency: string;
  transaction_type: 'payment' | 'withdrawal' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  payment_method: 'card' | 'mobile_money' | 'bank_transfer';
  reference: string;
  created_at: string;
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