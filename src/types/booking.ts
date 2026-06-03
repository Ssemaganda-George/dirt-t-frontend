import type { Service } from './service';
import type { UserProfile } from './auth';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  service_id: string;
  tourist_id?: string;
  vendor_id: string;
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
  services?: {
    title: string;
    images?: string[];
    location?: string;
    service_categories?: { name: string };
  };
  tourist_profile?: UserProfile;
  profiles?: { full_name: string };
  is_guest_booking?: boolean;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  pickup_location?: string;
  dropoff_location?: string;
  driver_option?: string;
  return_trip?: boolean;
  start_time?: string;
  end_time?: string;
  end_date?: string;
  commission_rate_at_booking?: number;
  commission_amount?: number | null;
  vendor_payout_amount?: number;
  platform_fee?: number | null;
}
