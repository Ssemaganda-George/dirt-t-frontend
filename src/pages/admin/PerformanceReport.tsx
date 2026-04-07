import { useEffect, useState } from 'react'
import { getAllBookings, getAllTransactionsForAdmin, getAllVendorsWithActivity, getAllReviewsForAdmin, getServices } from '../../lib/database'
import { LoadingSpinner } from '../../components/LoadingSpinner'

function formatCurrency(v: number | null | undefined) {
  if (!v && v !== 0) return '—'
  return `UGX ${Number(v).toLocaleString()}`
}

function formatPaymentMethod(value: unknown) {
  if (!value) return '—'
  return String(value).replace(/_/g, ' ').trim()
}

function lastNMonths(n = 6) {
  const result: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(d.toISOString().slice(0, 7))
  }
  return result
}

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
        const totalRevenue = transactions.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0)
        const totalVendors = vendors.length
        const totalServices = services.length
        const totalReviews = reviews.length

        // Top vendors by revenue
        const revenueByVendor: Record<string, { revenue: number; name: string }> = {}
        for (const t of transactions) {
          if (!t.vendor_id) continue
          const vendorName = t.vendors?.business_name || t.vendors?.full_name || String(t.vendor_id)
          const vendorId = String(t.vendor_id)
          if (!revenueByVendor[vendorId]) {
            revenueByVendor[vendorId] = { revenue: 0, name: vendorName }
          }
          revenueByVendor[vendorId].revenue += (Number(t.amount) || 0)
        }
        const topVendors = Object.entries(revenueByVendor)
          .map(([id, info]) => ({ id, revenue: info.revenue, name: info.name }))
          .sort((a, b) => b.revenue - a.revenue)

        // Revenue by month
        const months = lastNMonths(6)
        const revenueByMonth: Record<string, number> = {}
        months.forEach(m => (revenueByMonth[m] = 0))
        const getTransactionDate = (transaction: any) => transaction.created_at || transaction.inserted_at || transaction.updated_at
        for (const t of transactions) {
          const date = getTransactionDate(t)
          if (!date) continue
          const parsed = new Date(date)
          if (Number.isNaN(parsed.getTime())) continue
          const month = parsed.toISOString().slice(0, 7)
          if (revenueByMonth[month] !== undefined) revenueByMonth[month] += (Number(t.amount) || 0)
        }

        const avgBookingValue = totalBookings ? Math.round(totalRevenue / totalBookings) : 0

        setStats({ uniqueVisitors, totalBookings, totalTransactions, totalRevenue, totalVendors, totalServices, totalReviews, topVendors, months, revenueByMonth, recentTransactions: transactions.slice(0, 20), avgBookingValue })
      } catch (err) {
        console.error('Failed to load admin performance:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  function exportCSV() {
    if (!stats) return
    const rows: any[] = []
    rows.push(['Metric', 'Value'])
    rows.push(['Unique Visitors', stats.uniqueVisitors])
    rows.push(['Total Bookings', stats.totalBookings])
    rows.push(['Total Transactions', stats.totalTransactions])
    rows.push(['Total Revenue', stats.totalRevenue])
    rows.push(['Vendors', stats.totalVendors])
    rows.push(['Services', stats.totalServices])

    const csv = rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-performance.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Performance Report</h1>
          <p className="text-sm text-gray-600">Platform-wide statistics and KPIs — summaries to help prioritise support and grow the marketplace.</p>
        </div>
        <div>
          <button onClick={exportCSV} className="bg-sky-600 text-white px-3 py-1 rounded">Export CSV</button>
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
          <div className="text-xl font-bold">{formatCurrency(stats?.totalRevenue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-semibold mb-2">Revenue — last 6 months</h2>
          <div className="flex space-x-2 text-sm text-gray-600 mb-2">
            {stats.months.map((m: string) => (
              <div key={m} className="flex-1 text-center">
                <div className="text-lg font-medium">{formatCurrency(stats.revenueByMonth[m] || 0)}</div>
                <div className="text-xs">{m}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">Revenue broken down by month for quick trend spotting.</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-semibold mb-2">Top Vendors by Revenue</h2>
          <div className="space-y-2">
            {stats?.topVendors?.length ? stats.topVendors.slice(0,8).map((v: any, i: number) => (
              <div key={v.id} className="flex justify-between text-sm">
                <div>#{i+1} {v.name || v.id}</div>
                <div className="text-gray-500">{formatCurrency(v.revenue)}</div>
              </div>
            )) : <div className="text-sm text-gray-500">No data</div>}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-sm font-semibold mb-3">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2">Tx ID</th>
                <th className="py-2">Vendor</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Payment method</th>
                <th className="py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTransactions.length ? stats.recentTransactions.map((t: any) => {
              const vendorLabel = t.vendors?.business_name || t.vendors?.full_name || t.vendor_id || '—'
              const createdAt = t.created_at || t.inserted_at || t.updated_at
              return (
                <tr key={t.id} className="border-t">
                  <td className="py-2">{t.id?.slice ? t.id.slice(0,8) : t.id}</td>
                  <td className="py-2">{vendorLabel}</td>
                  <td className="py-2">{formatCurrency(t.amount)}</td>
                  <td className="py-2">{formatPaymentMethod(t.payment_method)}</td>
                  <td className="py-2">{createdAt ? new Date(createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              )
            }) : <tr><td colSpan={5} className="py-4 text-gray-500">No transactions</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-sm font-semibold mb-2">Actionable insights</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Average booking value: <strong>{formatCurrency(stats.avgBookingValue)}</strong></li>
          {stats.totalRevenue === 0 && <li>No revenue recorded — check onboarding and payment integrations.</li>}
          {stats.topVendors && stats.topVendors.length > 0 && <li>Top vendor by revenue: <strong>{stats.topVendors[0].name || stats.topVendors[0].id}</strong> — consider highlighting or supporting growth.</li>}
          <li>Export data to CSV for deeper analysis.</li>
        </ul>
      </div>
    </div>
  )
}
