import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getVendorInquiries, updateInquiryStatus, type Inquiry } from '../../lib/database'
import { formatDateTime } from '../../lib/utils'

export default function VendorInquiries() {
  const { profile } = useAuth()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'responded' | 'archived'>('all')
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    fetchInquiries()
  }, [filter])

  const fetchInquiries = async () => {
    try {
      const data = await getVendorInquiries(profile?.id || '')
      setInquiries(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching inquiries:', error)
      setLoading(false)
    }
  }

  const filteredInquiries = inquiries.filter(inquiry => {
    if (filter === 'all') return true
    return inquiry.status === filter
  })

  const handleStatusChange = async (inquiryId: string, newStatus: 'unread' | 'read' | 'responded' | 'archived') => {
    try {
      await updateInquiryStatus(inquiryId, newStatus)
      await fetchInquiries() // Refresh the list
    } catch (error) {
      console.error('Error updating inquiry status:', error)
    }
  }

  const handleRespond = async (inquiry: Inquiry) => {
    if (!responseMessage.trim()) return

    setResponding(true)
    try {
      await updateInquiryStatus(inquiry.id, 'responded', responseMessage)
      setResponseMessage('')
      setSelectedInquiry(null)
      await fetchInquiries()
    } catch (error) {
      console.error('Error responding to inquiry:', error)
    } finally {
      setResponding(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-red-50 text-red-700'
      case 'read': return 'bg-blue-50 text-blue-700'
      case 'responded': return 'bg-emerald-50 text-emerald-700'
      case 'archived': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-7 w-48 bg-gray-200 rounded-lg" />
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 w-20 bg-gray-200 rounded-md" />)}
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-gray-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Service Inquiries</h1>
        <p className="text-sm text-gray-500 mt-1">Manage inquiries from potential customers</p>
      </div>

      {/* Filter Tabs — Pill Style */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: 'all', label: 'All', count: inquiries.length },
          { key: 'unread', label: 'Unread', count: inquiries.filter(i => i.status === 'unread').length },
          { key: 'read', label: 'Read', count: inquiries.filter(i => i.status === 'read').length },
          { key: 'responded', label: 'Responded', count: inquiries.filter(i => i.status === 'responded').length },
          { key: 'archived', label: 'Archived', count: inquiries.filter(i => i.status === 'archived').length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              filter === tab.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Inquiries List */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No inquiries</p>
          <p className="text-xs text-gray-500 mt-1">
            {filter === 'all' ? 'No inquiries received yet.' : `No ${filter} inquiries.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInquiries.map((inquiry) => (
            <div key={inquiry.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50/50 transition group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{inquiry.name}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span>{inquiry.services?.title}</span>
                    <span className="text-gray-300">·</span>
                    <span>{inquiry.services?.service_categories?.name}</span>
                    <span className="text-gray-300">·</span>
                    <span>{formatDateTime(inquiry.created_at)}</span>
                  </div>
                  <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {inquiry.contact_method === 'email' ? (
                      <span>{inquiry.email}</span>
                    ) : (
                      <span>{inquiry.phone}</span>
                    )}
                    <span className="text-gray-300">·</span>
                    <span>{inquiry.number_of_guests} guest{inquiry.number_of_guests !== 1 ? 's' : ''}</span>
                    {inquiry.preferred_date && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>Preferred: {new Date(inquiry.preferred_date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  {inquiry.message && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{inquiry.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {inquiry.status === 'unread' && (
                    <button
                      onClick={() => handleStatusChange(inquiry.id, 'read')}
                      className="text-xs font-medium text-gray-700 hover:underline"
                    >
                      Mark Read
                    </button>
                  )}
                  {inquiry.status === 'read' && (
                    <button
                      onClick={() => setSelectedInquiry(inquiry)}
                      className="text-xs font-medium text-gray-900 hover:underline"
                    >
                      Respond
                    </button>
                  )}
                  {inquiry.status !== 'archived' && (
                    <button
                      onClick={() => handleStatusChange(inquiry.id, 'archived')}
                      className="text-xs font-medium text-gray-400 hover:text-gray-600 hover:underline"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedInquiry(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Respond to Inquiry</h3>
              <button onClick={() => setSelectedInquiry(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Original inquiry */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{selectedInquiry.name}</p>
                  <span className="text-xs text-gray-400">{formatDateTime(selectedInquiry.created_at)}</span>
                </div>
                <p className="text-xs text-gray-500">
                  {selectedInquiry.services?.title} · {selectedInquiry.services?.service_categories?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedInquiry.email} {selectedInquiry.phone && `· ${selectedInquiry.phone}`}
                </p>
                {selectedInquiry.message && (
                  <p className="text-sm text-gray-700 pt-1 border-t border-gray-200 mt-2">{selectedInquiry.message}</p>
                )}
              </div>

              {/* Response input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Your Response</label>
                <textarea
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Type your response to the customer..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRespond(selectedInquiry)}
                  disabled={responding || !responseMessage.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {responding ? 'Sending...' : 'Send Response'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}