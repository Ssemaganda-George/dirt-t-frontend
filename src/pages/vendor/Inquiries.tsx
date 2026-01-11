import { useEffect, useState } from 'react'
import { MessageSquare, Eye, EyeOff, Archive, CheckCircle, Clock, Mail, Phone } from 'lucide-react'
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
      case 'unread': return 'bg-red-100 text-red-800'
      case 'read': return 'bg-blue-100 text-blue-800'
      case 'responded': return 'bg-green-100 text-green-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <Eye className="w-4 h-4" />
      case 'read': return <EyeOff className="w-4 h-4" />
      case 'responded': return <CheckCircle className="w-4 h-4" />
      case 'archived': return <Archive className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Service Inquiries</h1>
        <p className="mt-2 text-gray-600">Manage inquiries from potential customers</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
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
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredInquiries.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No inquiries</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' ? 'No inquiries received yet.' : `No ${filter} inquiries.`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredInquiries.map((inquiry) => (
              <li key={inquiry.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {inquiry.name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                            {getStatusIcon(inquiry.status)}
                            <span className="ml-1 capitalize">{inquiry.status}</span>
                          </span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{inquiry.services?.title}</span>
                          <span>•</span>
                          <span>{inquiry.services?.service_categories?.name}</span>
                          <span>•</span>
                          <span>{formatDateTime(inquiry.created_at)}</span>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          {inquiry.contact_method === 'email' ? (
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 mr-1" />
                              {inquiry.email}
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {inquiry.phone}
                            </div>
                          )}
                          <span>•</span>
                          <span>{inquiry.number_of_guests} guest{inquiry.number_of_guests !== 1 ? 's' : ''}</span>
                          {inquiry.preferred_date && (
                            <>
                              <span>•</span>
                              <span>Preferred: {new Date(inquiry.preferred_date).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                        {inquiry.message && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {inquiry.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {inquiry.status === 'unread' && (
                      <button
                        onClick={() => handleStatusChange(inquiry.id, 'read')}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Mark Read
                      </button>
                    )}
                    {inquiry.status === 'read' && (
                      <button
                        onClick={() => setSelectedInquiry(inquiry)}
                        className="text-green-600 hover:text-green-900 text-sm font-medium"
                      >
                        Respond
                      </button>
                    )}
                    {inquiry.status !== 'archived' && (
                      <button
                        onClick={() => handleStatusChange(inquiry.id, 'archived')}
                        className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Response Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Respond to Inquiry</h3>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">From: {selectedInquiry.name}</h4>
                    <span className="text-sm text-gray-500">{formatDateTime(selectedInquiry.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Service: {selectedInquiry.services?.title} ({selectedInquiry.services?.service_categories?.name})
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Contact: {selectedInquiry.email} {selectedInquiry.phone && `| ${selectedInquiry.phone}`}
                  </p>
                  {selectedInquiry.message && (
                    <div className="mt-2 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-700">{selectedInquiry.message}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Response
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your response to the customer..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRespond(selectedInquiry)}
                  disabled={responding || !responseMessage.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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