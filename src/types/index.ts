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
  id: string;
  vendor_id: string;
  name: string;
  description: string;
  category: 'hotel' | 'transport' | 'guide' | 'restaurant' | 'tour_package';
  price: number;
  currency: string;
  images?: string[];
  availability_status: 'available' | 'unavailable';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
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