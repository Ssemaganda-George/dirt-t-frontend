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

// Database service functions
import { supabase } from '@/lib/supabase'

// Profile operations
export const profileService = {
  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async create(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Vendor operations
export const vendorService = {
  async getById(id: string): Promise<Vendor & { profiles?: Profile } | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*, profiles(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getByUserId(userId: string): Promise<Vendor & { profiles?: Profile } | null> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*, profiles(*)')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  },

  async getAll(): Promise<(Vendor & { profiles?: Profile })[]> {
    const { data, error } = await supabase
      .from('vendors')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async create(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at' | 'profiles'>): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        ...vendor,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Vendor>): Promise<Vendor> {
    const { data, error } = await supabase
      .from('vendors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Service Category operations
export const serviceCategoryService = {
  async getAll(): Promise<ServiceCategory[]> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<ServiceCategory | null> {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }
}

// Service operations
export const serviceService = {
  async getAll(): Promise<(Service & { vendors?: Vendor & { profiles?: Profile }; service_categories?: ServiceCategory })[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*, vendors(*, profiles(*)), service_categories(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Service & { vendors?: Vendor & { profiles?: Profile }; service_categories?: ServiceCategory } | null> {
    const { data, error } = await supabase
      .from('services')
      .select('*, vendors(*, profiles(*)), service_categories(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getByVendorId(vendorId: string): Promise<(Service & { service_categories?: ServiceCategory })[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*, service_categories(*)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getPending(): Promise<(Service & { vendors?: Vendor & { profiles?: Profile }; service_categories?: ServiceCategory })[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*, vendors(*, profiles(*)), service_categories(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async create(service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'vendors' | 'service_categories'>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .insert({
        ...service,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Service>): Promise<Service> {
    const { data, error } = await supabase
      .from('services')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

// Booking operations
export const bookingService = {
  async getAll(): Promise<(Booking & { services?: Service & { service_categories?: ServiceCategory }; profiles?: Profile })[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(*, service_categories(*)), profiles(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Booking & { services?: Service & { service_categories?: ServiceCategory }; profiles?: Profile } | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(*, service_categories(*)), profiles(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getByVendorId(vendorId: string): Promise<(Booking & { services?: Service; profiles?: Profile })[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(*), profiles(*)')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getByTouristId(touristId: string): Promise<(Booking & { services?: Service & { service_categories?: ServiceCategory }; vendors?: Vendor & { profiles?: Profile } })[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(*, service_categories(*)), vendors(*, profiles(*))')
      .eq('tourist_id', touristId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async create(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'services' | 'profiles'>): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...booking,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Booking>): Promise<Booking> {
    const { data, error } = await supabase
      .from('bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Wallet operations
export const walletService = {
  async getByVendorId(vendorId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('vendor_id', vendorId)
      .single()

    if (error) throw error
    return data
  },

  async create(wallet: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        ...wallet,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateBalance(id: string, newBalance: number): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Transaction operations
export const transactionService = {
  async getByWalletId(walletId: string): Promise<(Transaction & { bookings?: Booking })[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, bookings(*)')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async create(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'bookings'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...transaction,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}