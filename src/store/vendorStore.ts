import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Service, Booking, Transaction, Wallet } from '../types'
import { supabase } from '../lib/supabaseClient'

// Helper to generate current timestamp
function now() {
  return new Date().toISOString()
}

// Vendor-specific state
interface VendorData {
  services: Service[]
  bookings: Booking[]
  transactions: Transaction[]
  wallet: Wallet | null
  seeded: boolean
}

interface VendorStore {
  vendors: Record<string, VendorData>

  // Services
  getServices: (vendorId: string) => Service[]
  createService: (vendorId: string, data: Omit<Service, 'id' | 'vendor_id' | 'status' | 'created_at' | 'updated_at'> & Partial<Pick<Service, 'status'>>) => Service
  updateService: (vendorId: string, id: string, updates: Partial<Service>) => Service | null
  deleteService: (vendorId: string, id: string) => void

  // Bookings
  getBookings: (vendorId: string) => Booking[]
  createBooking: (vendorId: string, data: Omit<Booking, 'id' | 'tourist_id' | 'created_at' | 'updated_at' | 'payment_status'>) => Booking
  updateBookingStatus: (vendorId: string, bookingId: string, status: Booking['status']) => void
  deleteBooking: (vendorId: string, bookingId: string) => void

  // Transactions
  getTransactions: (vendorId: string) => Transaction[]
  addTransaction: (vendorId: string, tx: Omit<Transaction, 'id' | 'vendor_id' | 'created_at'>) => Transaction
  updateTransactionStatus: (vendorId: string, txId: string, status: Transaction['status']) => void
  requestWithdrawal: (vendorId: string, amount: number, currency: string) => Promise<Transaction>

  // Wallet
  getWallet: (vendorId: string) => Wallet
  getWalletStats: (vendorId: string) => any

  // Custom Fields
  updateServiceCustomFields: (vendorId: string, serviceId: string, customFields: Record<string, any>) => Service | null

  // Internal helpers
  ensureSeed: (vendorId: string) => void
  getVendorData: (vendorId: string) => VendorData
}

const createEmptyVendorData = (): VendorData => ({
  services: [],
  bookings: [],
  transactions: [],
  wallet: null,
  seeded: false,
})

