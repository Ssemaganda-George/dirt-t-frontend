import { useEffect, useState } from 'react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { getFlaggedBookings, approveFlaggedBooking, rejectFlaggedBooking, resolveFlaggedBooking } from '../../lib/database'

export default function FlaggedBookings() {
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await getFlaggedBookings()
        setBookings(res)
      } catch (err) {
        console.error('Failed to load flagged bookings:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleApprove = async (id: string) => {
    if (!confirm('Mark booking as verified/approved? This will set it to Confirmed/Paid.')) return
    try {
      await approveFlaggedBooking(id)
      setBookings(prev => prev.filter(b => b.id !== id))
      alert('Booking approved')
    } catch (err) {
      console.error(err)
      alert('Failed to approve booking')
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Enter reason for rejection (optional):', 'payment_unverified')
    if (reason === null) return
    if (!confirm('Reject booking? This will cancel the booking.')) return
    try {
      await rejectFlaggedBooking(id, reason || 'rejected_by_admin')
      setBookings(prev => prev.filter(b => b.id !== id))
      alert('Booking rejected')
    } catch (err) {
      console.error(err)
      alert('Failed to reject booking')
    }
  }

  const handleResolve = async (id: string) => {
    const notes = prompt('Optional notes about this resolution:', '')
    try {
      await resolveFlaggedBooking(id, notes || undefined)
      setBookings(prev => prev.map(b => (b.id === id ? { ...b, rejection_reason: notes || 'reviewed' } : b)))
      alert('Booking marked as reviewed')
    } catch (err) {
      console.error(err)
      alert('Failed to mark booking as reviewed')
    }
  }

  if (loading) return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Flagged Bookings</h1>
          <p className="text-sm text-gray-600">Bookings flagged for payment verification or suspected unpaid payments.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500">
                <th className="py-2">Booking</th>
                <th className="py-2">Service</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Issue</th>
                <th className="py-2">Created</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length ? bookings.map(b => (
                <tr key={b.id} className="border-t">
                  <td className="py-2">#{b.id?.slice ? b.id.slice(0,8) : b.id}</td>
                  <td className="py-2">{b.services?.title || '—'}</td>
                  <td className="py-2">{b.profiles?.full_name || b.guest_name || b.guest_email || '—'}</td>
                  <td className="py-2">{b.total_amount} {b.currency}</td>
                  <td className="py-2">{b.rejection_reason || (b.payment_status === 'pending' ? 'payment_pending' : 'flagged')}</td>
                  <td className="py-2">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <a className="text-sky-600" href={`/booking/${b.id}`}>View</a>
                      <button className="text-green-600" onClick={() => handleApprove(b.id)}>Approve</button>
                      <button className="text-yellow-600" onClick={() => handleResolve(b.id)}>Resolve</button>
                      <button className="text-red-600" onClick={() => handleReject(b.id)}>Reject</button>
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={7} className="py-4 text-gray-500">No flagged bookings</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
