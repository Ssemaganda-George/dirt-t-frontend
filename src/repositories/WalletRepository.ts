import { supabase } from '../lib/supabaseClient'
import { creditWallet } from '../lib/creditWallet'
import { formatCurrency } from '../lib/utils'
import type { Transaction, Wallet } from '../types'
import { getAdminProfileId } from './PartnerRepository'

// Re-export the type used by other modules
export type { Transaction, Wallet }

/** Booking columns joined for admin finance (platform fee + commission). */
export interface BookingFeeSnapshot {
  id: string
  total_amount?: number | string | null
  platform_fee?: number | string | null
  commission_amount?: number | string | null
  fee_payer?: string | null
}

/** Platform earnings for one booking row (fee + commission fields are mutually exclusive in practice). */
export function platformTakeFromBooking(booking: BookingFeeSnapshot | null | undefined): number {
  if (!booking) return 0
  return (Number(booking.platform_fee) || 0) + (Number(booking.commission_amount) || 0)
}

export function platformTakeFromTransaction(transaction: { bookings?: BookingFeeSnapshot | null }): number {
  return platformTakeFromBooking(transaction.bookings)
}

export async function getTransactions(vendorId: string) {
  try {
    console.log('getTransactions: Querying transactions for vendorId:', vendorId)

    // Primary path: direct transaction query. This is the most reliable source for
    // vendor-specific transaction rows, and it avoids RPC behavior discrepancies.
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })

      console.log('getTransactions: Direct query result - data length:', data?.length, 'error:', error)

      if (!error && data) {
        const bookingIds = Array.from(new Set(data.filter(tx => tx.booking_id).map(tx => tx.booking_id)))
        let bookingMap: Record<string, any> = {}

        if (bookingIds.length > 0) {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, status, payment_status, commission_amount, total_amount, vendor_payout_amount')
            .in('id', bookingIds)

          if (!bookingsError && bookingsData) {
            bookingMap = bookingsData.reduce((acc: Record<string, any>, booking: any) => {
              acc[booking.id] = booking
              return acc
            }, {})
          } else if (bookingsError) {
            console.log('getTransactions: Could not fetch related booking metadata:', bookingsError)
          }
        }

        // For payment transactions with no booking_id, look up vendor_payout directly from orders
        // orders.reference = transaction.reference (set when order is marked paid)
        // orders table has no RLS so vendors can read their own orders
        const noBookingRefs = data
          .filter((tx: any) => tx.transaction_type === 'payment' && !tx.booking_id && tx.reference)
          .map((tx: any) => tx.reference as string)
        let orderPayoutMap: Record<string, number> = {}
        if (noBookingRefs.length > 0) {
          try {
            const { data: orderRows } = await supabase
              .from('orders')
              .select('reference, vendor_payout')
              .in('reference', noBookingRefs)
              .not('vendor_payout', 'is', null)
            if (orderRows) {
              for (const o of orderRows) {
                if (o.reference && o.vendor_payout != null) {
                  orderPayoutMap[o.reference] = Number(o.vendor_payout)
                }
              }
            }
          } catch (orderLookupErr) {
            console.log('getTransactions: Order payout lookup failed (non-fatal):', orderLookupErr)
          }
        }

        const processedData = data.map((transaction: any) => {
          const enriched = {
            ...transaction,
            bookings: bookingMap[transaction.booking_id] || transaction.bookings || null
          }

          if (enriched.transaction_type === 'payment') {
            if (enriched.bookings) {
              const vendorAmount = enriched.bookings.vendor_payout_amount != null
                ? Number(enriched.bookings.vendor_payout_amount)
                : enriched.bookings.commission_amount != null
                  ? enriched.amount - Number(enriched.bookings.commission_amount)
                  : enriched.amount
              return {
                ...enriched,
                amount: vendorAmount,
                original_amount: enriched.amount,
                commission_deducted: enriched.bookings.commission_amount ?? 0
              }
            }
            // No booking — try order payout lookup
            if (enriched.reference && orderPayoutMap[enriched.reference] != null) {
              return {
                ...enriched,
                amount: orderPayoutMap[enriched.reference],
                original_amount: enriched.amount
              }
            }
          }
          return enriched
        })
        return processedData
      }

      if (error && !(error.message?.includes('permission denied') || error.message?.includes('insufficient_privilege'))) {
        throw error
      }
    } catch (directError) {
      console.log('getTransactions: Direct query failed or blocked, falling back:', directError)
    }

    // Secondary path: vendor relationship query. Useful when direct transaction access is restricted.
    try {
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select(`
          id,
          transactions (*)
        `)
        .eq('id', vendorId)
        .single()

      console.log('getTransactions: Vendor query result:', vendorData, 'error:', vendorError)

      if (!vendorError && vendorData?.transactions) {
        const data = vendorData.transactions
        const bookingIds = Array.from(new Set(data.filter((tx: any) => tx.booking_id).map((tx: any) => tx.booking_id)))
        let bookingMap: Record<string, any> = {}

        if (bookingIds.length > 0) {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('id, status, payment_status, commission_amount, total_amount, vendor_payout_amount')
            .in('id', bookingIds)

          if (!bookingsError && bookingsData) {
            bookingMap = bookingsData.reduce((acc: Record<string, any>, booking: any) => {
              acc[booking.id] = booking
              return acc
            }, {})
          } else if (bookingsError) {
            console.log('getTransactions: Could not fetch related booking metadata (vendor fallback):', bookingsError)
          }
        }

        // Order payout lookup for no-booking payment transactions
        const noBookingRefs2 = data
          .filter((tx: any) => tx.transaction_type === 'payment' && !tx.booking_id && tx.reference)
          .map((tx: any) => tx.reference as string)
        let orderPayoutMap2: Record<string, number> = {}
        if (noBookingRefs2.length > 0) {
          try {
            const { data: orderRows2 } = await supabase
              .from('orders')
              .select('reference, vendor_payout')
              .in('reference', noBookingRefs2)
              .not('vendor_payout', 'is', null)
            if (orderRows2) {
              for (const o of orderRows2) {
                if (o.reference && o.vendor_payout != null) orderPayoutMap2[o.reference] = Number(o.vendor_payout)
              }
            }
          } catch (_) { /* non-fatal */ }
        }

        const processedTransactions = data.map((transaction: any) => {
          const enriched = {
            ...transaction,
            bookings: bookingMap[transaction.booking_id] || transaction.bookings || null
          }

          if (enriched.transaction_type === 'payment') {
            if (enriched.bookings) {
              const vendorAmount = enriched.bookings.vendor_payout_amount != null
                ? Number(enriched.bookings.vendor_payout_amount)
                : enriched.bookings.commission_amount != null
                  ? enriched.amount - Number(enriched.bookings.commission_amount)
                  : enriched.amount
              return {
                ...enriched,
                amount: vendorAmount,
                original_amount: enriched.amount,
                commission_deducted: enriched.bookings.commission_amount ?? 0
              }
            }
            if (enriched.reference && orderPayoutMap2[enriched.reference] != null) {
              return { ...enriched, amount: orderPayoutMap2[enriched.reference], original_amount: enriched.amount }
            }
          }
          return enriched
        })
        return processedTransactions
      }
    } catch (vendorQueryError) {
      console.log('getTransactions: Vendor relationship query failed, falling back:', vendorQueryError)
    }

    // Final fallback: RPC function if it exists.
    try {
      const paramCandidates = ['vendor_id_param', 'vendor_id', 'p_vendor_id', 'p_vendor']
      for (const paramName of paramCandidates) {
        try {
          const params: any = {}
          params[paramName] = vendorId
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_vendor_transactions', params)

          if (!rpcError && rpcData) {
            console.log(`getTransactions: Got transactions via RPC (param=${paramName}):`, rpcData.length)
            return rpcData
          }

          if (rpcError) {
            console.log(`getTransactions: RPC attempt param=${paramName} returned error:`, rpcError)
          }
        } catch (innerErr) {
          console.log(`getTransactions: RPC attempt param=${paramName} threw:`, innerErr)
        }
      }
      console.log('getTransactions: RPC attempts exhausted or RPC not available, returning empty list')
    } catch (rpcErr) {
      console.log('getTransactions: RPC wrapper failed, returning empty list', rpcErr)
    }

    return []
  } catch (error) {
    console.error('Error in getTransactions:', error)
    return []
  }
}