export const useVendorStore = create<VendorStore>()(
  persist(
    (set, get) => ({
      vendors: {},

      getVendorData: (vendorId: string): VendorData => {
        const vendors = get().vendors
        if (!vendors[vendorId]) {
          set({ vendors: { ...vendors, [vendorId]: createEmptyVendorData() } })
          return createEmptyVendorData()
        }
        return vendors[vendorId]
      },

      ensureSeed: (vendorId: string) => {
        const vendorData = get().getVendorData(vendorId)
        if (vendorData.seeded) return

        const vendors = get().vendors
        const services = vendorData.services

        if (services.length === 0) {
          const s1: Service = {
            id: `s_${Date.now()}`,
            vendor_id: vendorId,
            title: 'Sample Tour Package',
            description: 'Guided experience showcasing local highlights.',
            category_id: 'cat_tour',
            price: 120000,
            currency: 'UGX',
            images: ['https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg'],
            amenities: [],
            status: 'approved',
            created_at: now(),
            updated_at: now()
          }
          vendorData.services = [s1]
        }

        if (vendorData.bookings.length === 0 && vendorData.services.length > 0) {
          const svc = vendorData.services[0]
          const b1: Booking = {
            id: `b_${Date.now()}`,
            service_id: svc.id,
            tourist_id: 't_demo',
            vendor_id: vendorId,
            booking_date: now(),
            service_date: now(),
            guests: 2,
            total_amount: svc.price * 2,
            currency: svc.currency,
            status: 'confirmed',
            payment_status: 'paid',
            created_at: now(),
            updated_at: now(),
            service: svc
          }
          vendorData.bookings = [b1]
        }

        if (vendorData.transactions.length === 0 && vendorData.bookings.length > 0) {
          const booking = vendorData.bookings[0]
          const tx: Transaction = {
            id: `tx_${Date.now()}`,
            booking_id: booking.id,
            vendor_id: vendorId,
            amount: booking.total_amount,
            currency: booking.currency,
            transaction_type: 'payment',
            status: 'completed',
            payment_method: 'mobile_money',
            reference: `PMT_${Math.random().toString(36).slice(2, 8)}`,
            created_at: now()
          }
          vendorData.transactions = [tx]
        }

        vendorData.seeded = true
        set({ vendors: { ...vendors, [vendorId]: vendorData } })
      },

      // Services
      getServices: (vendorId: string) => {
        get().ensureSeed(vendorId)
        return get().getVendorData(vendorId).services
      },

      createService: (vendorId: string, data) => {
        const services = get().getServices(vendorId)
        const svc: Service = {
          id: `svc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          vendor_id: vendorId,
          title: data.title,
          description: data.description,
          category_id: data.category_id,
          price: data.price,
          currency: data.currency,
          images: data.images || [],
          amenities: data.amenities || [],
          status: data.status || 'pending',
          created_at: now(),
          updated_at: now()
        }

        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.services = [svc, ...services]
        set({ vendors: { ...vendors, [vendorId]: vendorData } })

        // Add to admin pending queue if not yet approved
        if (svc.status === 'pending') {
          // Import dynamically to avoid circular dependency
          import('./adminStore').then(({ addPendingService }) => {
            addPendingService(vendorId, svc)
          })
        }

        return svc
      },

      updateService: (vendorId: string, id: string, updates) => {
        const services = get().getServices(vendorId)
        const idx = services.findIndex(s => s.id === id)
        if (idx === -1) return null

        const updated: Service = { ...services[idx], ...updates, updated_at: now() }
        const list = [...services]
        list[idx] = updated

        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.services = list
        set({ vendors: { ...vendors, [vendorId]: vendorData } })

        return updated
      },

      deleteService: (vendorId: string, id: string) => {
        const services = get().getServices(vendorId)
        const list = services.filter(s => s.id !== id)

        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.services = list
        set({ vendors: { ...vendors, [vendorId]: vendorData } })
      },

      // Bookings
      getBookings: (vendorId: string) => {
        get().ensureSeed(vendorId)
        const vendorData = get().getVendorData(vendorId)
        const services = vendorData.services
        const byId: Record<string, Service> = Object.fromEntries(services.map(s => [s.id, s]))
        return vendorData.bookings.map(b => ({ ...b, service: byId[b.service_id] || b.service }))
      },

      createBooking: (vendorId: string, data) => {
        const booking: Booking = {
          ...data,
          id: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          tourist_id: 't_demo',
          payment_status: 'pending',
          created_at: now(),
          updated_at: now()
        }

        const bookings = get().getBookings(vendorId)
        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.bookings = [booking, ...bookings]
        set({ vendors: { ...vendors, [vendorId]: vendorData } })

        return booking
      },

      updateBookingStatus: (vendorId: string, bookingId: string, status: Booking['status']) => {
        const list = get().getBookings(vendorId)
        const idx = list.findIndex(b => b.id === bookingId)
        if (idx === -1) return

        const updated = { ...list[idx], status, updated_at: now() }
        list[idx] = updated

        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.bookings = list
        set({ vendors: { ...vendors, [vendorId]: vendorData } })
      },

      deleteBooking: (vendorId: string, bookingId: string) => {
        const list = get().getBookings(vendorId)
        const next = list.filter(b => b.id !== bookingId)

        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.bookings = next
        set({ vendors: { ...vendors, [vendorId]: vendorData } })
      },

      // Transactions
      getTransactions: (vendorId: string) => {
        get().ensureSeed(vendorId)
        return get().getVendorData(vendorId).transactions
      },

      addTransaction: (vendorId: string, tx) => {
        const full: Transaction = {
          ...tx,
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          vendor_id: vendorId,
          created_at: now()
        }

        const list = get().getTransactions(vendorId)
        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.transactions = [full, ...list]
        set({ vendors: { ...vendors, [vendorId]: vendorData } })

        return full
      },

      updateTransactionStatus: (vendorId: string, txId: string, status: Transaction['status']) => {
        const list = get().getTransactions(vendorId)
        const idx = list.findIndex(t => t.id === txId)
        if (idx === -1) return

        const updated = { ...list[idx], status }
        list[idx] = updated

        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.transactions = list
        set({ vendors: { ...vendors, [vendorId]: vendorData } })
      },

      requestWithdrawal: async (vendorId: string, amount: number, currency: string) => {
        try {
          const { data, error } = await supabase.rpc('process_withdrawal_atomic', {
            p_vendor_id: vendorId,
            p_amount: amount,
            p_currency: currency,
            p_payment_method: 'mobile_money',
            p_reference: `WD_${Math.random().toString(36).slice(2, 8)}`
          })

          if (error) throw error

          if (!data?.success) {
            throw new Error(data.error || 'Failed to process withdrawal')
          }

          return {
            id: data.transaction_id,
            booking_id: undefined,
            vendor_id: vendorId,
            tourist_id: undefined,
            amount,
            currency,
            transaction_type: 'withdrawal',
            status: 'completed',
            payment_method: 'mobile_money',
            reference: data.reference,
            created_at: new Date().toISOString()
          }
        } catch (error) {
          console.error('Error processing withdrawal:', error)
          throw error
        }
      },

      // Wallet
      getWallet: (vendorId: string) => {
        get().ensureSeed(vendorId)
        const txs = get().getTransactions(vendorId)
        const payments = txs.filter(t => t.transaction_type === 'payment' && t.status === 'completed').reduce((s, t) => s + t.amount, 0)
        const withdrawals = txs.filter(t => t.transaction_type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + t.amount, 0)
        const currency = txs[0]?.currency || 'UGX'
        const balance = payments - withdrawals

        const wallet: Wallet = {
          id: `w_${vendorId}`,
          vendor_id: vendorId,
          balance,
          currency,
          created_at: now(),
          updated_at: now()
        }

        return wallet
      },

      getWalletStats: (vendorId: string) => {
        const txs = get().getTransactions(vendorId)
        const payments = txs.filter(t => t.transaction_type === 'payment' && t.status === 'completed')
        const withdrawals = txs.filter(t => t.transaction_type === 'withdrawal')

        const totalEarned = payments.reduce((s, t) => s + t.amount, 0)
        const totalWithdrawn = withdrawals.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0)
        const pendingWithdrawals = withdrawals.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)
        const currentBalance = totalEarned - totalWithdrawn
        const currency = txs[0]?.currency || 'UGX'

        return {
          totalEarned,
          totalWithdrawn,
          pendingWithdrawals,
          currentBalance,
          currency,
          totalTransactions: txs.length,
          completedPayments: payments.length,
          completedWithdrawals: withdrawals.filter(t => t.status === 'completed').length,
          pendingWithdrawalsCount: withdrawals.filter(t => t.status === 'pending').length
        }
      },

      // Custom Fields
      updateServiceCustomFields: (vendorId: string, serviceId: string, customFields: Record<string, any>) => {
        const services = get().getServices(vendorId)
        const idx = services.findIndex(s => s.id === serviceId)
        if (idx === -1) return null

        const updated: Service = {
          ...services[idx],
          custom_fields: customFields,
          updated_at: now()
        }
        const list = [...services]
        list[idx] = updated

        const vendors = get().vendors
        const vendorData = get().getVendorData(vendorId)
        vendorData.services = list
        set({ vendors: { ...vendors, [vendorId]: vendorData } })

        return updated
      },
    }),
    {
      name: 'vendor-storage',
    }
  )
)

// Export legacy functions for backward compatibility during migration
export function getServices(vendorId: string): Service[] {
  return useVendorStore.getState().getServices(vendorId)
}

export function createService(vendorId: string, data: Omit<Service, 'id' | 'vendor_id' | 'status' | 'created_at' | 'updated_at'> & Partial<Pick<Service, 'status'>>): Service {
  return useVendorStore.getState().createService(vendorId, data)
}

export function updateService(vendorId: string, id: string, updates: Partial<Service>): Service | null {
  return useVendorStore.getState().updateService(vendorId, id, updates)
}

export function deleteService(vendorId: string, id: string) {
  useVendorStore.getState().deleteService(vendorId, id)
}

export function getBookings(vendorId: string): Booking[] {
  return useVendorStore.getState().getBookings(vendorId)
}

export function createBooking(vendorId: string, data: Omit<Booking, 'id' | 'tourist_id' | 'created_at' | 'updated_at' | 'payment_status'>): Booking {
  return useVendorStore.getState().createBooking(vendorId, data)
}

export function updateBookingStatus(vendorId: string, bookingId: string, status: Booking['status']) {
  useVendorStore.getState().updateBookingStatus(vendorId, bookingId, status)
}

export function deleteBooking(vendorId: string, bookingId: string) {
  useVendorStore.getState().deleteBooking(vendorId, bookingId)
}

export function getTransactions(vendorId: string): Transaction[] {
  return useVendorStore.getState().getTransactions(vendorId)
}

export function addTransaction(vendorId: string, tx: Omit<Transaction, 'id' | 'vendor_id' | 'created_at'>): Transaction {
  return useVendorStore.getState().addTransaction(vendorId, tx)
}

export function updateTransactionStatus(vendorId: string, txId: string, status: Transaction['status']) {
  useVendorStore.getState().updateTransactionStatus(vendorId, txId, status)
}

export async function requestWithdrawal(vendorId: string, amount: number, currency: string): Promise<Transaction> {
  return useVendorStore.getState().requestWithdrawal(vendorId, amount, currency)
}

export function getWallet(vendorId: string): Wallet {
  return useVendorStore.getState().getWallet(vendorId)
}

export function getWalletStats(vendorId: string) {
  return useVendorStore.getState().getWalletStats(vendorId)
}
