// Database types
export type UserRole = 'tourist' | 'vendor' | 'admin'
export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ServiceStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type TransactionType = 'payment' | 'withdrawal' | 'refund'
export type TransactionStatus = 'pending' | 'completed' | 'failed'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  user_id: string
  business_name: string
  business_description?: string
  business_address?: string
  business_phone?: string
  business_email?: string
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
  vendors?: Vendor
  service_categories?: ServiceCategory
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