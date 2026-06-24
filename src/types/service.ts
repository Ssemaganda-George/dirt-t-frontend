export type ServiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive';

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
}

export interface Service {
  id: string;
  slug?: string;
  vendor_id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  primary_image_url?: string;
  location?: string;
  duration_hours?: number;
  max_capacity?: number;
  amenities: string[];
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive';
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  type?: 'experience' | 'buy' | 'hire';
  listing_type?: 'experience' | 'buy' | 'hire';
  buy_price?: number;
  rental_price_per_day?: number;

  // General
  duration_days?: number;
  group_size_min?: number;
  group_size_max?: number;
  best_time_to_visit?: string;
  what_to_bring?: string[];
  age_restrictions?: string;
  health_requirements?: string;
  accessibility_features?: string[];
  sustainability_certified?: boolean;
  eco_friendly?: boolean;
  service_location?: string;
  service_lat?: number;
  service_lon?: number;
  event_lat?: number;
  event_lon?: number;

  // Hotel
  room_types?: string[];
  check_in_time?: string;
  check_out_time?: string;
  star_rating?: number;
  facilities?: string[];
  total_rooms?: number;
  room_amenities?: string[];
  nearby_attractions?: string[];
  parking_available?: boolean;
  pet_friendly?: boolean;
  breakfast_included?: boolean;
  property_type?: string;
  wifi_available?: boolean;
  minimum_stay?: number;
  maximum_guests?: number;
  common_facilities?: string[];
  generator_backup?: boolean;
  smoking_allowed?: boolean;
  children_allowed?: boolean;
  disabled_access?: boolean;
  concierge_service?: boolean;
  house_rules?: string[];
  local_recommendations?: string[];
  check_in_process?: string;

  // Tour
  tour_style?: string;
  group_type?: string;
  accommodation_standard?: string;
  park_fees_included?: boolean;
  visa_support?: boolean;
  child_friendly?: boolean;
  itinerary?: string[];
  included_items?: string[];
  excluded_items?: string[];
  difficulty_level?: 'easy' | 'moderate' | 'challenging' | 'difficult';
  minimum_age?: number;
  languages_offered?: string[];
  tour_highlights?: string[];
  meeting_point?: string;
  end_point?: string;
  transportation_included?: boolean;
  meals_included?: string[];
  guide_included?: boolean;
  accommodation_included?: boolean;

  // Transport
  vehicle_type?: string;
  vehicle_capacity?: number;
  pickup_locations?: string[];
  dropoff_locations?: string[];
  route_description?: string;
  driver_included?: boolean;
  price_within_town?: number;
  price_upcountry?: number;
  vehicle_engine?: string;
  vehicle_ccs?: number;
  fuel_type?: string;
  fuel_consumption_per_100km?: number;
  fuel_km_per_liter?: number;
  vehicle_features?: string[];
  air_conditioning?: boolean;
  gps_tracking?: boolean;
  fuel_included?: boolean;
  tolls_included?: boolean;
  insurance_included?: boolean;
  license_required?: string;
  booking_notice_hours?: number;
  usb_charging?: boolean;
  child_seat?: boolean;
  roof_rack?: boolean;
  towing_capacity?: boolean;
  four_wheel_drive?: boolean;
  automatic_transmission?: boolean;
  transport_terms?: string;

  // Restaurant
  cuisine_type?: string;
  opening_hours?: { [key: string]: string };
  menu_items?: string[];
  dietary_options?: string[];
  average_cost_per_person?: number;
  reservations_required?: boolean;
  outdoor_seating?: boolean;
  live_music?: boolean;
  private_dining?: boolean;
  alcohol_served?: boolean;
  price_range?: string;
  advance_booking_days?: number;
  dress_code?: string;
  menu_highlights?: string[];
  restaurant_atmosphere?: string;
  restaurant_notes?: string;

  // Guide
  languages_spoken?: string[];
  specialties?: string[];
  certifications?: string[];
  years_experience?: number;
  service_area?: string;
  license_number?: string;
  emergency_contact?: string;
  first_aid_certified?: boolean;
  vehicle_owned?: boolean;

  // Activity / Event
  event_status?: string;
  ticket_price?: number;
  early_bird_price?: number;
  internal_ticketing?: boolean;
  ticket_types?: any[];
  ticket_purchase_link?: string;
  event_location?: string;
  event_highlights?: string[];
  event_inclusions?: string[];
  event_prerequisites?: string[];
  meals_provided?: boolean;
  event_type?: string;
  event_date?: string;
  event_duration_hours?: number;
  max_participants?: number;
  materials_included?: string[];
  prerequisites?: string[];
  event_datetime?: string;
  registration_deadline?: string;
  learning_outcomes?: string[];
  instructor_credentials?: string;
  certificates_provided?: boolean;
  refreshments_included?: boolean;
  take_home_materials?: boolean;
  photography_allowed?: boolean;
  recording_allowed?: boolean;
  group_discounts?: boolean;
  event_description?: string;
  event_cancellation_policy?: string;
  scan_enabled?: boolean;

  // Rental
  rental_items?: string[];
  rental_duration?: string;
  deposit_required?: number;
  insurance_required?: boolean;
  delivery_available?: boolean;
  maintenance_included?: boolean;
  replacement_value?: number;
  delivery_radius?: number;
  usage_instructions?: string[];
  maintenance_requirements?: string[];
  training_provided?: boolean;
  cleaning_included?: boolean;
  repair_service?: boolean;
  equipment_condition?: string;
  rental_terms?: string;

  // Agency
  services_offered?: string[];
  destinations_covered?: string[];
  booking_fee?: number;
  customization_available?: boolean;
  emergency_support?: boolean;
  iata_number?: string;
  specializations?: string[];
  success_stories?: string[];
  insurance_brokerage?: boolean;
  visa_assistance?: boolean;
  group_bookings?: boolean;
  corporate_accounts?: boolean;
  agency_description?: string;

  // Flight
  flight_number?: string;
  airline?: string;
  aircraft_type?: string;
  departure_city?: string;
  arrival_city?: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_time?: string;
  arrival_time?: string;
  duration_minutes?: number;
  economy_price?: number;
  business_price?: number;
  first_class_price?: number;
  total_seats?: number;
  available_seats?: number;
  flight_class?: string;
  flight_status?: string;
  baggage_allowance?: string;
  flight_amenities?: string[];
  flexible_booking?: boolean;
  lounge_access?: boolean;
  priority_boarding?: boolean;
  flight_meals_included?: boolean;
  flight_notes?: string;

  // Shop
  shop_type?: string;
  store_size?: number;
  opening_time?: string;
  closing_time?: string;
  products_offered?: string[];
  in_store_pickup?: boolean;
  online_orders?: boolean;
  minimum_order_value?: number;
  delivery_fee?: number;
  shop_policies?: string;
  shop_notes?: string;

  // Contact & booking
  tags?: string[];
  contact_info?: { phone?: string; email?: string; website?: string };
  booking_requirements?: string;
  cancellation_policy?: string;
  website_url?: string;
  social_media?: { [key: string]: string };
  emergency_phone?: string;
  booking_deadline_hours?: number;
  payment_methods?: string[];
  refund_policy?: string;

  // Join shapes
  vendors?: {
    id: string;
    business_name: string;
    business_description?: string;
    business_email?: string;
    status: string;
  };
  service_categories?: {
    id: string;
    name: string;
    icon?: string;
  };
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

export interface ServiceDeleteRequest {
  id: string;
  service_id: string;
  vendor_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  service?: any;
  vendor?: any;
}
