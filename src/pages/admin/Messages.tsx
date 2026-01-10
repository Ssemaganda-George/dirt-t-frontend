import { useEffect, useState } from 'react'
import { MessageSquare, User, Store, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminMessages, markMessageAsRead, replyToMessage, getAllVendors, Vendor } from '../../lib/database'
import { getStatusColor } from '../../lib/utils'
import { useNavigate, useSearchParams } from 'react-router-dom'

interface Message {
  id: string
  sender_id: string
  sender_name: string
  sender_role: string
  recipient_id: string
  recipient_name: string
  recipient_role: string
  subject: string
  message: string
  status: 'unread' | 'read' | 'replied'
  created_at: string
  updated_at: string
}

export default function Messages() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const vendorId = searchParams.get('vendorId')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'vendor_to_admin' | 'tourist_to_admin'>('all')
  const [replyMessage, setReplyMessage] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorSearch, setVendorSearch] = useState('')
  const [currentVendorPage, setCurrentVendorPage] = useState(1)
  const VENDORS_PER_PAGE = 5

  console.log('Messages component: profile:', profile)
  console.log('Messages component: vendorId from URL:', vendorId)

  useEffect(() => {
    fetchMessages()
    fetchVendors()
  }, [filter])

  useEffect(() => {
    setCurrentVendorPage(1)
  }, [vendorSearch])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      let filterParam: 'vendor_to_admin' | 'tourist_to_admin' | 'unread' | undefined

      if (filter === 'vendor_to_admin') {
        filterParam = 'vendor_to_admin'
      } else if (filter === 'tourist_to_admin') {
        filterParam = 'tourist_to_admin'
      } else if (filter === 'unread') {
        filterParam = 'unread'
      }

      const data = await getAdminMessages(filterParam)
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      console.log('fetchVendors: Starting to fetch vendors...')
      const data = await getAllVendors()
      console.log('fetchVendors: Received vendors data:', data)
      setVendors(data)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyMessage.trim()) return

    try {
      await replyToMessage(selectedMessage.id, {
        sender_id: profile?.id || '',
        sender_role: 'admin',
        recipient_id: selectedMessage.sender_id,
        recipient_role: selectedMessage.sender_role,
        subject: `Re: ${selectedMessage.subject}`,
        message: replyMessage
      })

      setReplyMessage('')
      setShowReplyForm(false)
      await fetchMessages() // Refresh messages
    } catch (error) {
      console.error('Error sending reply:', error)
    }
  }

  const handleMarkAsRead = async () => {
    if (!selectedMessage) return

    try {
      await markMessageAsRead(selectedMessage.id)
      await fetchMessages() // Refresh messages
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const filteredMessages = messages.filter(message => {
    // First apply the main filter
    let passesFilter = false
    switch (filter) {
      case 'unread':
        passesFilter = message.status === 'unread'
        break
      case 'vendor_to_admin':
        passesFilter = message.sender_role === 'vendor'
        break
      case 'tourist_to_admin':
        passesFilter = message.sender_role === 'tourist'
        break
      default:
        passesFilter = true
        break
    }

    // Then apply vendor-specific filter if vendorId is present
    if (vendorId && passesFilter) {
      passesFilter = message.sender_id === vendorId
    }

    return passesFilter
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread':
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
      case 'read':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'replied':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      default:
        return null
    }
  }

  const getSenderIcon = (role: string) => {
    switch (role) {
      case 'vendor':
        return <Store className="w-4 h-4 text-blue-600" />
      case 'tourist':
        return <User className="w-4 h-4 text-green-600" />
      default:
        return <User className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary-600" />
                {vendorId ? 'Vendor Messages' : 'Manage Messages'}
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                {vendorId 
                  ? `Messages from ${vendors.find(v => v.user_id === vendorId)?.business_name || 'Selected Vendor'}`
                  : 'Manage messages and vendor accounts'
                }
              </p>
            </div>
            {vendorId && (
              <button
                onClick={() => navigate('/admin/messages')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back to All Messages
              </button>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${vendorId ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-8`}>
          {/* Messages Card */}
          <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary-600" />
                  Messages
                </h2>
              </div>

            {/* Filters */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    filter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({messages.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    filter === 'unread'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Unread ({messages.filter(m => m.status === 'unread').length})
                </button>
                <button
                  onClick={() => setFilter('vendor_to_admin')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    filter === 'vendor_to_admin'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Vendors ({messages.filter(m => m.sender_role === 'vendor').length})
                </button>
                <button
                  onClick={() => setFilter('tourist_to_admin')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    filter === 'tourist_to_admin'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tourists ({messages.filter(m => m.sender_role === 'tourist').length})
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {filter === 'all' ? 'No messages found.' : `No ${filter.replace('_', ' ')} messages.`}
                  </p>
                </div>
              ) : (
                filteredMessages.slice(0, 5).map((message) => (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedMessage?.id === message.id ? 'bg-blue-50 border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        <div className="flex-shrink-0">
                          {getSenderIcon(message.sender_role)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {message.sender_name}
                            </p>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(message.status)}
                              <p className="text-xs text-gray-500">
                                {new Date(message.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                            {message.subject}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredMessages.length > 5 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Showing 5 of {filteredMessages.length} messages
                </p>
              </div>
            )}
          </div>

          {/* Vendor Accounts Card - Only show when not filtering by specific vendor */}
          {!vendorId && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary-600" />
                  Vendor Accounts
                </h2>
                <span className="text-sm text-gray-500">
                  {vendorSearch ? 
                    `${(() => {
                      const filtered = vendors.filter(vendor =>
                        vendor.business_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                        (vendor.business_email && vendor.business_email.toLowerCase().includes(vendorSearch.toLowerCase()))
                      )
                      return filtered.length
                    })()} of ${vendors.length} vendors` : 
                    `${vendors.length} total`
                  }
                </span>
              </div>

              {/* Search Filter */}
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search vendors by business name or email..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>
              </div>

              {/* Vendor List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  const filteredVendors = vendors.filter(vendor =>
                    vendor.business_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                    (vendor.business_email && vendor.business_email.toLowerCase().includes(vendorSearch.toLowerCase()))
                  )

                  const startIndex = (currentVendorPage - 1) * VENDORS_PER_PAGE
                  const endIndex = startIndex + VENDORS_PER_PAGE
                  const paginatedVendors = filteredVendors.slice(startIndex, endIndex)

                  return filteredVendors.length === 0 ? (
                    <div className="p-4 text-center">
                      <Store className="mx-auto h-8 w-8 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors found</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {vendorSearch ? 'Try adjusting your search terms.' : 'No vendor accounts found.'}
                      </p>
                    </div>
                  ) : (
                    paginatedVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        onClick={() => navigate(`/admin/vendor-messages?vendor=${btoa(vendor.user_id)}`)}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0">
                              <Store className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {vendor.business_name}
                                </p>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(vendor.status)}`}>
                                  {vendor.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {vendor.business_email}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Created {new Date(vendor.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                })()}
              </div>

              {/* Pagination Controls */}
              {(() => {
                const filteredVendors = vendors.filter(vendor =>
                  vendor.business_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                  (vendor.business_email && vendor.business_email.toLowerCase().includes(vendorSearch.toLowerCase()))
                )
                const totalPages = Math.ceil(filteredVendors.length / VENDORS_PER_PAGE)

                if (filteredVendors.length <= VENDORS_PER_PAGE) return null

                return (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {Math.min((currentVendorPage - 1) * VENDORS_PER_PAGE + 1, filteredVendors.length)} to {Math.min(currentVendorPage * VENDORS_PER_PAGE, filteredVendors.length)} of {filteredVendors.length} vendors
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentVendorPage(prev => Math.max(1, prev - 1))}
                        disabled={currentVendorPage === 1}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous page"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentVendorPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentVendorPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentVendorPage === totalPages}
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next page"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Message Details</h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getSenderIcon(selectedMessage.sender_role)}
                    <div>
                      <h4 className="text-md font-medium text-gray-900">
                        {selectedMessage.sender_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {selectedMessage.sender_role === 'vendor' ? 'Vendor' : 'Tourist'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedMessage.status)}
                    <span className="text-sm text-gray-500">
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h5 className="text-md font-medium text-gray-900 mb-2">
                    {selectedMessage.subject}
                  </h5>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>

                {!showReplyForm ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowReplyForm(true)}
                      className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      Reply
                    </button>
                    <button
                      onClick={handleMarkAsRead}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Mark as Read
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      rows={4}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleReply}
                        disabled={!replyMessage.trim()}
                        className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Send Reply
                      </button>
                      <button
                        onClick={() => {
                          setShowReplyForm(false)
                          setReplyMessage('')
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}