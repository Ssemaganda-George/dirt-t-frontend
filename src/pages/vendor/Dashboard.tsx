import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getVendorStats } from '../../lib/database'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDateTime, getVendorDisplayStatus } from '../../lib/utils'
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

  // Check if user is a vendor and set vendorId accordingly
  useEffect(() => {
    const checkVendorStatus = async () => {
      if (authLoading || !user?.id) {
        return
      }

      try {
        // First check if user has vendor role in profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          setVendorId(null)
          setVendorLoading(false)
          return
        }

        if (profile.role !== 'vendor' || profile.status !== 'approved') {
          setVendorId(null)
          setVendorLoading(false)
          return
        }

        // User is an approved vendor, try to get their vendor record
        let vendorIdToUse = user.id // Default fallback

        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (vendorError) {
          console.warn('Could not fetch vendor record:', vendorError)
          
          // Try to create vendor record if it doesn't exist
          const { data: newVendor, error: createError } = await supabase
            .from('vendors')
            .insert([{
              user_id: user.id,
              business_name: 'Business Name',
              business_description: 'Please update your business description',
              business_email: user.email || '',
              status: 'approved'
            }])
            .select('id')
            .single()

          if (createError) {
            if (createError.code === '23505') {
              // Record already exists, try to fetch it again
              const { data: existingVendor, error: fetchError } = await supabase
                .from('vendors')
                .select('id')
                .eq('user_id', user.id)
                .single()
              
              if (!fetchError && existingVendor) {
                vendorIdToUse = existingVendor.id
              } else {
                console.error('Still cannot fetch vendor record after creation attempt:', fetchError)
                // Use user ID as fallback - the updated RLS policy should handle this
                vendorIdToUse = user.id
              }
            } else {
              console.error('Error creating vendor record:', createError)
              // Use user ID as fallback
              vendorIdToUse = user.id
            }
          } else if (newVendor) {
            vendorIdToUse = newVendor.id
          }
        } else if (vendor) {
          vendorIdToUse = vendor.id
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

  const refresh = async () => {
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
  }

  useEffect(() => { 
    if (vendorId && !vendorLoading) {
      refresh() 
    }
  }, [vendorId, vendorLoading])

  // Set up real-time subscriptions for wallet and transaction updates
  useEffect(() => {
    if (authLoading || !vendorId || vendorLoading) return

    console.log('Dashboard: Setting up real-time subscriptions for vendor:', vendorId)

    // Subscribe to wallets changes for this vendor (affects balance stat)
    const walletsSubscription = supabase
      .channel('dashboard_wallets_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallets',
        filter: `vendor_id=eq.${vendorId}`
      }, (payload: any) => {
        console.log('Dashboard: Real-time wallet change:', payload)
        // Refresh stats when wallet changes
        refresh()
      })
      .subscribe()

    // Subscribe to transactions changes for this vendor (affects balance stat)
    const transactionsSubscription = supabase
      .channel('dashboard_transactions_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `vendor_id=eq.${vendorId}`
      }, (payload: any) => {
        console.log('Dashboard: Real-time transaction change:', payload)
        // Refresh stats when transactions change
        refresh()
      })
      .subscribe()

    // Cleanup subscriptions
    return () => {
      walletsSubscription.unsubscribe()
      transactionsSubscription.unsubscribe()
    }
  }, [authLoading, vendorId, vendorLoading])

  if (loading || vendorLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {profile?.full_name || 'Vendor'}!</p>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
            value={formatCurrency(stats.balance, stats.currency)}
            icon={DollarSign}
            color={stats.balanceStatus === 'critical' ? 'red' : stats.balanceStatus === 'warning' ? 'yellow' : 'teal'}
            trend={stats.balanceTrend}
            subtitle={
              stats.pendingBalance > 0 
                ? `${formatCurrency(stats.pendingBalance, stats.currency)} pending • ${stats.balanceStatus === 'critical' ? 'Low balance' : stats.balanceStatus === 'warning' ? 'Balance running low' : 'Available earnings'}`
                : stats.balanceStatus === 'critical' 
                  ? 'Low balance - consider adding funds' 
                  : stats.balanceStatus === 'warning' 
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Recent Bookings - Takes 2 columns */}
        <div className="xl:col-span-2">
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
                          <p className="font-medium text-white text-sm sm:text-base truncate">{b.services?.title || b.service_id}</p>
                          <p className="text-xs sm:text-sm text-gray-300">{formatDateTime(b.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-shrink-0">
                        <span className="font-semibold text-white text-sm sm:text-base">{formatCurrency(b.total_amount, b.currency)}</span>
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
        <div className="xl:col-span-1">
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
                              {t.transaction_type === 'payment' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
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
