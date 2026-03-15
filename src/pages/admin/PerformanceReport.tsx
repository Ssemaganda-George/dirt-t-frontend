import { useEffect, useState } from 'react'
import { getAllBookings, getAllTransactionsForAdmin, getAllVendorsWithActivity, getAllReviewsForAdmin, getServices } from '../../lib/database'
import { LoadingSpinner } from '../../components/LoadingSpinner'

export default function AdminPerformanceReport() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [bookings, transactions, vendors, reviews, services] = await Promise.all([
          getAllBookings(),
          getAllTransactionsForAdmin(),
          getAllVendorsWithActivity(),
          getAllReviewsForAdmin(),
          getServices()
        ])

        const uniqueVisitors = new Set(bookings.map((b: any) => b.tourist_id)).size
        const totalBookings = bookings.length
        const totalTransactions = transactions.length
        const totalRevenue = transactions.reduce((s: number, t: any) => s + (t.amount || 0), 0)
        const totalVendors = vendors.length
        const totalServices = services.length
        const totalReviews = reviews.length

        setStats({ uniqueVisitors, totalBookings, totalTransactions, totalRevenue, totalVendors, totalServices, totalReviews })
      } catch (err) {
        console.error('Failed to load admin performance:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Performance Report</h1>
          <p className="text-sm text-gray-600">Platform-wide statistics and KPIs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Unique Visitors</div>
          <div className="text-xl font-bold">{stats?.uniqueVisitors}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Total Bookings</div>
          <div className="text-xl font-bold">{stats?.totalBookings}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Total Transactions</div>
          <div className="text-xl font-bold">{stats?.totalTransactions}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-xl font-bold">UGX {stats?.totalRevenue?.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Vendors</div>
          <div className="text-xl font-bold">{stats?.totalVendors}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Services</div>
          <div className="text-xl font-bold">{stats?.totalServices}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Reviews</div>
          <div className="text-xl font-bold">{stats?.totalReviews}</div>
        </div>
      </div>
    </div>
  )
}
