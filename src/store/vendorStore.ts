import { Service, Booking, Transaction, Wallet } from '../types'
import { addPendingService } from './adminStore'
import { supabase } from '../lib/supabaseClient'

const key = (vendorId: string, entity: string) => `vendor:${vendorId}:${entity}`

function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v))
}

function now() {
  return new Date().toISOString()
}

function ensureSeed(vendorId: string) {
  const services = load<Service[]>(key(vendorId, 'services'), [])
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
    const list = [s1]
    save(key(vendorId, 'services'), list)
  }
  const bookings = load<Booking[]>(key(vendorId, 'bookings'), [])
  if (bookings.length === 0) {
    const svcs = load<Service[]>(key(vendorId, 'services'), [])
    const svc = svcs[0]
    if (svc) {
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
      save(key(vendorId, 'bookings'), [b1])
    }
  }
  const txs = load<Transaction[]>(key(vendorId, 'transactions'), [])
  if (txs.length === 0) {
    const bks = load<Booking[]>(key(vendorId, 'bookings'), [])
    const booking = bks[0]
    if (booking) {
      const tx: Transaction = {
        id: `tx_${Date.now()}`,
        booking_id: booking.id,
        vendor_id: vendorId,
        amount: booking.total_amount,
        currency: booking.currency,
        transaction_type: 'payment',
        status: 'completed',
        payment_method: 'mobile_money',
        reference: `PMT_${Math.random().toString(36).slice(2,8)}`,
        created_at: now()
      }
      save(key(vendorId, 'transactions'), [tx])
    }
  }
}

export function getServices(vendorId: string): Service[] {
  ensureSeed(vendorId)
  return load<Service[]>(key(vendorId, 'services'), [])
}

function setServices(vendorId: string, services: Service[]) {
  save(key(vendorId, 'services'), services)
}

export function createService(vendorId: string, data: Omit<Service, 'id' | 'vendor_id' | 'status' | 'created_at' | 'updated_at'> & Partial<Pick<Service, 'status'>>): Service {
  const services = getServices(vendorId)
  const svc: Service = {
    id: `svc_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
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
  // Add to admin pending queue if not yet approved
  if (svc.status === 'pending') {
    addPendingService(vendorId, svc)
  }
  const list = [svc, ...services]
  setServices(vendorId, list)
  return svc
}

export function updateService(vendorId: string, id: string, updates: Partial<Service>): Service | null {
  const services = getServices(vendorId)
  const idx = services.findIndex(s => s.id === id)
  if (idx === -1) return null
  const updated: Service = { ...services[idx], ...updates, updated_at: now() }
  const list = [...services]
  list[idx] = updated
  setServices(vendorId, list)
  return updated
}

export function deleteService(vendorId: string, id: string) {
  const services = getServices(vendorId)
  const list = services.filter(s => s.id !== id)
  setServices(vendorId, list)
}

export function getBookings(vendorId: string): Booking[] {
  ensureSeed(vendorId)
  const services = getServices(vendorId)
  const byId: Record<string, Service> = Object.fromEntries(services.map(s => [s.id, s]))
  const bookings = load<Booking[]>(key(vendorId, 'bookings'), [])
  return bookings.map(b => ({ ...b, service: byId[b.service_id] || b.service }))
}

function setBookings(vendorId: string, bookings: Booking[]) {
  save(key(vendorId, 'bookings'), bookings)
}

export function createBooking(vendorId: string, data: Omit<Booking, 'id' | 'tourist_id' | 'created_at' | 'updated_at' | 'payment_status'>): Booking {
  const booking: Booking = {
    ...data,
    id: `bk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    tourist_id: 't_demo',
    payment_status: 'pending',
    created_at: now(),
    updated_at: now()
  }
  const list = [booking, ...getBookings(vendorId)]
  setBookings(vendorId, list)
  return booking
}

export function updateBookingStatus(vendorId: string, bookingId: string, status: Booking['status']) {
  const list = getBookings(vendorId)
  const idx = list.findIndex(b => b.id === bookingId)
  if (idx === -1) return
  const updated = { ...list[idx], status, updated_at: now() }
  list[idx] = updated
  setBookings(vendorId, list)
}

export function deleteBooking(vendorId: string, bookingId: string) {
  const list = getBookings(vendorId)
  const next = list.filter(b => b.id !== bookingId)
  setBookings(vendorId, next)
}

export function getTransactions(vendorId: string): Transaction[] {
  ensureSeed(vendorId)
  return load<Transaction[]>(key(vendorId, 'transactions'), [])
}

function setTransactions(vendorId: string, txs: Transaction[]) {
  save(key(vendorId, 'transactions'), txs)
}

export function addTransaction(vendorId: string, tx: Omit<Transaction, 'id' | 'vendor_id' | 'created_at'>): Transaction {
  const full: Transaction = {
    ...tx,
    id: `tx_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    vendor_id: vendorId,
    created_at: now()
  }
  const list = [full, ...getTransactions(vendorId)]
  setTransactions(vendorId, list)
  return full
}

export function updateTransactionStatus(vendorId: string, txId: string, status: Transaction['status']) {
  const list = getTransactions(vendorId)
  const idx = list.findIndex(t => t.id === txId)
  if (idx === -1) return
  const updated = { ...list[idx], status }
  list[idx] = updated
  setTransactions(vendorId, list)
}

export async function requestWithdrawal(vendorId: string, amount: number, currency: string, payout?: { id?: string; type?: string; meta?: any }): Promise<Transaction> {
  try {
    // Use atomic withdrawal processing
    const paymentMethod = payout?.type === 'bank' ? 'bank_transfer' : 'mobile_money'
    let data: any = null
    let error: any = null

    if (payout?.meta) {
      // Use the helper that accepts payout metadata so it is persisted with the transaction
      const rpcRes = await supabase.rpc('process_withdrawal_create_with_payout_meta', {
        p_vendor_id: vendorId,
        p_amount: amount,
        p_currency: currency,
        p_payment_method: paymentMethod,
        p_reference: `WD_${Math.random().toString(36).slice(2,8)}`,
        p_payout_meta: payout.meta
      });
      data = rpcRes.data
      error = rpcRes.error
    } else {
      const rpcRes = await supabase.rpc('process_withdrawal_atomic', {
        p_vendor_id: vendorId,
        p_amount: amount,
        p_currency: currency,
        p_payment_method: paymentMethod,
        p_reference: `WD_${Math.random().toString(36).slice(2,8)}`
      });
      data = rpcRes.data
      error = rpcRes.error
    }

    if (error) throw error;

    if (!data?.success) {
      throw new Error(data.error || 'Failed to process withdrawal');
    }

    // Return a transaction object for compatibility
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
    };
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    throw error;
  }
}

export function getWallet(vendorId: string): Wallet {
  ensureSeed(vendorId)
  const txs = getTransactions(vendorId)
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
  save(key(vendorId, 'wallet'), wallet)
  return wallet
}

export function getWalletStats(vendorId: string) {
  const txs = getTransactions(vendorId)
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
}
