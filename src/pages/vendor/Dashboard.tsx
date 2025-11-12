import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getServices, getBookings, getTransactions, getWallet } from '../../store/vendorStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <button onClick={refresh} className="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50">Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Services" value={servicesCount} />
        <StatCard title="Pending Bookings" value={pendingBookings} />
        <StatCard title="Completed Bookings" value={completedBookings} />
        <StatCard title="Wallet Balance" value={formatCurrency(balance, currency)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Bookings</h3>
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.service?.name || b.service_id}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(b.created_at)}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">{formatCurrency(b.total_amount, b.currency)}</span>
                    <StatusBadge status={b.status} variant="small" />
                  </div>
                </div>
              ))}
              {recentBookings.length === 0 && <p className="text-sm text-gray-500">No bookings yet.</p>}
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {recentTx.map((t) => (
                <div key={t.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{t.transaction_type}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(t.created_at)}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-700">{formatCurrency(t.amount, t.currency)}</span>
                    <StatusBadge status={t.status} variant="small" />
                  </div>
                </div>
              ))}
              {recentTx.length === 0 && <p className="text-sm text-gray-500">No transactions yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white shadow rounded-lg p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}
