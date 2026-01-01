export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          avatar_url: string | null
          role: 'tourist' | 'vendor' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          role?: 'tourist' | 'vendor' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          role?: 'tourist' | 'vendor' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          user_id: string
          business_name: string
          business_description: string | null
          business_address: string | null
          business_phone: string | null
          business_email: string
          business_license: string | null
          tax_id: string | null
          status: 'pending' | 'approved' | 'rejected' | 'suspended'
          approved_at: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          business_description?: string | null
          business_address?: string | null
          business_phone?: string | null
          business_email: string
          business_license?: string | null
          tax_id?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          business_description?: string | null
          business_address?: string | null
          business_phone?: string | null
          business_email?: string
          business_license?: string | null
          tax_id?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      service_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          vendor_id: string
          category_id: string
          title: string
          description: string
          price: number
          currency: string
          images: string[]
          location: string | null
          duration_hours: number | null
          max_capacity: number | null
          amenities: string[]
          status: 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive'
          approved_at: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          category_id: string
          title: string
          description: string
          price: number
          currency: string
          images: string[]
          location?: string | null
          duration_hours?: number | null
          max_capacity?: number | null
          amenities: string[]
          status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive'
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          category_id?: string
          title?: string
          description?: string
          price?: number
          currency?: string
          images?: string[]
          location?: string | null
          duration_hours?: number | null
          max_capacity?: number | null
          amenities?: string[]
          status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive'
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          service_id: string
          tourist_id: string
          vendor_id: string
          booking_date: string
          booking_time: string | null
          guests: number
          total_amount: number
          currency: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          special_requests: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          tourist_id: string
          vendor_id: string
          booking_date: string
          booking_time?: string | null
          guests: number
          total_amount: number
          currency: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          special_requests?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          tourist_id?: string
          vendor_id?: string
          booking_date?: string
          booking_time?: string | null
          guests?: number
          total_amount?: number
          currency?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          special_requests?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      wallets: {
        Row: {
          id: string
          vendor_id: string
          balance: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          balance?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          balance?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          wallet_id: string
          booking_id: string | null
          type: 'payment' | 'withdrawal' | 'refund'
          amount: number
          currency: string
          status: 'pending' | 'completed' | 'failed'
          reference: string | null
          description: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_id: string
          booking_id?: string | null
          type: 'payment' | 'withdrawal' | 'refund'
          amount: number
          currency: string
          status?: 'pending' | 'completed' | 'failed'
          reference?: string | null
          description?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_id?: string
          booking_id?: string | null
          type?: 'payment' | 'withdrawal' | 'refund'
          amount?: number
          currency?: string
          status?: 'pending' | 'completed' | 'failed'
          reference?: string | null
          description?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}