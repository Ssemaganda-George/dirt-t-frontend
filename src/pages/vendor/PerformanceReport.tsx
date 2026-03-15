import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getServices, getAllBookings, getAllTransactions } from '../../lib/database'
import { LoadingSpinner } from '../../components/LoadingSpinner'

export default function VendorPerformanceReport() {
  const { vendor, profile } = useAuth()
  const vendorId = vendor?.id || profile?.id || null
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const services = vendorId ? await getServices(vendorId) : []
        const bookings = await getAllBookings()
        const transactions = await getAllTransactions()

        const vendorBookings = bookings.filter((b: any) => b.vendor_id === vendorId)
        const vendorTransactions = transactions.filter((t: any) => t.vendor_id === vendorId)

        // Top services by bookings
        const serviceCounts: Record<string, number> = {}
        for (const b of vendorBookings) {
          serviceCounts[b.service_id] = (serviceCounts[b.service_id] || 0) + 1
        }

        const topServices = services
          .map(s => ({ id: s.id, title: s.title, bookings: serviceCounts[s.id] || 0 }))
          .sort((a, b) => b.bookings - a.bookings)

        const totalBookings = vendorBookings.length
        const totalRevenue = vendorTransactions.reduce((s: number, t: any) => s + (t.amount || 0), 0)
        const totalTransactions = vendorTransactions.length

        setStats({ servicesCount: services.length, totalBookings, totalRevenue, totalTransactions, topServices })
      } catch (err) {
        console.error('Failed to load vendor performance:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [vendorId])

  if (loading) return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Performance Report</h1>
          <p className="text-sm text-gray-600">Overview of your business performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Services</div>
          <div className="text-xl font-bold">{stats?.servicesCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Bookings</div>
          <div className="text-xl font-bold">{stats?.totalBookings}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Revenue</div>
          <div className="text-xl font-bold">UGX {stats?.totalRevenue?.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-sm font-semibold mb-2">Top Services by Bookings</h2>
        <div className="space-y-2">
          {stats?.topServices?.length ? stats.topServices.slice(0,5).map((s: any) => (
            <div key={s.id} className="flex justify-between text-sm">
              <div>{s.title}</div>
              <div className="text-gray-500">{s.bookings} bookings</div>
            </div>
          )) : <div className="text-sm text-gray-500">No data</div>}
        </div>
      </div>
    </div>
  )
}
