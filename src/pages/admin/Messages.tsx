import { useEffect, useState } from 'react'
import { MessageSquare, User, Store, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminMessages, markMessageAsRead, replyToMessage } from '../../lib/database'

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
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'vendor_to_admin' | 'tourist_to_admin'>('all')
  const [replyMessage, setReplyMessage] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [filter])

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
    switch (filter) {
      case 'unread':
        return message.status === 'unread'
      case 'vendor_to_admin':
        return message.sender_role === 'vendor'
      case 'tourist_to_admin':
        return message.sender_role === 'tourist'
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary-600" />
            Messages
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage communications between vendors, tourists, and admin
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Messages List */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All Messages ({messages.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'unread'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Unread ({messages.filter(m => m.status === 'unread').length})
                </button>
                <button
                  onClick={() => setFilter('vendor_to_admin')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'vendor_to_admin'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  From Vendors ({messages.filter(m => m.sender_role === 'vendor').length})
                </button>
                <button
                  onClick={() => setFilter('tourist_to_admin')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'tourist_to_admin'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  From Tourists ({messages.filter(m => m.sender_role === 'tourist').length})
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {filteredMessages.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filter === 'all' ? 'No messages found.' : `No ${filter.replace('_', ' ')} messages.`}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => setSelectedMessage(message)}
                      className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {getSenderIcon(message.sender_role)}
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

          {/* Message Detail */}
          <div className="lg:col-span-1">
            {selectedMessage ? (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getSenderIcon(selectedMessage.sender_role)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedMessage.sender_name}
                      </h3>
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
            ) : (
              <div className="bg-white shadow-sm rounded-lg p-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Select a message</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a message from the list to view its details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}