export async function addTransaction(transaction: {
  booking_id?: string
  vendor_id: string
  tourist_id?: string
  amount: number
  currency: string
  transaction_type: 'payment' | 'withdrawal' | 'refund'
  status: 'pending' | 'completed' | 'failed'
  payment_method: 'card' | 'mobile_money' | 'bank_transfer'
  reference: string
  payout_meta?: any
}) {
  try {
    console.log('[Wallet Debug] addTransaction called with:', transaction);
    // Use atomic function to create transaction
    let data: any = null
    let error: any = null

    if (transaction.payout_meta) {
      // Use a helper RPC that accepts payout_meta and inserts it into transactions.payout_meta
      const rpcRes = await supabase.rpc('create_transaction_with_meta_atomic', {
        p_vendor_id: transaction.vendor_id,
        p_amount: transaction.amount,
        p_transaction_type: transaction.transaction_type,
        p_booking_id: transaction.booking_id || null,
        p_tourist_id: transaction.tourist_id || null,
        p_currency: transaction.currency || 'UGX',
        p_status: transaction.status || 'pending',
        p_payment_method: transaction.payment_method || 'card',
        p_reference: transaction.reference || null,
        p_payout_meta: transaction.payout_meta
      })
      data = rpcRes.data
      error = rpcRes.error
    } else {
      const rpcRes = await supabase.rpc('create_transaction_atomic', {
        p_vendor_id: transaction.vendor_id,
        p_amount: transaction.amount,
        p_transaction_type: transaction.transaction_type,
        p_booking_id: transaction.booking_id || null,
        p_tourist_id: transaction.tourist_id || null,
        p_currency: transaction.currency || 'UGX',
        p_status: transaction.status || 'pending',
        p_payment_method: transaction.payment_method || 'card',
        p_reference: transaction.reference || null
      })
      data = rpcRes.data
      error = rpcRes.error
    }

    // Log raw RPC response for easier debugging in browser console
    console.log('[Wallet Debug] create_transaction_atomic response:', { data, error });

    if (error) {
      // If table doesn't exist, throw a more helpful error
      if (error.message?.includes('relation "transactions" does not exist')) {
        throw new Error('Transactions table does not exist. Please run the database migrations first.')
      }
      console.error('Error adding transaction (RPC error):', JSON.stringify(error, Object.getOwnPropertyNames(error)))
      throw error
    }

    if (!data?.success) {
      console.error('Error adding transaction (RPC returned failure):', data)
      throw new Error(data.error || 'Failed to create transaction');
    }

    return data.transaction_id;
  } catch (error) {
    console.error('Error in addTransaction:', error)
    throw error
  }
}

