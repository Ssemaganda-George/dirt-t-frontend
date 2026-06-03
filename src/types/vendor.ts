import type { Profile } from './auth';

export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface VendorTier {
  id: string;
  name: string;
  commission_rate: number;
  commission_type?: 'percentage' | 'flat';
  commission_value?: number;
  min_monthly_bookings: number;
  min_rating?: number;
  priority_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  user_id: string;
  // Name fields (from profiles join or direct)
  first_name?: string;
  last_name?: string;
  business_name: string;
  business_description?: string;
  business_address?: string;
  business_city?: string;
  business_phone?: string;
  business_phones?: string[];
  business_email?: string;
  business_website?: string;
  business_type?: string;
  business_license?: string;
  operating_hours?: string;
  years_in_business?: string;
  tax_id?: string;
  // Legacy UI fields
  description?: string;
  location?: string;
  contact_phone?: string;
  contact_email?: string;
  status: VendorStatus;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  // Join shapes
  profiles?: Profile;
  user_profile?: any;
  service?: any;
  // Tier and commission
  current_tier_id?: string;
  current_commission_rate?: number;
  average_rating?: number;
  monthly_booking_count?: number;
  lifetime_booking_count?: number;
  last_tier_evaluated_at?: string;
  current_tier?: VendorTier;
  manual_tier_id?: string;
  manual_tier_assigned_at?: string;
  manual_tier_expires_at?: string;
  manual_tier_reason?: string;
  manual_tier?: VendorTier;
  // Payout fields
  bank_details?: {
    name?: string;
    account_name?: string;
    account_number?: string;
    branch?: string;
    swift?: string;
    [key: string]: any;
  };
  mobile_money_accounts?: Array<{
    provider?: string;
    phone?: string;
    country_code?: string;
    name?: string;
    [key: string]: any;
  }>;
  crypto_accounts?: Array<{
    currency?: string;
    address?: string;
    label?: string;
    [key: string]: any;
  }>;
  preferred_payout?: string;
}
