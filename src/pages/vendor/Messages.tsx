import { useEffect, useState } from 'react'
import { MessageSquare, Send, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getVendorMessages, sendMessage, getAdminProfileId } from '../../lib/database'

interface Message {
  id: string
  sender_id: string
  sender_name: string
  sender_email: string
  sender_role: string
  recipient_id: string
  recipient_role: string
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
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'customer' | 'admin'>('customer')
  const [newMessageContent, setNewMessageContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageCounts, setMessageCounts] = useState({
    customer: 0,
    admin: 0,
    unread: 0
  })
  const [sendMessageError, setSendMessageError] = useState<string | null>(null)

  // Local storage cache functions
  const getCacheKey = (vendorId: string, filter: string) => `vendor_messages_${vendorId}_${filter}`
  
  const saveMessagesToCache = (vendorId: string, filter: string, messages: Message[]) => {
    try {
      const cacheData = {
        messages,
        timestamp: Date.now(),
        vendorId,
        filter
      }
      localStorage.setItem(getCacheKey(vendorId, filter), JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to save messages to cache:', error)
    }
  }
  
  const loadMessagesFromCache = (vendorId: string, filter: string): Message[] | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(vendorId, filter))
      if (cached) {
        const cacheData = JSON.parse(cached)
        // Check if cache is less than 5 minutes old
        if (Date.now() - cacheData.timestamp < 5 * 60 * 1000) {
          return cacheData.messages
        } else {
          // Remove expired cache
          localStorage.removeItem(getCacheKey(vendorId, filter))
        }
      }
    } catch (error) {
      console.warn('Failed to load messages from cache:', error)
    }
    return null
  }

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
    const vendorId = profile?.id || ''
    if (!vendorId) return

    try {
      setLoading(true)
      
      // Load from cache first
      const cachedMessages = loadMessagesFromCache(vendorId, filter)
      if (cachedMessages) {
        setMessages(cachedMessages)
        setLoading(false) // Show cached data immediately
      }

      // Fetch fresh data from server
      let filterParam: 'unread' | 'customer' | 'admin' | undefined

      if (filter === 'unread') {
        filterParam = 'unread'
      } else if (filter === 'customer') {
        filterParam = 'customer'
      } else if (filter === 'admin') {
        filterParam = 'admin'
      }

      const data = await getVendorMessages(vendorId, filterParam)
      
      // Update state and cache
      setMessages(data)
      saveMessagesToCache(vendorId, filter, data)
    } catch (error) {
      console.error('Error fetching messages:', error)
      // If server fails and no cache, show empty state
      if (!messages.length) {
        setMessages([])
      }
    } finally {
      setLoading(false)
    }
  }


  const handleNewMessage = async () => {
    setSendMessageError(null)
    if (!newMessageContent.trim()) return

    setSendingMessage(true)
    try {
      // Dynamically fetch the admin's profile ID
      const adminRecipientId = await getAdminProfileId();
      if (!adminRecipientId) {
        setSendMessageError('No admin profile found. Cannot send message.');
        return;
      }

      const newMsg = await sendMessage({
        sender_id: profile?.id || '',
        sender_role: 'vendor',
        recipient_id: adminRecipientId,
        recipient_role: 'admin',
        subject: '', // No subject for vendor to admin
        message: newMessageContent
      })

      // Optimistically add the new message to the chat trail only if filter is 'admin'
      setMessages((prev) => {
        if (filter === 'admin') {
          return [
            {
              id: newMsg?.id || Math.random().toString(),
              sender_id: profile?.id || '',
              sender_name: profile?.full_name || 'You',
              sender_email: profile?.email || '',
              sender_role: 'vendor',
              recipient_id: adminRecipientId,
              recipient_role: 'admin',
              subject: '',
              message: newMessageContent,
              status: 'unread',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ]
        }
        return prev
      })

      setNewMessageContent('')
      setSendMessageError(null)
      // Optionally, you can still refetch messages in the background
      fetchMessages()
    } catch (error) {
      setSendMessageError('Failed to send message. Please try again.')
      console.error('Error sending new message:', error)
    } finally {
      setSendingMessage(false)
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
          {/* Conversations List or Chat */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              /* Chat Interface for Selected Conversation */
              <>
                {/* Chat Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ←
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {selectedConversation === 'admin' ? 'A' : 'C'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedConversation === 'admin' ? 'Admin' : 'Customer'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {selectedConversation === 'admin' ? 'Administrator' : 'Customer Conversation'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp-like Chat Trail */}
                <div className="bg-[#0a0a0a] rounded-lg overflow-hidden bg-opacity-95">
                  {/* Messages Container */}
                  <div className="p-4 h-[50vh] overflow-y-auto flex flex-col gap-3">
                    {(() => {
                      const conversationMessages = messages.filter(msg => {
                        if (selectedConversation === 'admin') {
                          return msg.sender_role === 'admin' || msg.recipient_role === 'admin'
                        } else {
                          return msg.sender_id === selectedConversation || msg.recipient_id === selectedConversation
                        }
                      }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

                      return conversationMessages.length === 0 ? (
                        <div className="p-8 text-center">
                          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-300">No messages</h3>
                          <p className="mt-1 text-sm text-gray-500">Start the conversation.</p>
                        </div>
                      ) : (
                        conversationMessages.map((message, index) => {
                          const isVendor = message.sender_id === profile?.id
                          const isAdmin = message.sender_role === 'admin'
                          const showAvatar = index === 0 || conversationMessages[index - 1]?.sender_id !== message.sender_id

                          return (
                            <div
                              key={message.id}
                              className={`flex w-full ${isVendor ? 'justify-end' : 'justify-start'} mb-1`}
                            >
                              {/* Avatar for received messages */}
                              {!isVendor && showAvatar && (
                                <div className="flex-shrink-0 mr-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
                                    {isAdmin ? 'A' : (message.sender_name?.[0] || 'U')}
                                  </div>
                                </div>
                              )}
                              {!isVendor && !showAvatar && <div className="w-10 mr-3"></div>}

                              {/* Message Bubble */}
                              <div className="flex flex-col max-w-[75%]">
                                {/* Sender name for received messages (only show if different sender) */}
                                {!isVendor && showAvatar && (
                                  <div className="text-xs text-gray-400 mb-1 ml-1">
                                    {isAdmin ? 'Admin' : message.sender_name}
                                  </div>
                                )}

                                <div
                                  className={`relative px-4 py-3 shadow-lg ${
                                    isVendor
                                      ? 'bg-[#005c4b] text-white rounded-l-2xl rounded-tr-2xl rounded-br-md'
                                      : 'bg-white text-gray-900 rounded-r-2xl rounded-tl-2xl rounded-bl-md'
                                  }`}
                                >
                                  {/* Message text */}
                                  <div className="text-sm leading-relaxed whitespace-pre-line break-words">
                                    {message.message}
                                  </div>

                                  {/* Timestamp and status */}
                                  <div className={`flex items-center justify-end mt-2 space-x-1 ${
                                    isVendor ? 'text-green-100' : 'text-gray-500'
                                  }`}>
                                    <span className="text-xs">
                                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isVendor && (
                                      <div className="flex items-center">
                                        {message.status === 'read' ? (
                                          <>
                                            <span className="text-green-100 text-xs mr-0.5">✓</span>
                                            <span className="text-green-100 text-xs">✓</span>
                                          </>
                                        ) : (
                                          <span className="text-green-100 text-xs">✓</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Avatar for sent messages */}
                              {isVendor && showAvatar && (
                                <div className="flex-shrink-0 ml-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold shadow-lg">
                                    {profile?.full_name?.[0] || 'V'}
                                  </div>
                                </div>
                              )}
                              {isVendor && !showAvatar && <div className="w-10 ml-3"></div>}
                            </div>
                          )
                        })
                      )
                    })()}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-700 bg-[#0a0a0a]">
                    {sendMessageError && (
                      <div className="mb-3 p-3 bg-red-900 border border-red-700 rounded-lg">
                        <div className="flex items-center">
                          <X className="w-4 h-4 text-red-400 mr-2" />
                          <p className="text-sm text-red-300">{sendMessageError}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex space-x-3">
                      <textarea
                        value={newMessageContent}
                        onChange={(e) => setNewMessageContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleNewMessage()
                          }
                        }}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-primary-500 focus:border-primary-500 resize-none"
                        rows={1}
                        style={{ minHeight: '40px', maxHeight: '120px' }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement
                          target.style.height = 'auto'
                          target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                        }}
                      />
                      <button
                        onClick={handleNewMessage}
                        disabled={!newMessageContent.trim() || sendingMessage}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                      >
                        {sendingMessage ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Conversations List */
              <>
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
                      Customer Conversations ({messageCounts.customer})
                    </button>
                    <button
                      onClick={() => setFilter('admin')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        filter === 'admin'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Admin ({messageCounts.admin})
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

                {/* Conversations Cards */}
                <div className="space-y-4">
                  {(() => {
                    // Group messages by conversation
                    const conversations = messages.reduce((groups, message) => {
                      let conversationId: string
                      let conversationName: string
                      let conversationType: 'customer' | 'admin'

                      if (message.sender_role === 'admin' || message.recipient_role === 'admin') {
                        conversationId = 'admin'
                        conversationName = 'Admin'
                        conversationType = 'admin'
                      } else {
                        // For customer conversations, use the other participant's ID
                        conversationId = message.sender_id === profile?.id ? message.recipient_id : message.sender_id
                        conversationName = message.sender_id === profile?.id ? 'Customer' : message.sender_name
                        conversationType = 'customer'
                      }

                      if (!groups[conversationId]) {
                        groups[conversationId] = {
                          id: conversationId,
                          name: conversationName,
                          type: conversationType,
                          latestMessage: message,
                          unreadCount: 0,
                          totalMessages: 0,
                          lastMessageTime: message.created_at
                        }
                      }

                      groups[conversationId].totalMessages++
                      if (message.status === 'unread' && message.recipient_id === profile?.id) {
                        groups[conversationId].unreadCount++
                      }

                      // Update latest message if this one is newer
                      if (new Date(message.created_at) > new Date(groups[conversationId].lastMessageTime)) {
                        groups[conversationId].latestMessage = message
                        groups[conversationId].lastMessageTime = message.created_at
                      }

                      return groups
                    }, {} as Record<string, any>)

                    let conversationList = Object.values(conversations)

                    // Apply filter
                    if (filter === 'unread') {
                      conversationList = conversationList.filter((c: any) => c.unreadCount > 0)
                    } else if (filter === 'customer') {
                      conversationList = conversationList.filter((c: any) => c.type === 'customer')
                    } else if (filter === 'admin') {
                      conversationList = conversationList.filter((c: any) => c.type === 'admin')
                    }

                    conversationList = conversationList.sort((a: any, b: any) =>
                      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
                    )

                    return conversationList.length === 0 ? (
                      <div className="p-8 text-center">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {filter === 'unread' ? 'No conversations with unread messages.' :
                           filter === 'customer' ? 'No customer conversations.' :
                           'No admin conversations.'}
                        </p>
                      </div>
                    ) : (
                      conversationList.map((conversation: any) => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation.id)}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors bg-white"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
                                  {conversation.type === 'admin' ? 'A' : conversation.name[0]}
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {conversation.name}
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    {conversation.unreadCount > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {conversation.unreadCount} unread
                                      </span>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      {new Date(conversation.lastMessageTime).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                  {conversation.latestMessage.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {conversation.totalMessages} message{conversation.totalMessages !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}