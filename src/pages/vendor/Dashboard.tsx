import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePreferences } from '../../contexts/PreferencesContext'
import { getVendorStats } from '../../lib/database'
import { supabase } from '../../lib/supabaseClient'
import { formatDateTime, getVendorDisplayStatus, formatCurrencyWithConversion } from '../../lib/utils'
import StatCard from '../../components/StatCard'
import { StatusBadge } from '../../components/StatusBadge'
import {
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  CreditCard
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome back, {profile?.full_name || 'Vendor'}!</p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Total Services"
            value={stats.servicesCount}
            icon={MapPin}
            color="blue"
            trend="+12% this month"
            subtitle="Active listings"
            onClick={() => navigate('/vendor/services')}
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          />
          <StatCard
            title="Pending Bookings"
            value={stats.pendingBookings}
            icon={Clock}
            color="yellow"
            trend="+5% this week"
            subtitle="Awaiting confirmation"
            onClick={() => navigate('/vendor/bookings')}
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          />
          <StatCard
            title="Completed Bookings"
            value={stats.completedBookings}
            icon={CheckCircle}
            color="green"
            trend="+18% this month"
            subtitle="Successfully completed"
            onClick={() => navigate('/vendor/bookings')}
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          />
          <StatCard
            title="Wallet Balance"
            value={formatCurrencyWithConversion(stats.balance, stats.currency, selectedCurrency || stats.currency, selectedLanguage || 'en-US')}
            icon={DollarSign}
            color={balanceStatus === 'critical' ? 'red' : balanceStatus === 'warning' ? 'yellow' : 'teal'}
            trend={stats.balanceTrend}
            subtitle={
              stats.pendingBalance > 0 
                ? `${formatCurrencyWithConversion(stats.pendingBalance, stats.currency, selectedCurrency || stats.currency, selectedLanguage || 'en-US')} pending • ${balanceStatus === 'critical' ? 'Low balance' : balanceStatus === 'warning' ? 'Balance running low' : 'Available earnings'}`
                : balanceStatus === 'critical' 
                  ? 'Low balance - consider adding funds' 
                  : balanceStatus === 'warning' 
                    ? 'Balance running low' 
                    : 'Available earnings'
            }
            onClick={() => navigate('/vendor/transactions')}
            isWalletCard={true}
            actions={
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/vendor/transactions')
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-sm font-medium rounded-md transition-all duration-200 backdrop-blur-sm"
              >
                <CreditCard className="h-4 w-4" />
                Withdraw Funds
              </button>
            }
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          />
          <StatCard
            title="Inquiries"
            value={stats.inquiriesCount}
            icon={MessageSquare}
            color="purple"
            trend="0 unread"
            subtitle="Customer inquiries"
            onClick={() => navigate('/vendor/inquiries')}
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          />
        </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Recent Bookings - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300" />
                  Recent Bookings
                </h3>
                <span className="text-xs sm:text-sm text-gray-300">{stats.recentBookings.length} total</span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {stats.recentBookings.map((b) => (
                  <div key={b.id} className="bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 flex items-center justify-center flex-shrink-0 rounded-full">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm sm:text-base truncate">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</p>
                          <p className="text-xs sm:text-sm text-gray-300">{formatDateTime(b.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-shrink-0">
                        <span className="font-semibold text-white text-sm sm:text-base">{formatCurrencyWithConversion(b.total_amount, b.currency, selectedCurrency || b.currency, selectedLanguage || 'en-US')}</span>
                        <StatusBadge status={getVendorDisplayStatus(b.status, b.payment_status)} variant="small" />
                      </div>
                    </div>
                  </div>
                ))}
                {stats.recentBookings.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No bookings yet</p>
                    <p className="text-sm text-gray-400">Your recent bookings will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Transactions - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                  Recent Transactions
                </h3>
                <span className="text-xs sm:text-sm text-gray-300">{stats.recentTransactions.length} recent</span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {stats.recentTransactions.map((t) => (
                  <div key={t.id} className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 transition-all duration-200 rounded-lg p-3 sm:p-4 border border-gray-600/50 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      {/* Transaction Icon and Type */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          t.transaction_type === 'payment' ? 'bg-emerald-900/50 border border-emerald-700/50' : 'bg-blue-900/50 border border-blue-700/50'
                        }`}>
                          {t.transaction_type === 'payment' ? (
                            <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-blue-400" />
                          )}
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white capitalize leading-tight">
                              {t.transaction_type === 'payment' ? 'Payment Received' : 'Withdrawal'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{formatDateTime(t.created_at)}</p>
                            {t.description && (
                              <p className="text-xs text-gray-500 mt-1 truncate">{t.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <p className={`text-sm font-bold ${
                              t.transaction_type === 'payment' ? 'text-emerald-400' : 'text-blue-400'
                            }`}>
                              {t.transaction_type === 'payment' ? '+' : '-'}{formatCurrencyWithConversion(t.amount, t.currency, selectedCurrency || t.currency, selectedLanguage || 'en-US')}
                            </p>
                            <StatusBadge status={t.status} variant="small" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {stats.recentTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No transactions yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your recent transactions will appear here</p>
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