export async function updateTransactionStatus(transactionId: string, status: 'pending' | 'approved' | 'completed' | 'failed') {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('id', transactionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating transaction status:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateTransactionStatus:', error)
    throw error
  }
}

export async function getWallet(vendorId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('vendor_id', vendorId)
    .single()

  if (error) {
    // If wallet doesn't exist, return a default one
    if (error.code === 'PGRST116') {
      return {
        id: `wallet_${vendorId}`,
        vendor_id: vendorId,
        balance: 0,
        currency: 'UGX',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any
    }
    console.error('Error fetching vendor wallet:', error)
    throw error
  }

  return data
}

export async function getVendorWallet(vendorId: string): Promise<Wallet | null> {
  return getWallet(vendorId)
}

export async function getWalletBalance(vendorId: string): Promise<number> {
  const wallet = await getWallet(vendorId)
  return wallet?.balance ?? 0
}

export async function createTransactionWithMeta(transaction: {
  booking_id?: string
  vendor_id: string
  tourist_id?: string
  amount: number
  currency: string
  transaction_type: 'payment' | 'withdrawal' | 'refund'
  status: 'pending' | 'completed' | 'failed'
  payment_method: 'card' | 'mobile_money' | 'bank_transfer'
  reference: string
  payout_meta: any
}) {
  return addTransaction(transaction)
}

export async function updateWalletBalance(vendorId: string, amount: number, currency: string): Promise<void> {
  await creditWallet(vendorId, amount, currency)
}

export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    // First get all transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }

    if (!transactions || transactions.length === 0) {
      return []
    }

    // Get vendor IDs from transactions
    const vendorIds = transactions.map(t => t.vendor_id).filter(id => id)

    if (vendorIds.length === 0) {
      return transactions
    }

    // Fetch vendor information separately
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, business_name, business_email, status')
      .in('id', vendorIds)

    if (vendorsError) {
      console.error('Error fetching vendors for transactions:', vendorsError)
      // Return transactions without vendor info rather than failing
      return transactions
    }

    // Map vendor information to transactions
    const vendorMap = new Map(vendors?.map(v => [v.id, v]) || [])

    const transactionsWithVendors = transactions.map(transaction => ({
      ...transaction,
      vendors: vendorMap.get(transaction.vendor_id) || null
    }))

    return transactionsWithVendors
  } catch (error) {
    console.error('Error in getAllTransactions:', error)
    return []
  }
}

