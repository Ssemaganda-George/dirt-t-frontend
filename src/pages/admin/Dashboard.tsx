import { useEffect, useState } from 'react'
import { formatCurrency } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import {
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface DashboardStats {
  totalVendors: number
  pendingVendors: number
  totalServices: number
  pendingServices: number
  totalBookings: number
  totalRevenue: number
  recentBookings: any[]
  recentVendors: any[]
}

// Mock data for demonstration
const mockVendors = [
  { id: '1', business_name: 'Safari Adventures Ltd', status: 'approved', created_at: '2024-01-15T10:00:00Z', profiles: { full_name: 'Doe', email: 'john@safari.com' } },
  { id: '2', business_name: 'Mountain Guides Co', status: 'pending', created_at: '2024-01-16T11:00:00Z', profiles: { full_name: 'Smith', email: 'jane@mountain.com' } },
  { id: '3', business_name: 'Cultural Tours Inc', status: 'approved', created_at: '2024-01-17T12:00:00Z', profiles: { full_name: 'Wilson', email: 'mike@cultural.com' } },
  { id: '4', business_name: 'Beach Resort Services', status: 'pending', created_at: '2024-01-18T13:00:00Z', profiles: { full_name: 'Johnson', email: 'sarah@beach.com' } },
  { id: '5', business_name: 'Wildlife Photography', status: 'approved', created_at: '2024-01-19T14:00:00Z', profiles: { full_name: 'Brown', email: 'david@wildlife.com' } }
]

const mockServices = [
  { id: '1', title: '3-Day Safari Experience', status: 'approved' },
  { id: '2', title: 'Mountain Climbing Adventure', status: 'pending' },
  { id: '3', title: 'Cultural Heritage Tour', status: 'approved' },
  { id: '4', title: 'Beach Resort Package', status: 'pending' },
  { id: '5', title: 'Wildlife Photography Workshop', status: 'approved' },
  { id: '6', title: 'City Walking Tour', status: 'draft' }
]

const mockBookings = [
  { 
    id: '1', 
    total_amount: 1200, 
    status: 'confirmed', 
    created_at: '2024-01-20T10:00:00Z',
    services: { title: '3-Day Safari Experience', vendors: { business_name: 'Safari Adventures Ltd' } },
    profiles: { full_name: 'Cooper' }
  },
  { 
    id: '2', 
    total_amount: 800, 
    status: 'pending', 
    created_at: '2024-01-20T11:00:00Z',
    services: { title: 'Mountain Climbing Adventure', vendors: { business_name: 'Mountain Guides Co' } },
    profiles: { full_name: 'Martin' }
  },
  { 
    id: '3', 
    total_amount: 450, 
    status: 'confirmed', 
    created_at: '2024-01-20T12:00:00Z',
    services: { title: 'Cultural Heritage Tour', vendors: { business_name: 'Cultural Tours Inc' } },
    profiles: { full_name: 'Davis' }
  },
  { 
    id: '4', 
    total_amount: 2000, 
    status: 'cancelled', 
    created_at: '2024-01-20T13:00:00Z',
    services: { title: 'Beach Resort Package', vendors: { business_name: 'Beach Resort Services' } },
    profiles: { full_name: 'Wilson' }
  },
  { 
    id: '5', 
    total_amount: 600, 
    status: 'confirmed', 
    created_at: '2024-01-20T14:00:00Z',
    services: { title: 'Wildlife Photography Workshop', vendors: { business_name: 'Wildlife Photography' } },
    profiles: { full_name: 'Thompson' }
  }
]

const mockTransactions = [
  { amount: 1200, status: 'completed' },
  { amount: 450, status: 'completed' },
  { amount: 600, status: 'completed' },
  { amount: 800, status: 'completed' },
  { amount: 350, status: 'completed' }
]

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalVendors: 0,
    pendingVendors: 0,
    totalServices: 0,
    pendingServices: 0,
    totalBookings: 0,
    totalRevenue: 0,
    recentBookings: [],
    recentVendors: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Calculate stats from mock data
      const totalRevenue = mockTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      setStats({
        totalVendors: mockVendors.length,
        pendingVendors: mockVendors.filter(v => v.status === 'pending').length,
        totalServices: mockServices.length,
        pendingServices: mockServices.filter(s => s.status === 'pending').length,
        totalBookings: mockBookings.length,
        totalRevenue,
        recentBookings: mockBookings.slice(0, 5), 
        recentVendors: mockVendors.slice(0, 5) 
      })
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {profile?.full_name || 'Admin'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Store className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Vendors
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.totalVendors}
                  </div>
                  {stats.pendingVendors > 0 && (
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-yellow-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {stats.pendingVendors} pending
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingBag className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Services
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.totalServices}
                  </div>
                  {stats.pendingServices > 0 && (
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-yellow-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {stats.pendingServices} pending
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Bookings
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {stats.totalBookings}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Revenue
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(stats.totalRevenue)}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Bookings</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {stats.recentBookings.length > 0 ? (
              stats.recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {booking.services?.title || 'Unknown Service'}
                    </p>
                    <p className="text-xs text-gray-500">
                      by {booking.profiles?.full_name || 'Unknown User'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.total_amount)}
                    </p>
                    <div className="flex items-center">
                      {booking.status === 'confirmed' ? (
                        <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                      ) : booking.status === 'cancelled' ? (
                        <XCircle className="h-3 w-3 text-red-500 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 text-yellow-500 mr-1" />
                      )}
                      <span className="text-xs text-gray-500 capitalize">
                        {booking.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent bookings</p>
            )}
          </div>
        </div>

        {/* Recent Vendors */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Vendor Applications</h3>
            <Store className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {stats.recentVendors.length > 0 ? (
              stats.recentVendors.map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {vendor.business_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {vendor.profiles?.full_name} • {vendor.profiles?.email}
                    </p>
                  </div>
                  <div className="flex items-center">
                    {vendor.status === 'approved' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    ) : vendor.status === 'rejected' ? (
                      <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                    )}
                    <span className="text-xs text-gray-500 capitalize">
                      {vendor.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent applications</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="btn-primary flex items-center justify-center">
            <Store className="h-4 w-4 mr-2" />
            Review Vendors
          </button>
          <button className="btn-secondary flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Review Services
          </button>
          <button className="btn-secondary flex items-center justify-center">
            <Users className="h-4 w-4 mr-2" />
            View All Bookings
          </button>
        </div>
      </div>
    </div>
  )
}