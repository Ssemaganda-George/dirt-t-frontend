import { supabase } from '../lib/supabaseClient'

export async function getDashboardStats() {
  // Get pending vendors (with profile full_name)
  let pendingVendorsList: any[] = [];
  try {
    const { data: pending, error: pendingError } = await supabase
      .from('vendors')
      .select(`
        id,
        user_id,
        business_name,
        business_email,
        status,
        created_at,
        profiles(full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    if (!pendingError && pending) {
      pendingVendorsList = pending;
    }
  } catch (e) {
    console.error('getDashboardStats: Error fetching pending vendors:', e);
  }
  try {
    console.log('getDashboardStats: Starting dashboard stats fetch...');

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('getDashboardStats: Auth check - User:', user?.id, 'Error:', authError);

    if (authError || !user) {
      console.error('getDashboardStats: User not authenticated');
      throw new Error('User not authenticated');
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('getDashboardStats: Profile check - Profile:', profile, 'Error:', profileError);

    if (profileError || !profile) {
      console.error('getDashboardStats: Profile not found');
      throw new Error('Profile not found');
    }

    if (profile.role !== 'admin') {
      console.error('getDashboardStats: User is not admin, role:', profile.role);
      throw new Error('Access denied: Admin role required');
    }

    console.log('getDashboardStats: User is admin, proceeding with queries...');

    // Get vendor stats
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('status')

    console.log('getDashboardStats: Vendors query - Data length:', vendors?.length, 'Error:', vendorsError);

    if (vendorsError) {
      console.error('getDashboardStats: Error fetching vendors:', vendorsError);
      throw vendorsError;
    }

    const totalVendors = vendors?.length || 0
    const pendingVendors = vendors?.filter(v => v.status === 'pending').length || 0

    // Get tourist stats
    const { data: tourists, error: touristsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'tourist')

    console.log('getDashboardStats: Tourists query - Data length:', tourists?.length, 'Error:', touristsError);

    if (touristsError) {
      console.error('getDashboardStats: Error fetching tourists:', touristsError);
      throw touristsError;
    }

    const totalTourists = tourists?.length || 0

    // Get service stats
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('status')

    console.log('getDashboardStats: Services query - Data length:', services?.length, 'Error:', servicesError);

    if (servicesError) {
      console.error('getDashboardStats: Error fetching services:', servicesError);
      throw servicesError;
    }

    const totalServices = services?.length || 0
    const pendingServices = services?.filter(s => s.status === 'pending').length || 0

    // Get booking stats
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('status, total_amount')

    console.log('getDashboardStats: Bookings query - Data length:', bookings?.length, 'Error:', bookingsError);

    if (bookingsError) {
      console.error('getDashboardStats: Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    const totalBookings = bookings?.length || 0
    const totalRevenue = bookings?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) || 0

    console.log('getDashboardStats: Stats calculated -', {
      totalVendors,
      pendingVendors,
      totalServices,
      pendingServices,
      totalBookings,
      totalRevenue
    });

    // Get recent bookings
    const { data: recentBookings, error: recentBookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          title,
          vendors (
            business_name
          )
        ),
        profiles (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('getDashboardStats: Recent bookings query - Data length:', recentBookings?.length, 'Error:', recentBookingsError);

    if (recentBookingsError) {
      console.error('getDashboardStats: Error fetching recent bookings:', recentBookingsError);
      // Don't throw here, just log and continue
    }

    // Get recent vendors (with profile full_name)
    const { data: recentVendors, error: recentVendorsError } = await supabase
      .from('vendors')
      .select(`
        id,
        user_id,
        business_name,
        business_email,
        status,
        created_at,
        profiles(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('getDashboardStats: Recent vendors query - Data length:', recentVendors?.length, 'Error:', recentVendorsError);

    if (recentVendorsError) {
      console.error('getDashboardStats: Error fetching recent vendors:', recentVendorsError);
      // Don't throw here, just log and continue
    }

    // Get total messages for admin
    const { count: totalMessages, error: totalMessagesError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_role', 'admin')

    console.log('getDashboardStats: Total messages query - Count:', totalMessages, 'Error:', totalMessagesError);

    if (totalMessagesError) {
      console.error('getDashboardStats: Error fetching total messages:', totalMessagesError);
      // Don't throw here, just log and continue
    }

    return {
      totalVendors,
      pendingVendors,
      pendingVendorsList,
      totalTourists,
      totalServices,
      pendingServices,
      totalBookings,
      totalRevenue,
      totalMessages: totalMessages || 0,
      recentBookings: recentBookings || [],
      recentVendors: recentVendors || []
    }
  } catch (error) {
    console.error('getDashboardStats: Exception caught:', error)
    throw error
  }
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    throw error
  }

  return data || []
}

export async function updateUserStatus(userId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user status:', error)
    throw error
  }
}

export async function updateVendorStatusAtomic(vendorId: string, status: string, approvedBy?: string): Promise<any> {
  const { data, error } = await supabase.rpc('update_vendor_status_atomic', {
    p_vendor_id: vendorId,
    p_status: status,
    p_approved_by: approvedBy || null
  });

  if (error) throw error;

  if (!data.success) {
    throw new Error(data.error || 'Failed to update vendor status');
  }

  // Fetch the updated vendor
  const { data: updatedVendor, error: fetchError } = await supabase
    .from('vendors')
    .select(`
      *,
      profiles (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq('id', vendorId)
    .single();

  if (fetchError) throw fetchError;
  return updatedVendor;
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    // First, get the user's role to determine what related data to delete
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      throw profileError
    }

    // Delete visitor sessions for this user
    const { error: visitorSessionsError } = await supabase
      .from('visitor_sessions')
      .delete()
      .eq('user_id', userId)

    if (visitorSessionsError) {
      console.error('Error deleting visitor sessions:', visitorSessionsError)
      throw visitorSessionsError
    }

    // Delete service likes for this user
    const { error: serviceLikesError } = await supabase
      .from('service_likes')
      .delete()
      .eq('user_id', userId)

    if (serviceLikesError) {
      console.error('Error deleting service likes:', serviceLikesError)
      throw serviceLikesError
    }

    // Delete related data based on user role
    if (profile.role === 'vendor') {
      // Delete vendor-specific data
      const { error: vendorError } = await supabase
        .from('vendors')
        .delete()
        .eq('user_id', userId)

      if (vendorError) {
        console.error('Error deleting vendor data:', vendorError)
        throw vendorError
      }

      // Delete all services and related data for this vendor
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('vendor_id', userId)

      if (servicesError) {
        console.error('Error fetching vendor services:', servicesError)
        throw servicesError
      }

      if (services && services.length > 0) {
        const serviceIds = services.map(s => s.id)

        // Delete bookings related to these services
        const { error: bookingsError } = await supabase
          .from('bookings')
          .delete()
          .in('service_id', serviceIds)

        if (bookingsError) {
          console.error('Error deleting service bookings:', bookingsError)
          throw bookingsError
        }

        // Delete transactions related to these services
        const { error: transactionsError } = await supabase
          .from('transactions')
          .delete()
          .in('service_id', serviceIds)

        if (transactionsError) {
          console.error('Error deleting service transactions:', transactionsError)
          throw transactionsError
        }

        // Delete the services themselves
        const { error: deleteServicesError } = await supabase
          .from('services')
          .delete()
          .eq('vendor_id', userId)

        if (deleteServicesError) {
          console.error('Error deleting services:', deleteServicesError)
          throw deleteServicesError
        }
      }
    } else if (profile.role === 'tourist') {
      // Delete tourist-specific data
      const { error: touristError } = await supabase
        .from('tourists')
        .delete()
        .eq('user_id', userId)

      if (touristError) {
        console.error('Error deleting tourist data:', touristError)
        throw touristError
      }

      // Delete bookings made by this tourist
      const { error: bookingsError } = await supabase
        .from('bookings')
        .delete()
        .eq('tourist_id', userId)

      if (bookingsError) {
        console.error('Error deleting tourist bookings:', bookingsError)
        throw bookingsError
      }

      // Delete transactions made by this tourist
      const { error: transactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('tourist_id', userId)

      if (transactionsError) {
        console.error('Error deleting tourist transactions:', transactionsError)
        throw transactionsError
      }
    }

    // Finally, delete the user profile
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      console.error('Error deleting user profile:', deleteProfileError)
      throw deleteProfileError
    }

    console.log(`User ${userId} and all related data deleted successfully`)
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

export async function getVendorStats(vendorId: string) {
  try {
    if (!vendorId) {
      console.error('getVendorStats: vendorId is null or undefined')
      return {
        servicesCount: 0,
        pendingBookings: 0,
        completedBookings: 0,
        balance: 0,
        currency: 'UGX',
        balanceTrend: '+0%',
        balanceStatus: 'healthy' as const,
        pendingBalance: 0,
        messagesCount: 0,
        inquiriesCount: 0,
        recentBookings: [],
        recentTransactions: []
      }
    }

    console.log('getVendorStats: Fetching stats for vendor:', vendorId)

    // Use Promise.allSettled to allow some queries to fail without blocking others
    const results = await Promise.allSettled([
      // Services count
      supabase
        .from('services')
        .select('id, vendor_id, status', { count: 'exact', head: true })
        .eq('vendor_id', vendorId),

      // Bookings stats with count
      supabase
        .from('bookings')
        .select('status', { count: 'exact', head: true })
        .eq('vendor_id', vendorId),

      // Recent bookings
      supabase
        .from('bookings')
        .select(`
          *,
          services (
            title
          ),
          profiles (
            full_name
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(5)
    ])

    // Extract results
    const servicesResult = results[0]
    const bookingsResult = results[1]
    const recentBookingsResult = results[2]

    // Process services count
    let servicesCount = 0
    if (servicesResult.status === 'fulfilled') {
      servicesCount = servicesResult.value.count || 0
    }

    // Process bookings stats
    let pendingBookings = 0
    let completedBookings = 0
    if (bookingsResult.status === 'fulfilled') {
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('status')
        .eq('vendor_id', vendorId)

      if (allBookings) {
        pendingBookings = allBookings.filter(b => b.status === 'pending').length
        completedBookings = allBookings.filter(b => b.status === 'completed').length
      }
    }

    // Process recent bookings
    let recentBookings: any[] = []
    if (recentBookingsResult.status === 'fulfilled') {
      recentBookings = recentBookingsResult.value.data || []
    }

    console.log('getVendorStats: Basic stats fetched - services:', servicesCount, 'pending bookings:', pendingBookings, 'completed bookings:', completedBookings)

    // Get wallet - try multiple possibilities due to data inconsistency
    let wallet = null
    const walletAttempts = [vendorId] // Start with vendorId as-is

    // Check if vendorId is a vendor.id or user.id
    const { data: vendorById, error: vendorByIdError } = await supabase
      .from('vendors')
      .select('user_id')
      .eq('id', vendorId)
      .single()

    let vendorByUserId: any = null
    let vendorByUserIdError: any = null

    if (!vendorByIdError && vendorById?.user_id) {
      walletAttempts.push(vendorById.user_id)
    } else {
      const result = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', vendorId)
        .single()

      vendorByUserId = result.data
      vendorByUserIdError = result.error

      if (!vendorByUserIdError && vendorByUserId?.id) {
        walletAttempts.push(vendorByUserId.id)
      }
    }

    // Import inline to avoid circular deps
    const { getVendorWallet } = await import('./WalletRepository')
    const { getInquiryCount } = await import('./InquiryRepository')

    // Try all possibilities
    for (const attemptId of walletAttempts) {
      try {
        wallet = await getVendorWallet(attemptId)
        if (wallet) break
      } catch (error) {
        // Continue to next attempt
      }
    }

    // Get messages count for vendor - try multiple possibilities
    let finalMessagesCount = 0
    const messageAttempts = [vendorId]

    if (!vendorByIdError && vendorById?.user_id) {
      messageAttempts.push(vendorById.user_id)
    } else if (!vendorByUserIdError && vendorByUserId?.id) {
      messageAttempts.push(vendorByUserId.id)
    }

    for (const attemptId of messageAttempts) {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', attemptId)
        .eq('recipient_role', 'vendor')

      if (!error && count && count > 0) {
        finalMessagesCount = count
        break
      }
    }

    // Get inquiries count for vendor
    let inquiriesCount = 0
    try {
      inquiriesCount = await getInquiryCount(vendorId)
    } catch (inquiryError) {
      console.warn('Could not fetch inquiry count (table may not exist yet):', inquiryError)
      inquiriesCount = 0
    }

    // Get recent transactions
    let recentTx: any[] = []
    try {
      const { data, error: recentTxError } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentTxError) {
        if (recentTxError.message?.includes('permission denied') ||
            recentTxError.message?.includes('does not exist') ||
            recentTxError.code === 'PGRST116') {
          console.warn('Transactions table not accessible or does not exist:', recentTxError.message)
          recentTx = []
        } else {
          throw recentTxError
        }
      } else {
        recentTx = data || []
        // Enrich with booking data to show vendor payout amounts
        if (recentTx.length > 0) {
          const txBookingIds = recentTx.filter((tx: any) => tx.booking_id).map((tx: any) => tx.booking_id)
          if (txBookingIds.length > 0) {
            const { data: txBookingsData } = await supabase
              .from('bookings')
              .select('id, commission_amount, total_amount, vendor_payout_amount')
              .in('id', txBookingIds)
            if (txBookingsData) {
              const txBookingMap: Record<string, any> = txBookingsData.reduce((acc: Record<string, any>, b: any) => { acc[b.id] = b; return acc }, {})
              recentTx = recentTx.map((tx: any) => {
                const booking = txBookingMap[tx.booking_id]
                if (tx.transaction_type === 'payment' && booking) {
                  const vendorAmount = booking.vendor_payout_amount != null
                    ? Number(booking.vendor_payout_amount)
                    : booking.commission_amount != null
                      ? tx.amount - Number(booking.commission_amount)
                      : tx.amount
                  return { ...tx, amount: vendorAmount, bookings: booking }
                }
                return { ...tx, bookings: booking || null }
              })
            }
          }
        }
        // For no-booking payment transactions, look up vendor_payout directly from orders
        const noBookingRefsRecent = recentTx
          .filter((tx: any) => tx.transaction_type === 'payment' && !tx.booking_id && tx.reference)
          .map((tx: any) => tx.reference as string)
        if (noBookingRefsRecent.length > 0) {
          try {
            const { data: orderRowsR } = await supabase
              .from('orders').select('reference, vendor_payout').in('reference', noBookingRefsRecent).not('vendor_payout', 'is', null)
            if (orderRowsR) {
              const refPayoutR: Record<string, number> = {}
              for (const o of orderRowsR) {
                if (o.reference && o.vendor_payout != null) refPayoutR[o.reference] = Number(o.vendor_payout)
              }
              recentTx = recentTx.map((tx: any) => {
                if (tx.transaction_type === 'payment' && !tx.booking_id && tx.reference && refPayoutR[tx.reference] != null) {
                  return { ...tx, amount: refPayoutR[tx.reference], original_amount: tx.amount }
                }
                return tx
              })
            }
          } catch (_) { /* non-fatal */ }
        }
      }
    } catch (error) {
      console.warn('Exception fetching recent transactions (table may not exist):', error)
      recentTx = []
    }

    // Calculate balance trend (last 30 days)
    let balanceTrend = '+0%'
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: monthlyTransactions, error: trendError } = await supabase
        .from('transactions')
        .select('amount, transaction_type, created_at')
        .eq('vendor_id', vendorId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'completed')

      if (!trendError && monthlyTransactions && monthlyTransactions.length > 0) {
        const totalChange = monthlyTransactions.reduce((sum, tx) => {
          return tx.transaction_type === 'payment' ? sum + tx.amount :
                 tx.transaction_type === 'withdrawal' ? sum - tx.amount : sum
        }, 0)

        const currentBalance = wallet?.balance || 0
        if (currentBalance > 0) {
          const percentageChange = (totalChange / currentBalance) * 100
          const sign = percentageChange >= 0 ? '+' : ''
          balanceTrend = `${sign}${percentageChange.toFixed(1)}%`
        } else if (totalChange > 0) {
          balanceTrend = `+${totalChange.toLocaleString()}`
        }
      }
    } catch (error) {
      console.warn('Could not calculate balance trend (transactions table may not exist):', error)
      balanceTrend = '+0%'
    }

    // Calculate balance status
    let balanceStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    const currentBalance = wallet?.balance || 0
    if (currentBalance < 50000) {
      balanceStatus = 'critical'
    } else if (currentBalance < 200000) {
      balanceStatus = 'warning'
    }

    // Calculate pending balance from incomplete bookings
    let pendingBalance = 0
    try {
      const { data: pendingTransactions, error: pendingError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('vendor_id', vendorId)
        .eq('status', 'pending')
        .eq('transaction_type', 'credit')

      if (!pendingError && pendingTransactions) {
        pendingBalance = pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0)
      }
    } catch (error) {
      console.warn('Could not calculate pending balance:', error)
      pendingBalance = 0
    }

    return {
      servicesCount,
      pendingBookings,
      completedBookings,
      balance: wallet?.balance || 0,
      currency: wallet?.currency || 'UGX',
      balanceTrend,
      balanceStatus,
      pendingBalance,
      messagesCount: finalMessagesCount || 0,
      inquiriesCount,
      recentBookings: recentBookings || [],
      recentTransactions: recentTx || []
    }
  } catch (error) {
    console.error('Error fetching vendor stats:', error)
    throw error
  }
}
