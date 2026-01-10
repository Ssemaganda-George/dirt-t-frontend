import { useEffect, useState } from 'react'
import { MessageSquare, Send, User, CheckCircle, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getVendorMessages, markMessageAsRead, replyToMessage, sendMessage } from '../../lib/database'

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
}

export default function VendorMessages() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'customer' | 'admin'>('customer')
  const [replyMessage, setReplyMessage] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showNewMessageForm, setShowNewMessageForm] = useState(false)
  const [newMessageSubject, setNewMessageSubject] = useState('')
  const [newMessageContent, setNewMessageContent] = useState('')
  const [messageCounts, setMessageCounts] = useState({
    customer: 0,
    admin: 0,
    unread: 0
  })

  useEffect(() => {
    fetchMessages()
    fetchMessageCounts()
  }, [filter])

  const fetchMessageCounts = async () => {
    try {
      const [customerData, adminData, unreadData] = await Promise.all([
        getVendorMessages(profile?.id || '', 'customer'),
        getVendorMessages(profile?.id || '', 'admin'),
        getVendorMessages(profile?.id || '', 'unread')
      ])

      setMessageCounts({
        customer: customerData.length,
        admin: adminData.length,
        unread: unreadData.length
      })
    } catch (error) {
      console.error('Error fetching message counts:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      let filterParam: 'unread' | 'customer' | 'admin' | undefined

      if (filter === 'unread') {
        filterParam = 'unread'
      } else if (filter === 'customer') {
        filterParam = 'customer'
      } else if (filter === 'admin') {
        filterParam = 'admin'
      }

      const data = await getVendorMessages(profile?.id || '', filterParam)
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMessages = messages.filter(message => {
    switch (filter) {
      case 'unread':
        return message.status === 'unread'
      case 'customer':
        return true // Already filtered by the API
      case 'admin':
        return true // Already filtered by the API
      default:
        return true
    }
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

  const handleReply = async () => {
    if (!selectedMessage || !replyMessage.trim()) return

    try {
      await replyToMessage(selectedMessage.id, {
        sender_id: profile?.id || '',
        sender_role: 'vendor',
        recipient_id: selectedMessage.sender_id,
        recipient_role: 'tourist',
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

  const handleNewMessage = async () => {
    if (!newMessageSubject.trim() || !newMessageContent.trim()) return

    try {
      // For now, we'll send to a default admin. In a real app, you'd have admin user IDs
      // This assumes there's an admin with a known ID or we need to get admin IDs from the database
      const adminRecipientId = 'admin-placeholder-id' // This should be replaced with actual admin ID logic

      await sendMessage({
        sender_id: profile?.id || '',
        sender_role: 'vendor',
        recipient_id: adminRecipientId,
        recipient_role: 'admin',
        subject: newMessageSubject,
        message: newMessageContent
      })

      setNewMessageSubject('')
      setNewMessageContent('')
      setShowNewMessageForm(false)
      await fetchMessages() // Refresh messages
    } catch (error) {
      console.error('Error sending new message:', error)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      await markMessageAsRead(messageId)
      await fetchMessages() // Refresh messages
    } catch (error) {
      console.error('Error marking message as read:', error)
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary-600" />
            Messages
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage communications with customers and administrators
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Messages List */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('customer')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'customer'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Customer Messages ({messageCounts.customer})
                </button>
                <button
                  onClick={() => setFilter('admin')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'admin'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Admin Messages ({messageCounts.admin})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'unread'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Unread ({messageCounts.unread})
                </button>
              </div>
            </div>

            {/* New Message Button - Only show for Admin Messages */}
            {filter === 'admin' && (
              <div className="mb-6">
                <button
                  onClick={() => setShowNewMessageForm(true)}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  New Message to Admin
                </button>
              </div>
            )}

            {/* Messages List */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {filteredMessages.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filter === 'all' ? 'No customer messages found.' : 'No unread messages.'}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => {
                        setSelectedMessage(message)
                        if (message.status === 'unread') {
                          markAsRead(message.id)
                        }
                      }}
                      className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
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
                                {getStatusIcon(message.status)}
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

          {/* New Message Form Modal */}
          {showNewMessageForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">New Message to Admin</h3>
                  <button
                    onClick={() => {
                      setShowNewMessageForm(false)
                      setNewMessageSubject('')
                      setNewMessageContent('')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={newMessageSubject}
                      onChange={(e) => setNewMessageSubject(e.target.value)}
                      placeholder="Enter message subject..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      placeholder="Type your message to the admin..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      rows={6}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleNewMessage}
                      disabled={!newMessageSubject.trim() || !newMessageContent.trim()}
                      className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send Message
                    </button>
                    <button
                      onClick={() => {
                        setShowNewMessageForm(false)
                        setNewMessageSubject('')
                        setNewMessageContent('')
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message Detail */}
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
                    {getStatusIcon(selectedMessage.status)}
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
    </div>
  )
}