// Union type aliases used across the codebase
export type UserRole = 'tourist' | 'vendor' | 'admin';
export type UserStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  email: string;
  user_type: 'tourist' | 'vendor' | 'admin';
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  phone_country_code?: string;
  avatar_url?: string;
  role: UserRole;
  status?: UserStatus;
  home_city?: string;
  home_country?: string;
  created_at: string;
  updated_at: string;
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

export interface Tourist {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
  tourist_home_city?: string;
  tourist_home_country?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  emergency_country_code?: string;
  emergency_relationship?: string;
  emergency_email?: string;
  emergency_address?: string;
  travel_preferences?: string;
  dietary_restrictions?: string;
  medical_conditions?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  region?: string;
  currency: string;
  language: string;
  email_bookings?: boolean;
  email_promotions?: boolean;
  push_bookings?: boolean;
  push_promotions?: boolean;
  timezone?: string;
  created_at: string;
  updated_at: string;
}