export async function getAllTransactionsForAdmin(): Promise<(Transaction & { vendors?: any })[]> {
  try {
    // First check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      throw new Error('Access denied: Admin role required')
    }

    // First get all transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching admin transactions:', error)
      throw error
    }

    if (!transactions || transactions.length === 0) {
      return []
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const looksLikeBookingUuid = (s: unknown): s is string =>
      typeof s === 'string' && UUID_RE.test(s.trim())

    const bookingIds = [...new Set(transactions.map(t => t.booking_id).filter(Boolean).map(String))] as string[]
    let bookingMap = new Map<string, BookingFeeSnapshot>()
    const mergeBookingRows = (rows: any[] | null) => {
      for (const b of rows || []) {
        if (b?.id) bookingMap.set(String(b.id), b as BookingFeeSnapshot)
      }
    }
    if (bookingIds.length > 0) {
      const { data: bookingRows, error: bookingErr } = await supabase
        .from('bookings')
        .select('id, total_amount, platform_fee, commission_amount, fee_payer')
        .in('id', bookingIds)
      if (bookingErr) {
        console.error('Error fetching bookings for admin transactions:', bookingErr)
      } else {
        mergeBookingRows(bookingRows)
      }
    }

    // Some legacy rows store the booking id only in `reference`, not `booking_id`.
    const refOnlyIds = [
      ...new Set(
        transactions
          .filter(t => !t.booking_id && looksLikeBookingUuid(t.reference))
          .map(t => String(t.reference).trim())
          .filter(id => !bookingMap.has(id))
      )
    ]
    if (refOnlyIds.length > 0) {
      const { data: refBookingRows, error: refBookErr } = await supabase
        .from('bookings')
        .select('id, total_amount, platform_fee, commission_amount, fee_payer')
        .in('id', refOnlyIds)
      if (refBookErr) {
        console.error('Error fetching bookings by transaction reference:', refBookErr)
      } else {
        mergeBookingRows(refBookingRows)
      }
    }

    /** Ticket/order payments: MarzPay reference is on payments + transactions but booking_id is null. */
    const txRefs = [
      ...new Set(
        transactions
          .map(t => (typeof t.reference === 'string' ? t.reference.trim() : ''))
          .filter(Boolean)
      )
    ]
    let referenceToOrderFees = new Map<string, BookingFeeSnapshot>()
    if (txRefs.length > 0) {
      const { data: payRows, error: payErr } = await supabase
        .from('payments')
        .select('reference, order_id')
        .in('reference', txRefs)
        .not('order_id', 'is', null)
      if (payErr) {
        console.error('Error fetching payments for admin transaction references:', payErr)
      } else {
        const orderIdsFromPay = [...new Set((payRows || []).map((p: { order_id: string }) => p.order_id).filter(Boolean))]
        if (orderIdsFromPay.length > 0) {
          const { data: orderRows, error: ordErr } = await supabase
            .from('orders')
            .select('id, total_amount, platform_fee, fee_payer')
            .in('id', orderIdsFromPay)
          if (ordErr) {
            console.error('Error fetching orders for payment-linked transactions:', ordErr)
          } else {
            const orderById = new Map((orderRows || []).map((o: any) => [String(o.id), o]))
            for (const p of payRows || []) {
              const ref = typeof p.reference === 'string' ? p.reference.trim() : ''
              const oid = p.order_id ? String(p.order_id) : ''
              if (!ref || !oid) continue
              const o = orderById.get(oid)
              if (!o) continue
              referenceToOrderFees.set(ref, {
                id: String(o.id),
                total_amount: o.total_amount,
                platform_fee: o.platform_fee,
                commission_amount: 0,
                fee_payer: o.fee_payer ?? null
              })
            }
          }
        }
      }
    }

    const resolveBookingRow = (t: Transaction): BookingFeeSnapshot | null => {
      if (t.booking_id) {
        return bookingMap.get(String(t.booking_id)) || null
      }
      const ref = typeof t.reference === 'string' ? t.reference.trim() : ''
      if (ref && looksLikeBookingUuid(ref)) {
        const fromBooking = bookingMap.get(ref)
        if (fromBooking) return fromBooking
      }
      if (ref && referenceToOrderFees.has(ref)) {
        return referenceToOrderFees.get(ref) || null
      }
      return null
    }

    const attachBookings = (rows: (Transaction & { vendors?: any })[]) =>
      rows.map(t => ({
        ...t,
        bookings: resolveBookingRow(t)
      }))

    const vendorIds = transactions.map(t => t.vendor_id).filter(id => id)

    if (vendorIds.length === 0) {
      return attachBookings(transactions.map(t => ({ ...t, vendors: null })))
    }

    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, business_name, business_email, status')
      .in('id', vendorIds)

    if (vendorsError) {
      console.error('Error fetching vendors for admin transactions:', vendorsError)
      return attachBookings(transactions.map(t => ({ ...t, vendors: null })))
    }

    const vendorMap = new Map(vendors?.map(v => [v.id, v]) || [])

    const transactionsWithVendors = transactions.map(transaction => ({
      ...transaction,
      vendors: vendorMap.get(transaction.vendor_id) || null
    }))

    return attachBookings(transactionsWithVendors)
  } catch (error) {
    console.error('Error in getAllTransactionsForAdmin:', error)
    throw error
  }
}

