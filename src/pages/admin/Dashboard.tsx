import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCurrencyWithConversion } from '../../lib/utils'
import { getDashboardStats } from '../../lib/database'
import { usePreferences } from '../../contexts/PreferencesContext'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import {
  Users,
  Store,
  ShoppingBag,
  Activity,
  Package,
  DollarSign,
  MessageSquare,
  ChevronRight
} from 'lucide-react'

interface DashboardStats {
  totalVendors: number
  pendingVendors: number
  totalTourists: number
  totalServices: number
  pendingServices: number
  totalBookings: number
  totalRevenue: number
  totalMessages: number
  recentBookings: any[]
  recentVendors: any[]
}

// ============================================================================
// Components
// ============================================================================

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  color: string
  onClick?: () => void
}

interface RecentItemProps {
  title: string
  subtitle: string
  amount?: string
  status: string
  onClick?: () => void
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color, onClick }) => {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-l-4 border-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-l-4 border-green-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-l-4 border-purple-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-l-4 border-orange-600' }
  }

  const colorConfig = colorClasses[color] || colorClasses.blue
  
  // Adaptive font sizing based on value length
  const valueStr = String(value)
  let valueFontSize = 'text-2xl'
  if (valueStr.length > 20) {
    valueFontSize = 'text-sm'
  } else if (valueStr.length > 15) {
    valueFontSize = 'text-base'
  } else if (valueStr.length > 10) {
    valueFontSize = 'text-lg'
  }

  return (
    <button
      onClick={onClick}
      className={`text-left bg-white rounded-xl shadow-sm ${colorConfig.border} border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer h-full`}
    >
      <div className="flex items-start justify-between gap-3 h-full flex-col">
        <div className="w-full">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider line-clamp-2">{title}</p>
        </div>
        <div className="w-full flex-1 flex flex-col justify-center">
          <p className={`${valueFontSize} font-semibold text-gray-900 break-words line-clamp-2`}>{value}</p>
        </div>
        <div className="w-full flex items-end justify-between gap-2">
          <div className="flex-1">
            {trend && (
              <p className={`text-xs font-medium ${colorConfig.text} line-clamp-2`}>
                {trend}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${colorConfig.bg} ${colorConfig.text} flex-shrink-0`}>
            {icon}
          </div>
        </div>
      </div>
    </button>
  )
}

const RecentItem: React.FC<RecentItemProps> = ({ title, subtitle, amount, status, onClick }) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
        return { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-800' }
      case 'cancelled':
      case 'rejected':
        return { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' }
      case 'pending':
        return { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' }
      default:
        return { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' }
    }
  }

  const styles = getStatusStyles(status)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border border-gray-200 rounded-lg hover:${styles.bg} hover:border-gray-300 transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-600 mt-1 truncate">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {amount && <p className="text-sm font-bold text-gray-900">{amount}</p>}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles.badge} whitespace-nowrap`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>
    </button>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function Dashboard() {
  const navigate = useNavigate()
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [stats, setStats] = useState<DashboardStats>({
    totalVendors: 0,
    pendingVendors: 0,
    totalTourists: 0,
    totalServices: 0,
    pendingServices: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalMessages: 0,
    recentBookings: [],
    recentVendors: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const data = await getDashboardStats()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor platform performance and manage operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Vendors"
          value={stats.totalVendors}
          icon={<Store className="h-4 w-4" />}
          trend={stats.pendingVendors > 0 ? `${stats.pendingVendors} pending approval` : 'All approved'}
          color="blue"
          onClick={() => navigate('/admin/vendors')}
        />

        <StatCard
          title="Active Tourists"
          value={stats.totalTourists}
          icon={<Users className="h-4 w-4" />}
          trend="Registered users"
          color="orange"
          onClick={() => navigate('/admin/tourists')}
        />

        <StatCard
          title="Total Services"
          value={stats.totalServices}
          icon={<Package className="h-4 w-4" />}
          trend={stats.pendingServices > 0 ? `${stats.pendingServices} under review` : 'All published'}
          color="green"
          onClick={() => navigate('/admin/services')}
        />

        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={<Activity className="h-4 w-4" />}
          trend="Across all services"
          color="purple"
          onClick={() => navigate('/admin/bookings')}
        />

        <StatCard
          title="Platform Revenue"
          value={formatCurrencyWithConversion(stats.totalRevenue, 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
          icon={<DollarSign className="h-4 w-4" />}
          trend="All earnings"
          color="blue"
          onClick={() => navigate('/admin/dirt-trails-wallet')}
        />

        <StatCard
          title="Messages"
          value={stats.totalMessages}
          icon={<MessageSquare className="h-4 w-4" />}
          trend="Customer support"
          color="orange"
          onClick={() => navigate('/admin/messages')}
        />
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Recent Bookings</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest transactions on the platform</p>
            </div>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
              title="View all bookings"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            {stats.recentBookings.length > 0 ? (
              <div className="space-y-2">
                {stats.recentBookings.slice(0, 5).map((booking) => (
                  <RecentItem
                    key={booking.id}
                    title={booking.services?.title || 'Unknown Service'}
                    subtitle={`by ${booking.profiles?.full_name || 'Unknown User'}`}
                    amount={formatCurrencyWithConversion(booking.total_amount, booking.currency || 'UGX', selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                    status={booking.status}
                    onClick={() => navigate(`/admin/bookings`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No recent bookings</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Vendor Applications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Recent Vendors</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest vendor applications</p>
            </div>
            <button
              onClick={() => navigate('/admin/vendors')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
              title="View all vendors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            {stats.recentVendors.length > 0 ? (
              <div className="space-y-2">
                {stats.recentVendors.slice(0, 5).map((vendor) => (
                  <RecentItem
                    key={vendor.id}
                    title={vendor.business_name}
                    subtitle={`${vendor.profiles?.full_name}`}
                    status={vendor.status}
                    onClick={() => navigate(`/admin/vendors`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No recent applications</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/admin/vendors')}
              className="flex items-center justify-center gap-2.5 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Store className="h-4 w-4" />
              Review Vendors
            </button>
            <button
              onClick={() => navigate('/admin/services')}
              className="flex items-center justify-center gap-2.5 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Review Services
            </button>
            <button
              onClick={() => navigate('/admin/bookings')}
              className="flex items-center justify-center gap-2.5 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Users className="h-4 w-4" />
              View All Bookings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}