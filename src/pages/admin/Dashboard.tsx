import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../../lib/utils'
import { getDashboardStats } from '../../lib/database'
import StatCard from '../../components/StatCard'
import {
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Package,
  DollarSign,
  MessageSquare
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

export default function Dashboard() {
  const navigate = useNavigate()
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Monitor your platform's performance and manage operations
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatCard
            title="Total Vendors"
            value={stats.totalVendors}
            icon={Store}
            color="blue"
            trend={stats.pendingVendors > 0 ? `+${stats.pendingVendors} pending` : undefined}
            subtitle={`${stats.pendingVendors} awaiting approval`}
            onClick={() => navigate('/admin/vendors')}
          />

          <StatCard
            title="Total Tourists"
            value={stats.totalTourists}
            icon={Users}
            color="orange"
            trend="Active users"
            subtitle="Registered tourists"
            onClick={() => navigate('/admin/users')}
          />

          <StatCard
            title="Total Services"
            value={stats.totalServices}
            icon={Package}
            color="green"
            trend={stats.pendingServices > 0 ? `+${stats.pendingServices} pending` : undefined}
            subtitle={`${stats.pendingServices} under review`}
            onClick={() => navigate('/admin/services')}
          />

          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            icon={Activity}
            color="purple"
            trend="+12% this month"
            subtitle="Across all services"
            onClick={() => navigate('/admin/bookings')}
          />

          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            color="teal"
            trend="+18% this month"
            subtitle="Platform earnings"
            onClick={() => navigate('/admin/transactions')}
          />

          <StatCard
            title="Messages"
            value="12" // This would come from stats.totalMessages in a real implementation
            icon={MessageSquare}
            color="indigo"
            trend="3 unread"
            subtitle="Customer support"
            onClick={() => navigate('/admin/messages')}
          />
        </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Bookings */}
        <div className="bg-white shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
            <div className="p-2 bg-purple-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-4">
            {stats.recentBookings.length > 0 ? (
              stats.recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 transition-colors duration-200">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {booking.services?.title || 'Unknown Service'}
                    </p>
                    <p className="text-xs text-gray-300">
                      by {booking.profiles?.full_name || 'Unknown User'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(booking.total_amount)}
                    </p>
                    <div className="flex items-center justify-end mt-1">
                      {booking.status === 'confirmed' ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          <span className="text-xs font-medium">Confirmed</span>
                        </div>
                      ) : booking.status === 'cancelled' ? (
                        <div className="flex items-center text-red-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          <span className="text-xs font-medium">Cancelled</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-600">
                          <Clock className="h-3 w-3 mr-1" />
                          <span className="text-xs font-medium capitalize">{booking.status}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No recent bookings</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Vendors */}
        <div className="bg-white shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Vendor Applications</h3>
            <div className="p-2 bg-blue-600">
              <Store className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="space-y-4">
            {stats.recentVendors.length > 0 ? (
              stats.recentVendors.map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 transition-colors duration-200">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {vendor.business_name}
                    </p>
                    <p className="text-xs text-gray-300">
                      {vendor.profiles?.full_name} • {vendor.profiles?.email}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {vendor.status === 'approved' ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Approved</span>
                      </div>
                    ) : vendor.status === 'rejected' ? (
                      <div className="flex items-center text-red-600">
                        <XCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Rejected</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium capitalize">{vendor.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No recent applications</p>
              </div>
            )}
          </div>
        </div>
      </div>        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 font-medium">
              <Store className="h-4 w-4 mr-2" />
              Review Vendors
            </button>
            <button className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 font-medium">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Review Services
            </button>
            <button className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 font-medium">
              <Users className="h-4 w-4 mr-2" />
              View All Bookings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}