/**
 * Vendor row used as the platform / company wallet (escrow). Matched by business name.
 */
export async function getPlatformCompanyVendorId(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('id')
      .ilike('business_name', '%Dirt Trails%')
      .limit(1)
      .maybeSingle()
    if (error || !data?.id) return null
    return data.id
  } catch {
    return null
  }
}

export async function getAllVendorWallets(): Promise<any[]> {
  try {
    // First get all wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('*')
      .order('balance', { ascending: false })

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError)
      throw walletsError
    }

    if (!wallets || wallets.length === 0) {
      return []
    }

    // Get vendor IDs from wallets
    const vendorIds = wallets.map(w => w.vendor_id).filter(id => id)

    if (vendorIds.length === 0) {
      return wallets
    }

    // Fetch vendor information separately
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, business_name, business_email, status, created_at, profiles(id, full_name, email)')
      .in('id', vendorIds)

    if (vendorsError) {
      console.error('Error fetching vendors:', vendorsError)
      // Return wallets without vendor info rather than failing
      return wallets
    }

    // Map vendor information to wallets
    const vendorMap = new Map(vendors?.map(v => [v.id, v]) || [])

    const walletsWithVendors = wallets.map(wallet => ({
      ...wallet,
      vendors: vendorMap.get(wallet.vendor_id) || null
    }))

    return walletsWithVendors
  } catch (error) {
    console.error('Error in getAllVendorWallets:', error)
    return []
  }
}

