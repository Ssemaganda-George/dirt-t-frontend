import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePreferences } from '../../contexts/PreferencesContext'
import { getVendorStats } from '../../lib/database'
import { supabase } from '../../lib/supabaseClient'
import { formatDateTime, getVendorDisplayStatus, formatCurrencyWithConversion } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import {
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react'

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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0 mb-6 sm:mb-8">
            <div className="flex-1 min-w-0">
              <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
            </div>
            <div className="flex-shrink-0">
              <div className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
            </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Balance Overview Skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gray-800">
                  <div className="h-6 bg-gray-700 rounded w-48 animate-pulse"></div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="text-center">
                        <div className="h-4 bg-gray-200 rounded w-20 mx-auto mb-2 animate-pulse"></div>
                        <div className="h-8 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Recent Transactions Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gray-800">
                  <div className="h-6 bg-gray-700 rounded w-40 animate-pulse"></div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                          </div>
                          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Professional Header */}
        <div className="mb-12">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-end sm:space-y-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Dashboard</p>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2">
                Welcome back, <span className="text-blue-600">{profile?.full_name || 'Vendor'}</span>
              </h1>
              <p className="text-lg text-gray-600">
                Monitor your business performance and manage your bookings
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={refresh}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Professional Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {/* Wallet Balance Card */}
          <div 
            onClick={() => navigate('/vendor/transactions')}
            className="group bg-white border border-gray-200 border-l-4 border-l-purple-600 rounded-lg p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Balance</p>
                <p className="text-lg font-bold text-gray-900 mt-4">
                  {formatCurrencyWithConversion(stats.balance, stats.currency, selectedCurrency || stats.currency, selectedLanguage || 'en-US')}
                </p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                {balanceStatus === 'critical' ? '⚠️ Low' : balanceStatus === 'warning' ? '⚡ Low' : '✓ Healthy'}
              </p>
            </div>
          </div>

          {/* Total Services Card */}
          <div 
            onClick={() => navigate('/vendor/services')}
            className="group bg-white border border-gray-200 border-l-4 border-l-blue-600 rounded-lg p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Services</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-4">{stats.servicesCount}</h3>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">Active</p>
            </div>
          </div>

          {/* Pending Bookings Card */}
          <div 
            onClick={() => navigate('/vendor/bookings')}
            className="group bg-white border border-gray-200 border-l-4 border-l-yellow-600 rounded-lg p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pending</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-4">{stats.pendingBookings}</h3>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">Awaiting</p>
            </div>
          </div>

          {/* Completed Bookings Card */}
          <div 
            onClick={() => navigate('/vendor/bookings')}
            className="group bg-white border border-gray-200 border-l-4 border-l-emerald-600 rounded-lg p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Completed</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-4">{stats.completedBookings}</h3>
              </div>
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">Completed</p>
            </div>
          </div>

          {/* Inquiries Card */}
          <div 
            onClick={() => navigate('/vendor/inquiries')}
            className="group bg-white border border-gray-200 border-l-4 border-l-cyan-600 rounded-lg p-4 hover:shadow-md transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Inquiries</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-4">{stats.inquiriesCount}</h3>
              </div>
              <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4 text-cyan-600" />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600">Customers</p>
            </div>
          </div>
        </div>

      {/* Professional Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings Section - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Recent Bookings</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Latest booking activity</p>
                </div>
                <div className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs">
                  <span className="font-semibold text-blue-600">{stats.recentBookings.length}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="space-y-2">
                {stats.recentBookings.map((b, index) => (
                  <div key={b.id} className={`py-2 ${index !== stats.recentBookings.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-xs">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateTime(b.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="font-bold text-gray-900">{formatCurrencyWithConversion(b.total_amount, b.currency, selectedCurrency || b.currency, selectedLanguage || 'en-US')}</span>
                        <StatusBadge status={getVendorDisplayStatus(b.status, b.payment_status)} variant="small" />
                      </div>
                    </div>
                  </div>
                ))}
                {stats.recentBookings.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-semibold mb-1">No bookings yet</p>
                    <p className="text-gray-600 text-sm">Your recent bookings will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions Section - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-3">
              <h3 className="text-base font-semibold text-gray-900">Transactions</h3>
              <p className="text-xs text-gray-500 mt-0.5">Financial activity</p>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="space-y-2">
                {stats.recentTransactions.map((t, index) => (
                  <div key={t.id} className={`py-2 ${index !== stats.recentTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 capitalize">
                          {t.transaction_type === 'payment' ? 'Payment Received' : 'Withdrawal'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateTime(t.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <p className="text-xs font-bold text-gray-900">
                          {t.transaction_type === 'payment' ? '+' : '-'}{formatCurrencyWithConversion(t.amount, t.currency, selectedCurrency || t.currency, selectedLanguage || 'en-US')}
                        </p>
                        <StatusBadge status={t.status} variant="small" />
                      </div>
                    </div>
                  </div>
                ))}
                {stats.recentTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-900 font-semibold mb-1">No transactions yet</p>
                    <p className="text-gray-600 text-sm">Financial activity will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
