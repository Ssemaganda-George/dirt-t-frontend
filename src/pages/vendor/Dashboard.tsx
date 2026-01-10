import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getVendorStats } from '../../lib/database'
import { formatCurrency, formatDateTime } from '../../lib/utils'
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
  ArrowDownRight
} from 'lucide-react'

export default function VendorDashboard() {
  const { profile } = useAuth()
  const vendorId = profile?.id

  const [stats, setStats] = useState({
    servicesCount: 0,
    pendingBookings: 0,
    completedBookings: 0,
    balance: 0,
    currency: 'UGX',
    recentBookings: [] as any[],
    recentTransactions: [] as any[]
  })
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!vendorId) return

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

  useEffect(() => { refresh() }, [vendorId])

  if (loading) {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Services"
            value={stats.servicesCount}
            icon={MapPin}
            color="blue"
            trend="+12% this month"
            subtitle="Active listings"
          />
          <StatCard
            title="Pending Bookings"
            value={stats.pendingBookings}
            icon={Clock}
            color="yellow"
            trend="+5% this week"
            subtitle="Awaiting confirmation"
          />
          <StatCard
            title="Completed Bookings"
            value={stats.completedBookings}
            icon={CheckCircle}
            color="green"
            trend="+18% this month"
            subtitle="Successfully completed"
          />
          <StatCard
            title="Wallet Balance"
            value={formatCurrency(stats.balance, stats.currency)}
            icon={DollarSign}
            color="teal"
            trend="+24% this month"
            subtitle="Available earnings"
          />
        </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Bookings - Takes 2 columns */}
        <div className="xl:col-span-2">
          <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-300" />
                  Recent Bookings
                </h3>
                <span className="text-sm text-gray-300">{stats.recentBookings.length} total</span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.recentBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{b.service?.name || b.service_id}</p>
                        <p className="text-sm text-gray-300">{formatDateTime(b.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-white">{formatCurrency(b.total_amount, b.currency)}</span>
                      <StatusBadge status={b.status} variant="small" />
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
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-300" />
                  Transactions
                </h3>
                <span className="text-sm text-gray-300">{stats.recentTransactions.length} recent</span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 border border-gray-600 hover:border-gray-500 transition-colors bg-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        t.transaction_type === 'payment' ? 'bg-green-800' : 'bg-blue-800'
                      }`}>
                        {t.transaction_type === 'payment' ? (
                          <ArrowDownRight className="h-4 w-4 text-green-300" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-blue-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white capitalize">{t.transaction_type}</p>
                        <p className="text-xs text-gray-300">{formatDateTime(t.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(t.amount, t.currency)}</p>
                      <StatusBadge status={t.status} variant="small" />
                    </div>
                  </div>
                ))}
                {stats.recentTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No transactions yet</p>
                    <p className="text-sm text-gray-400">Your transactions will appear here</p>
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