export async function getVendorTransactions(vendorId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      bookings (
        id,
        status,
        payment_status,
        commission_amount,
        commission_rate_at_booking,
        services (
          title
        )
      )
    `)
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vendor transactions:', error)
    throw error
  }

  return data || []
}

export async function getWalletStats(vendorId: string) {
  try {
    // Ensure any confirmed+paid bookings are reconciled before computing wallet stats.
    // This guarantees that missing payment transactions get created even if they were missed earlier.
    await reconcileMissingPaymentTransactions(vendorId)

    const transactions = await getTransactions(vendorId)
    const wallet = await getVendorWallet(vendorId)

    // If no transactions (table doesn't exist or no data), return default stats
    if (!transactions || transactions.length === 0) {
      return {
        totalEarned: 0,
        totalWithdrawn: 0,
        pendingWithdrawals: 0,
        currentBalance: wallet?.balance ?? 0,
        currency: wallet?.currency || 'UGX',
        totalTransactions: 0,
        completedPayments: 0,
        completedWithdrawals: 0,
        pendingWithdrawalsCount: 0
      }
    }

    // Use all completed payment transactions that are linked to bookings.
    // Each completed payment row represents funds that should count toward wallet balance.
    const bookingPayments = transactions.filter((t: Transaction) =>
      t.transaction_type === 'payment' &&
      t.booking_id &&
      t.status === 'completed'
    )

    const bookingIds = Array.from(new Set(bookingPayments.map((t: Transaction) => t.booking_id as string)))
    let bookingMap: Record<string, any> = {}

    if (bookingIds.length > 0) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, payment_status')
        .in('id', bookingIds)

      console.log('getWalletStats: fetched booking status data', {
        totalBookingPayments: bookingPayments.length,
        bookingIds: bookingIds.length,
        bookingsFetched: bookings?.length ?? 0,
        bookingsError: bookingsError ? bookingsError.message : null
      })

      if (!bookingsError && bookings) {
        bookingMap = bookings.reduce((acc: Record<string, any>, booking: any) => {
          acc[booking.id] = booking
          return acc
        }, {})
      }
    }

    const completedPayments = bookingPayments.filter((t: any) => bookingMap[t.booking_id!]?.status === 'completed')
    const pendingPayments = bookingPayments.filter((t: any) => bookingMap[t.booking_id!]?.status === 'confirmed')
    const unknownStatusPayments = bookingPayments.filter((t: any) => !bookingMap[t.booking_id!])

    if (unknownStatusPayments.length > 0) {
      console.log('getWalletStats: found completed payment transactions with missing booking metadata, treating as pending until booking is confirmed/completed', {
        count: unknownStatusPayments.length,
        bookingIds: unknownStatusPayments.map((t: any) => t.booking_id)
      })
    }

    const withdrawals = transactions.filter((t: Transaction) => t.transaction_type === 'withdrawal')
    const totalWithdrawn = withdrawals.filter((t: Transaction) => t.status === 'completed').reduce((s: number, t: Transaction) => s + t.amount, 0)
    const pendingWithdrawals = withdrawals.filter((t: Transaction) => t.status === 'pending').reduce((s: number, t: Transaction) => s + t.amount, 0)
    const currentBalance = (wallet?.balance ?? 0) - pendingWithdrawals
    const currency = wallet?.currency || transactions[0]?.currency || 'UGX'
    const totalEarned = currentBalance + totalWithdrawn + pendingWithdrawals
    const completedBalance = currentBalance + pendingWithdrawals
    const pendingBalance = pendingWithdrawals

    return {
      totalEarned,
      totalWithdrawn,
      pendingWithdrawals,
      currentBalance,
      completedBalance,
      pendingBalance,
      currency,
      totalTransactions: transactions.length,
      completedPayments: completedPayments.length,
      pendingPayments: pendingPayments.length + unknownStatusPayments.length,
      completedWithdrawals: withdrawals.filter((t: Transaction) => t.status === 'completed').length,
      pendingWithdrawalsCount: withdrawals.filter((t: Transaction) => t.status === 'pending').length
    }
  } catch (error) {
    console.error('Error in getWalletStats:', error)
    // Return default stats on error
    return {
      totalEarned: 0,
      totalWithdrawn: 0,
      pendingWithdrawals: 0,
      currentBalance: 0,
      currency: 'UGX',
      totalTransactions: 0,
      completedPayments: 0,
      completedWithdrawals: 0,
      pendingWithdrawalsCount: 0
    }
  }
}

export async function processWithdrawal(vendorId: string, amount: number, currency: string, payout?: { id?: string; type?: string; meta?: any }) {
  return requestWithdrawal(vendorId, amount, currency, payout)
}

export async function requestWithdrawal(vendorId: string, amount: number, currency: string, payout?: { id?: string; type?: string; meta?: any }) {
  try {
    // Get current wallet stats to validate the withdrawal amount
    const walletStats = await getWalletStats(vendorId)

    if (amount > walletStats.currentBalance) {
      throw new Error(`Insufficient balance. Available: ${formatCurrency(walletStats.currentBalance, walletStats.currency)}`)
    }

    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0')
    }

    // Check if transactions table exists by trying to insert
    const reference = `WD_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

    const payment_method = payout?.type === 'bank' ? 'bank_transfer' : 'mobile_money'

    // Include payout metadata if provided
    const transaction = await addTransaction({
      vendor_id: vendorId,
      amount,
      currency,
      transaction_type: 'withdrawal',
      status: 'pending',
      payment_method: (payment_method as 'card' | 'mobile_money' | 'bank_transfer'),
      reference,
      payout_meta: payout?.meta || (payout ? { type: payout.type } : null)
    })

    // Optionally store payout metadata in a payments_payouts table or attach metadata to the transaction via another RPC.
    // For now, we log it to the console for server-side developers to wire into the processing pipeline.
    if (payout?.meta) {
      console.log('[Wallet Debug] payout metadata provided for withdrawal:', payout.meta)
    }

    return transaction
  } catch (error) {
    console.error('Error in requestWithdrawal:', error)
    throw error
  }
}

