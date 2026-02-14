import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePreferences } from '../../contexts/PreferencesContext'
import { getVendorStats } from '../../lib/database'
import { supabase } from '../../lib/supabaseClient'
import { formatDateTime, getVendorDisplayStatus, formatCurrencyWithConversion } from '../../lib/utils'
import { useVendorPricing } from '../../hooks/hook'
import { Calendar, TrendingUp } from 'lucide-react'

export default function VendorDashboard() {
  const { profile, user, loading: authLoading } = useAuth()
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const navigate = useNavigate()
  const [vendorId, setVendorId] = useState<string | null>(null)
  const [vendorLoading, setVendorLoading] = useState(true)

  const [stats, setStats] = useState({
    servicesCount: 0,
    pendingBookings: 0,
    completedBookings: 0,
    balance: 0,
    currency: 'UGX',
    balanceTrend: '+0%',
    balanceStatus: 'healthy' as 'healthy' | 'warning' | 'critical',
    pendingBalance: 0,
    messagesCount: 0,
    inquiriesCount: 0,
    recentBookings: [] as any[],
    recentTransactions: [] as any[]
  })
  const { tier: currentTier } = useVendorPricing(vendorId)
  const [loading, setLoading] = useState(true)

  // Memoize expensive calculations
  const balanceStatus = useMemo(() => {
    if (stats.balance > 100000) return 'healthy'
    if (stats.balance > 50000) return 'warning'
    return 'critical'
  }, [stats.balance])
  useEffect(() => {
    const checkVendorStatus = async () => {
      if (authLoading || !user?.id) {
        return
      }

      try {
        // Check profile and vendor record in parallel for better performance
        const [profileResult, vendorResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('role, status')
            .eq('id', user.id)
            .single(),
          supabase
            .from('vendors')
            .select('id')
            .eq('user_id', user.id)
            .single()
        ])

        // Check if user has vendor role
        if (profileResult.error) {
          console.error('Error fetching profile:', profileResult.error)
          setVendorId(null)
          setVendorLoading(false)
          return
        }

        if (profileResult.data.role !== 'vendor' || profileResult.data.status !== 'approved') {
          setVendorId(null)
          setVendorLoading(false)
          return
        }

        // User is approved vendor, use vendor record ID or fallback to user ID
        let vendorIdToUse = user.id

        if (!vendorResult.error && vendorResult.data) {
          vendorIdToUse = vendorResult.data.id
        } else {
          console.warn('Could not fetch vendor record, using user ID as fallback:', vendorResult.error)
          // Don't try to create vendor record here to avoid slowing down initial load
          // Let it be created when needed elsewhere
        }

        setVendorId(vendorIdToUse)
      } catch (error) {
        console.error('Error in checkVendorStatus:', error)
        setVendorId(null)
      } finally {
        setVendorLoading(false)
      }
    }

    checkVendorStatus()
  }, [authLoading, user?.id])

  const refresh = useCallback(async () => {
    if (!vendorId) {
      return
    }

    try {
      setLoading(true)
      const data = await getVendorStats(vendorId)
      setStats(data)

      // Tier information is now handled by useVendorPricing hook
    } catch (error) {
      console.error('Error fetching vendor stats:', error)
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => { 
    if (vendorId && !vendorLoading) {
      refresh() 
    }
  }, [vendorId, vendorLoading])

  // Set up real-time subscriptions for wallet and transaction updates - Optimized with debouncing
  useEffect(() => {
    if (authLoading || !vendorId || vendorLoading) return

    console.log('Dashboard: Setting up real-time subscriptions for vendor:', vendorId)

    const subscriptions: any[] = []
    let refreshTimeout: NodeJS.Timeout | null = null

    // Debounced refresh function to prevent excessive API calls
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        refresh()
      }, 1000) // Wait 1 second before refreshing
    }

    // Subscribe to wallets changes for this vendor (affects balance stat)
    try {
      const walletsSubscription = supabase
        .channel('dashboard_wallets_realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `vendor_id=eq.${vendorId}`
        }, (payload: any) => {
          console.log('Dashboard: Real-time wallet change:', payload)
          // Only refresh for INSERT, UPDATE, DELETE events
          if (['INSERT', 'UPDATE', 'DELETE'].includes(payload.eventType)) {
            debouncedRefresh()
          }
        })
        .subscribe()

      subscriptions.push(walletsSubscription)
    } catch (error) {
      console.warn('Could not set up wallets real-time subscription:', error)
    }

    // Subscribe to transactions changes for this vendor (affects balance stat)
    try {
      const transactionsSubscription = supabase
        .channel('dashboard_transactions_realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `vendor_id=eq.${vendorId}`
        }, (payload: any) => {
          console.log('Dashboard: Real-time transaction change:', payload)
          // Only refresh for INSERT, UPDATE events (DELETE might not affect balance)
          if (['INSERT', 'UPDATE'].includes(payload.eventType)) {
            debouncedRefresh()
          }
        })
        .subscribe()

      subscriptions.push(transactionsSubscription)
    } catch (error) {
      console.warn('Could not set up transactions real-time subscription (table may not exist):', error)
    }

    // Subscribe to bookings changes (less frequent, so we can refresh immediately)
    try {
      const bookingsSubscription = supabase
        .channel('dashboard_bookings_realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `vendor_id=eq.${vendorId}`
        }, (payload: any) => {
          console.log('Dashboard: Real-time booking change:', payload)
          // Bookings changes are important, refresh immediately but debounced
          debouncedRefresh()
        })
        .subscribe()

      subscriptions.push(bookingsSubscription)
    } catch (error) {
      console.warn('Could not set up bookings real-time subscription:', error)
    }

    // Cleanup subscriptions and timeout
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      subscriptions.forEach(sub => {
        try {
          sub.unsubscribe()
        } catch (error) {
          console.warn('Error unsubscribing:', error)
        }
      })
    }
  }, [authLoading, vendorId, vendorLoading])

  if (loading || vendorLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div>
            <div className="h-7 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 h-80"></div>
            <div className="bg-white rounded-xl border border-gray-200 h-80"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {profile?.full_name || 'Vendor'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor your business performance and manage bookings</p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          onClick={() => navigate('/vendor/transactions')}
          className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-gray-500">Balance</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">
            {formatCurrencyWithConversion(stats.balance, stats.currency, selectedCurrency || stats.currency, selectedLanguage || 'en-US')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {balanceStatus === 'critical' ? '⚠ Low' : balanceStatus === 'warning' ? '⚡ Low' : '✓ Healthy'}
          </p>
        </div>

        <div
          onClick={() => navigate('/vendor/services')}
          className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-500 p-4 hover:shadow-sm transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-gray-500">Services</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.servicesCount}</p>
          <p className="text-xs text-gray-400 mt-1">Active</p>
        </div>

        <div
          onClick={() => navigate('/vendor/bookings')}
          className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-amber-500 p-4 hover:shadow-sm transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-gray-500">Pending</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.pendingBookings}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting</p>
        </div>

        <div
          onClick={() => navigate('/vendor/bookings')}
          className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-emerald-500 p-4 hover:shadow-sm transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.completedBookings}</p>
          <p className="text-xs text-gray-400 mt-1">Done</p>
        </div>

        <div
          onClick={() => navigate('/vendor/inquiries')}
          className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-violet-500 p-4 hover:shadow-sm transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-gray-500">Inquiries</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.inquiriesCount}</p>
          <p className="text-xs text-gray-400 mt-1">Customers</p>
        </div>

        {/* Tier Information Card */}
        <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-purple-500 p-4 hover:shadow-sm transition-all">
          <p className="text-xs font-medium text-gray-500">Current Tier</p>
          <p className="text-lg font-semibold text-gray-900 mt-2">
            {currentTier?.name || 'Loading...'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {currentTier?.commission_type === 'flat' 
              ? `${currentTier.commission_value} ${currentTier.currency || 'UGX'} flat fee`
              : `${currentTier?.commission_value || 0}% commission`
            }
          </p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Recent Bookings</h3>
                <p className="text-xs text-gray-500 mt-0.5">Latest booking activity</p>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{stats.recentBookings.length}</span>
            </div>
            <div className="p-5 flex-1 overflow-y-auto divide-y divide-gray-100">
              {stats.recentBookings.map((b) => (
                <div key={b.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(b.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrencyWithConversion(b.total_amount, b.currency, selectedCurrency || b.currency, selectedLanguage || 'en-US')}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                      getVendorDisplayStatus(b.status, b.payment_status) === 'confirmed' || getVendorDisplayStatus(b.status, b.payment_status) === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : getVendorDisplayStatus(b.status, b.payment_status) === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    }`}>
                      {getVendorDisplayStatus(b.status, b.payment_status)}
                    </span>
                  </div>
                </div>
              ))}
              {stats.recentBookings.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">No bookings yet</p>
                  <p className="text-xs text-gray-500 mt-1">Your recent bookings will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Tier Progress */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Tier Progress</h3>
              <p className="text-xs text-gray-500 mt-0.5">Your commission tier status</p>
            </div>
            <div className="p-5">
              {currentTier ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {currentTier.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {currentTier.commission_type === 'flat' 
                        ? `${currentTier.commission_value} ${currentTier.currency || 'UGX'} flat fee`
                        : `${currentTier.commission_value}% commission`
                      }
                    </span>
                  </div>

                  {/* Next tier information not available in new pricing system */}
                  <div className="text-center py-4">
                    <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700">Tier System Active</p>
                    <p className="text-xs text-gray-500">Your commission rate is automatically managed</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading tier information...</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1 flex flex-col">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Transactions</h3>
              <p className="text-xs text-gray-500 mt-0.5">Financial activity</p>
            </div>
            <div className="p-5 flex-1 overflow-y-auto divide-y divide-gray-100">
              {stats.recentTransactions.map((t) => (
                <div key={t.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {t.transaction_type === 'payment' ? 'Payment Received' : 'Withdrawal'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(t.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {t.transaction_type === 'payment' ? '+' : '-'}{formatCurrencyWithConversion(t.amount, t.currency, selectedCurrency || t.currency, selectedLanguage || 'en-US')}
                    </p>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                      t.status === 'completed' ? 'bg-emerald-50 text-emerald-700'
                        : t.status === 'pending' ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
              {stats.recentTransactions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm font-medium text-gray-900">No transactions yet</p>
                  <p className="text-xs text-gray-500 mt-1">Financial activity will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
