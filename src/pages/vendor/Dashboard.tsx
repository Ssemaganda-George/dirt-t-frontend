import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getServices, getBookings, getTransactions, getWallet } from '../../store/vendorStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default function VendorDashboard() {
  const { profile } = useAuth()
  const vendorId = profile?.id || 'vendor_demo'

  const [servicesCount, setServicesCount] = useState(0)
  const [pendingBookings, setPendingBookings] = useState(0)
  const [completedBookings, setCompletedBookings] = useState(0)
  const [balance, setBalance] = useState(0)
  const [currency, setCurrency] = useState('UGX')
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [recentTx, setRecentTx] = useState<any[]>([])

  const refresh = () => {
    const services = getServices(vendorId)
    const bookings = getBookings(vendorId)
    const tx = getTransactions(vendorId)
    const wallet = getWallet(vendorId)

    setServicesCount(services.length)
    setPendingBookings(bookings.filter(b => b.status === 'pending').length)
    setCompletedBookings(bookings.filter(b => b.status === 'completed').length)
    setBalance(wallet.balance)
    setCurrency(wallet.currency)
    setRecentBookings(bookings.slice(0, 5))
    setRecentTx(tx.slice(0, 5))
  }

  useEffect(() => { refresh() }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {profile?.full_name || 'Vendor'}!</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Services" 
          value={servicesCount} 
          icon={MapPin}
          color="blue"
          trend="+12%"
        />
        <StatCard 
          title="Pending Bookings" 
          value={pendingBookings} 
          icon={Clock}
          color="yellow"
          trend="+5%"
        />
        <StatCard 
          title="Completed Bookings" 
          value={completedBookings} 
          icon={CheckCircle}
          color="green"
          trend="+18%"
        />
        <StatCard 
          title="Wallet Balance" 
          value={formatCurrency(balance, currency)} 
          icon={DollarSign}
          color="purple"
          trend="+24%"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Bookings - Takes 2 columns */}
        <div className="xl:col-span-2">
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Recent Bookings
                </h3>
                <span className="text-sm text-gray-500">{recentBookings.length} total</span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{b.service?.name || b.service_id}</p>
                        <p className="text-sm text-gray-500">{formatDateTime(b.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-gray-900">{formatCurrency(b.total_amount, b.currency)}</span>
                      <StatusBadge status={b.status} variant="small" />
                    </div>
                  </div>
                ))}
                {recentBookings.length === 0 && (
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
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Transactions
                </h3>
                <span className="text-sm text-gray-500">{recentTx.length} recent</span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentTx.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        t.transaction_type === 'payment' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {t.transaction_type === 'payment' ? (
                          <ArrowDownRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">{t.transaction_type}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(t.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(t.amount, t.currency)}</p>
                      <StatusBadge status={t.status} variant="small" />
                    </div>
                  </div>
                ))}
                {recentTx.length === 0 && (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No transactions yet</p>
                    <p className="text-sm text-gray-400">Your transactions will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend 
}: { 
  title: string; 
  value: any; 
  icon: any; 
  color: 'blue' | 'yellow' | 'green' | 'purple'; 
  trend: string;
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      gradient: 'from-blue-500 to-blue-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      icon: 'text-yellow-600',
      gradient: 'from-yellow-500 to-yellow-600'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      gradient: 'from-green-500 to-green-600'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      gradient: 'from-purple-500 to-purple-600'
    }
  }

  const colors = colorClasses[color]

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${colors.icon}`} />
        </div>
        <div className="text-right">
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  )
}