/**
 * Reconcile bookings: find bookings that are confirmed AND paid but have no
 * corresponding completed payment transaction, and create one.
 * If vendorId is provided, limit to that vendor only.
 * Returns the number of transactions created.
 */
export async function reconcileMissingPaymentTransactions(vendorId?: string): Promise<number> {
  try {
    // Build base query for confirmed or completed paid bookings
    let query = supabase
      .from('bookings')
      .select('id, vendor_id, tourist_id, total_amount, vendor_payout_amount, currency, commission_amount, commission_rate_at_booking')
      .in('status', ['confirmed', 'completed'])
      .eq('payment_status', 'paid')

    if (vendorId) {
      query = query.eq('vendor_id', vendorId)
    }

    const { data: bookings, error: bookingsError } = await query
    if (bookingsError) {
      console.error('Error fetching confirmed+paid bookings for reconciliation:', bookingsError)
      throw bookingsError
    }

    if (!bookings || bookings.length === 0) return 0

    let created = 0
    const adminId = await getAdminProfileId()

    for (const b of bookings) {
      try {
        // Check existing completed payment transaction for this booking
        const { data: existingTx, error: txCheckError } = await supabase
          .from('transactions')
          .select('id')
          .eq('booking_id', b.id)
          .eq('transaction_type', 'payment')
          .eq('status', 'completed')
          .limit(1)

        if (txCheckError && txCheckError.code !== 'PGRST116') {
          console.warn('Error checking transactions for booking', b.id, txCheckError)
          continue
        }

        if (existingTx && existingTx.length > 0) {
          // already has payment
          continue
        }

        const reference = `PMT_${b.id.slice(0, 8)}_${Date.now()}`
        const commissionAmount = Number(b.commission_amount) || (b.commission_rate_at_booking ? Math.round(Number(b.total_amount || 0) * Number(b.commission_rate_at_booking) * 100) / 100 : 0)

        if (commissionAmount > 0 && adminId) {
          let paymentResult: any = null
          let paymentError: any = null

          try {
            const rpcRes = await supabase.rpc('process_payment_with_commission', {
              p_vendor_id: b.vendor_id,
              p_total_amount: b.total_amount,
              p_commission_amount: commissionAmount,
              p_admin_id: adminId,
              p_booking_id: b.id,
              p_tourist_id: b.tourist_id || null,
              p_currency: b.currency || 'UGX',
              p_payment_method: 'card',
              p_reference: reference
            }) as any
            paymentResult = rpcRes.data
            paymentError = rpcRes.error
          } catch (err) {
            paymentError = err
          }

          let rpcFailed = false
          if (paymentError) {
            const errMsg = String(paymentError?.message || paymentError)
            if (errMsg.includes('process_payment_with_commission') || errMsg.includes('Could not find the function public.process_payment_with_commission')) {
              console.warn('process_payment_with_commission missing, falling back to fallback flow:', errMsg)
              rpcFailed = true
            } else {
              throw paymentError
            }
          }

          if (paymentResult?.success) {
            // succeeded with commission-aware RPC
          } else {
            if (rpcFailed) {
              try {
                await addTransaction({
                  booking_id: b.id,
                  vendor_id: b.vendor_id,
                  tourist_id: b.tourist_id || null,
                  amount: b.total_amount,
                  currency: b.currency || 'UGX',
                  transaction_type: 'payment',
                  status: 'completed',
                  payment_method: 'card',
                  reference
                })

                const vendorAmount = b.vendor_payout_amount != null
                  ? Number(b.vendor_payout_amount)
                  : Number(b.total_amount) - commissionAmount
                await creditWallet(b.vendor_id, vendorAmount, b.currency || 'UGX')
                await creditWallet(adminId, commissionAmount, b.currency || 'UGX')
                console.log('Reconciliation fallback processed with commission split for booking', b.id)
              } catch (fallbackErr) {
                console.error('Reconciliation fallback failed for booking', b.id, fallbackErr)
                throw fallbackErr
              }
            } else {
              const { data: fallbackResult, error: fallbackError } = await supabase.rpc('process_payment_atomic', {
                p_vendor_id: b.vendor_id,
                p_amount: b.total_amount,
                p_booking_id: b.id,
                p_tourist_id: b.tourist_id || null,
                p_currency: b.currency || 'UGX',
                p_payment_method: 'card',
                p_reference: reference
              }) as any

              if (fallbackError) {
                throw fallbackError
              }
              if (!fallbackResult?.success) {
                throw new Error(fallbackResult?.error || 'Failed to process payment during reconciliation fallback')
              }
            }
          }
        } else {
          const { data: paymentResult, error: paymentError } = await supabase.rpc('process_payment_atomic', {
            p_vendor_id: b.vendor_id,
            p_amount: b.total_amount,
            p_booking_id: b.id,
            p_tourist_id: b.tourist_id || null,
            p_currency: b.currency || 'UGX',
            p_payment_method: 'card',
            p_reference: reference
          }) as any

          if (paymentError) {
            throw paymentError
          }
          if (!paymentResult?.success) {
            throw new Error(paymentResult?.error || 'Failed to process payment during reconciliation')
          }
        }

        created += 1
        console.log('Reconciliation: created payment transaction and updated wallet for booking', b.id)
      } catch (err) {
        console.error('Reconciliation: failed for booking', b.id, err)
      }
    }

    return created
  } catch (error) {
    console.error('Error in reconcileMissingPaymentTransactions:', error)
    throw error
  }
}
