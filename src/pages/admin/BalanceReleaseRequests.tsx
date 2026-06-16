import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  getPendingBalanceReleaseRequests,
  reviewBalanceReleaseRequest,
  type BalanceReleaseRequest,
} from '../../lib/database'
import { formatCurrencyWithConversion } from '../../lib/utils'
import { usePreferences } from '../../contexts/PreferencesContext'
import { getCurrentUserId } from '../../services/AuthService'

export default function BalanceReleaseRequests() {
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [requests, setRequests] = useState<BalanceReleaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})

  const fetchRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPendingBalanceReleaseRequests()
      setRequests(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load release requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleReview = async (requestId: string, approve: boolean) => {
    setReviewingId(requestId)
    setError(null)
    try {
      const adminId = await getCurrentUserId()
      if (!adminId) throw new Error('Admin session not found')

      await reviewBalanceReleaseRequest(
        requestId,
        approve,
        adminId,
        adminNotes[requestId]?.trim() || undefined,
      )
      await fetchRequests()
    } catch (err: any) {
      setError(err?.message || 'Failed to update request')
    } finally {
      setReviewingId(null)
    }
  }

  const formatServiceContext = (req: BalanceReleaseRequest) => {
    const hold = req.hold
    if (!hold) return '—'
    if (hold.booking) {
      const date = hold.booking.service_date || hold.booking.booking_date
      return `Booking ${hold.booking.id.slice(0, 8)}… · ${hold.booking.status || 'unknown'}${date ? ` · ${date}` : ''}`
    }
    if (hold.order) {
      return `Order ${hold.order.reference || hold.order.id.slice(0, 8)}… · ${hold.order.status || 'unknown'}`
    }
    return hold.booking_id ? `Booking ${hold.booking_id.slice(0, 8)}…` : 'Payment hold'
  }

  if (loading) {
    return <div className="p-6">Loading early release requests…</div>
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Early release requests</h1>
        <p className="text-sm text-gray-600 mt-1">
          Vendors can request pending earnings before the automatic release date (e.g. event setup deposits).
          Approve to move funds to their available balance.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
          No pending release requests.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {req.vendor?.business_name || 'Vendor'}
                    </span>
                    <span className="text-lg font-bold text-indigo-700">
                      {formatCurrencyWithConversion(
                        Number(req.amount),
                        req.currency || 'UGX',
                        selectedCurrency,
                        selectedLanguage,
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{formatServiceContext(req)}</p>
                  <p className="text-sm text-gray-500">
                    Auto-release after:{' '}
                    {req.hold?.release_after
                      ? format(new Date(req.hold.release_after), 'MMM d, yyyy HH:mm')
                      : '—'}
                  </p>
                  <div className="rounded-md bg-amber-50 border border-amber-100 px-3 py-2">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Vendor reason</p>
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{req.reason}</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Requested {format(new Date(req.requested_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>

                <div className="w-full lg:w-72 space-y-3">
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Admin notes (optional)"
                    value={adminNotes[req.id] || ''}
                    onChange={(e) =>
                      setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={reviewingId === req.id}
                      onClick={() => handleReview(req.id, true)}
                      className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve & release
                    </button>
                    <button
                      type="button"
                      disabled={reviewingId === req.id}
                      onClick={() => handleReview(req.id, false)}
                      className="flex-1 rounded-md bg-white border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
