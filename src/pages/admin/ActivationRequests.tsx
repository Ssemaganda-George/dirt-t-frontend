import { useEffect, useState } from 'react'
import { getActivationRequests, updateActivationRequestStatus } from '../../lib/database'

export default function ActivationRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = async () => {
    setLoading(true)
    try {
      const data = await getActivationRequests()
      setRequests(data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const handle = async (id: string, approve: boolean) => {
    try {
      await updateActivationRequestStatus(id, approve ? 'approved' : 'rejected')
      await fetch()
    } catch (err) {
      console.error('Failed to update request:', err)
      setError('Failed to update request')
    }
  }

  if (loading) return <div className="p-6">Loading activation requests...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Activation Requests</h2>
      {requests.length === 0 ? (
        <div>No activation requests</div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="p-4 border rounded">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{req.service?.title || 'Unknown event'}</div>
                  <div className="text-sm text-gray-600">Requested by: {req.vendor?.business_name || req.vendor_id}</div>
                  <div className="text-sm text-gray-500">Status: {req.status}</div>
                </div>
                <div className="space-x-2">
                  <button onClick={() => handle(req.id, true)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                  <button onClick={() => handle(req.id, false)} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
