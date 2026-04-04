import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getServices, getAllBookings, getAllTransactions } from '../../lib/database'
import { LoadingSpinner } from '../../components/LoadingSpinner'

function formatCurrency(v: number | null | undefined) {
  if (!v && v !== 0) return '—'
  return `UGX ${Number(v).toLocaleString()}`
}

function lastNMonths(n = 6) {
  const result: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(d.toISOString().slice(0, 7)) // YYYY-MM
  }
  return result
}

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
        const paidBookings = vendorBookings.filter((b: any) => (b.payment_status || b.paymentStatus || '').toLowerCase().includes('paid')).length
        const pendingBookings = vendorBookings.filter((b: any) => (b.status || '').toLowerCase() === 'pending').length
        const canceledBookings = vendorBookings.filter((b: any) => (b.status || '').toLowerCase() === 'cancelled' || (b.status || '').toLowerCase() === 'canceled').length
        const totalRevenue = vendorTransactions.reduce((s: number, t: any) => s + (t.amount || 0), 0)
        const totalTransactions = vendorTransactions.length

        // Monthly bookings for last 6 months
        const months = lastNMonths(6)
        const bookingsByMonth: Record<string, number> = {}
        months.forEach(m => (bookingsByMonth[m] = 0))
        for (const b of vendorBookings) {
          const date = b.created_at || b.service_date || b.start_time
          if (!date) continue
          const month = new Date(date).toISOString().slice(0, 7)
          if (bookingsByMonth[month] !== undefined) bookingsByMonth[month]++
        }

        setStats({
          servicesCount: services.length,
          totalBookings,
          paidBookings,
          pendingBookings,
          canceledBookings,
          totalRevenue,
          totalTransactions,
          topServices,
          bookingsByMonth,
          months,
          recentBookings: vendorBookings.sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime()).slice(0, 10),
        })
      } catch (err) {
        console.error('Failed to load vendor performance:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [vendorId])

  const averageBookingValue = useMemo(() => {
    if (!stats) return null
    return stats.totalBookings ? Math.round(stats.totalRevenue / stats.totalBookings) : 0
  }, [stats])

  function exportCSV() {
    if (!stats) return
    const rows: any[] = []
    rows.push(['Metric', 'Value'])
    rows.push(['Services', stats.servicesCount])
    rows.push(['Total Bookings', stats.totalBookings])
    rows.push(['Paid Bookings', stats.paidBookings])
    rows.push(['Pending Bookings', stats.pendingBookings])
    rows.push(['Canceled Bookings', stats.canceledBookings])
    rows.push(['Total Revenue', stats.totalRevenue])
    rows.push(['Total Transactions', stats.totalTransactions])

    const csv = rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendor-performance-${vendorId || 'unknown'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Performance Report</h1>
          <p className="text-sm text-gray-600">Overview of your business performance — key metrics and trends to help you act.</p>
        </div>
        <div>
          <button onClick={exportCSV} className="bg-sky-600 text-white px-3 py-1 rounded">Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Services</div>
          <div className="text-xl font-bold">{stats?.servicesCount}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Bookings</div>
          <div className="text-xl font-bold">{stats?.totalBookings}</div>
          <div className="text-xs text-gray-500">Paid: {stats?.paidBookings} • Pending: {stats?.pendingBookings}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Revenue</div>
          <div className="text-xl font-bold">{formatCurrency(stats?.totalRevenue)}</div>
          <div className="text-xs text-gray-500">Transactions: {stats?.totalTransactions}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow"> 
          <div className="text-sm text-gray-500">Avg. Booking Value</div>
          <div className="text-xl font-bold">{formatCurrency(averageBookingValue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-semibold mb-2">Bookings — last 6 months</h2>
          <div className="flex space-x-2 text-sm text-gray-600 mb-2">
            {stats.months.map((m: string) => (
              <div key={m} className="flex-1 text-center">
                <div className="text-lg font-medium">{stats.bookingsByMonth[m] || 0}</div>
                <div className="text-xs">{m}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">Trend shows bookings created in the last 6 months. Use this to spot seasonality.</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-semibold mb-2">Top Services</h2>
          <div className="space-y-2">
            {stats?.topServices?.length ? stats.topServices.slice(0,8).map((s: any) => (
              <div key={s.id} className="flex justify-between text-sm">
                <div className="truncate pr-4">{s.title}</div>
                <div className="text-gray-500">{s.bookings}</div>
              </div>
            )) : <div className="text-sm text-gray-500">No data</div>}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-sm font-semibold mb-3">Recent Bookings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2">Booking</th>
                <th className="py-2">Service</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBookings.length ? stats.recentBookings.map((b: any) => (
                <tr key={b.id} className="border-t">
                  <td className="py-2"><a className="text-sky-600" href={`/booking/${b.id}`}>#{b.id?.slice ? b.id.slice(0,8) : b.id}</a></td>
                  <td className="py-2">{b.service_title || b.service_title || '—'}</td>
                  <td className="py-2">{b.tourist_name || b.tourist_email || '—'}</td>
                  <td className="py-2">{formatCurrency(b.amount || b.total_amount || b.price)}</td>
                  <td className="py-2">{b.status || b.booking_status || '—'}</td>
                  <td className="py-2">{new Date(b.created_at || b.createdAt || 0).toLocaleDateString()}</td>
                </tr>
              )) : <tr><td colSpan={6} className="py-4 text-gray-500">No recent bookings</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-sm font-semibold mb-2">Actionable insights</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {stats.totalBookings === 0 && <li>No bookings yet — promote your services on social channels and review pricing.</li>}
          {stats.totalBookings > 0 && (stats.paidBookings / Math.max(1, stats.totalBookings) < 0.6) && <li>Paid conversion is low. Consider offering flexible payment options or clearer cancellation terms.</li>}
          {stats.topServices && stats.topServices.length > 0 && <li>Promote your top service <strong>{stats.topServices[0].title}</strong> — it drives most bookings.</li>}
          <li>Use the Export CSV button to share these metrics with stakeholders.</li>
        </ul>
      </div>
    </div>
  )
}
