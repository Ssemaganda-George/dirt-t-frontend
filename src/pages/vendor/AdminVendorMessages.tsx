
import { useEffect, useState } from 'react'
import { MessageSquare, Send, User, CheckCircle, ArrowLeft } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getVendorMessages, markMessageAsRead, replyToMessage, getAllVendors } from '../../lib/database'


interface Message {
  id: string
  sender_id: string
  sender_name: string
  sender_email: string
  recipient_id: string
  subject: string
  message: string
  status: 'unread' | 'read' | 'replied'
  created_at: string
  updated_at: string
  sender_role: string
}

export default function AdminVendorMessages() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const vendorParam = searchParams.get('vendor')
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'customer'>('all')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyMessage, setReplyMessage] = useState('')
  const [vendor, setVendor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVendorAndMessages()
    // eslint-disable-next-line
  }, [vendorParam, filter])

  const fetchVendorAndMessages = async () => {
    if (!vendorParam) return
    setLoading(true)
    
    try {
      // Decode the vendor ID from base64
      const vendorId = atob(vendorParam)
      
      // Get all vendors to find the one matching the decoded ID
      const allVendors = await getAllVendors()
      const foundVendor = allVendors.find(v => v.user_id === vendorId)
      
      if (!foundVendor) {
        console.error('Vendor not found for ID:', vendorId)
        setLoading(false)
        return
      }
      
      setVendor(foundVendor)
      
      // Now fetch messages for this vendor
      const data = await getVendorMessages(foundVendor.user_id, filter === 'customer' ? 'customer' : undefined)
      setMessages(data)
    } catch (error) {
      console.error('Error fetching vendor and messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyMessage.trim() || !vendor) return
    try {
      await replyToMessage(selectedMessage.id, {
        sender_id: vendor.user_id,
        sender_role: 'vendor',
        recipient_id: selectedMessage.sender_id,
        recipient_role: 'tourist',
        subject: `Re: ${selectedMessage.subject}`,
        message: replyMessage
      })
      setReplyMessage('')
      setShowReplyForm(false)
      await fetchVendorAndMessages()
    } catch (error) {
      console.error('Error sending reply:', error)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      await markMessageAsRead(messageId)
      await fetchVendorAndMessages()
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Vendor not found</h2>
          <p className="text-gray-600 mt-2">The vendor you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/admin/messages')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Messages
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary-600" />
          Vendor Conversations
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Viewing all conversations for {vendor ? vendor.business_name : 'Loading...'}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
              >
                All Messages ({messages.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'unread' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
              >
                Unread ({messages.filter(m => m.status === 'unread').length})
              </button>
              <button
                onClick={() => setFilter('customer')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'customer' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
              >
                Customer Messages ({messages.filter(m => m.sender_role === 'tourist').length})
              </button>
            </div>
          </div>
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {messages.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => {
                        setSelectedMessage(message)
                        if (message.status === 'unread') markAsRead(message.id)
                      }}
                      className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${selectedMessage?.id === message.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <User className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {message.sender_name}
                              </p>
                              <div className="flex items-center space-x-2">
                                {message.status === 'unread' ? <span className="w-2 h-2 bg-blue-500 rounded-full"></span> : <CheckCircle className="w-4 h-4 text-green-500" />}
                                <p className="text-sm text-gray-500">
                                  {new Date(message.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {message.subject}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {message.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            {selectedMessage ? (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-green-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedMessage.sender_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedMessage.sender_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedMessage.status === 'unread' ? <span className="w-2 h-2 bg-blue-500 rounded-full"></span> : <CheckCircle className="w-4 h-4 text-green-500" />}
                    <span className="text-sm text-gray-500">
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mb-4">
                  <h4 className="text-md font-medium text-gray-900 mb-2">
                    {selectedMessage.subject}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedMessage.message}
                  </p>
                </div>
                {!showReplyForm ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowReplyForm(true)}
                      className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Reply
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
                        className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
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
            ) : (
              <div className="bg-white shadow-sm rounded-lg p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a message</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a customer message to view and reply
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    
  )
}
