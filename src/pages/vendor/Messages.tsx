import { useEffect, useState } from 'react'
import { Send, X, ChevronLeft } from 'lucide-react'
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
  const { profile, vendor } = useAuth()
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
    const vendorId = vendor?.id || profile?.id || ''
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-7 w-36 bg-gray-200 rounded-lg" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-8 w-28 bg-gray-200 rounded-md" />)}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-200" />
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
        <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Manage communications with customers and administrators</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            /* Chat Interface */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: '520px' }}>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {selectedConversation === 'admin' ? 'A' : 'C'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedConversation === 'admin' ? 'Admin' : 'Customer'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedConversation === 'admin' ? 'Administrator' : 'Customer Conversation'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {(() => {
                  const conversationMessages = messages.filter(msg => {
                    if (selectedConversation === 'admin') {
                      return msg.sender_role === 'admin' || msg.recipient_role === 'admin'
                    } else {
                      return msg.sender_id === selectedConversation || msg.recipient_id === selectedConversation
                    }
                  }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

                  return conversationMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Start the conversation.</p>
                      </div>
                    </div>
                  ) : (
                    conversationMessages.map((message, index) => {
                      const isVendor = message.sender_id === profile?.id
                      const showAvatar = index === 0 || conversationMessages[index - 1]?.sender_id !== message.sender_id
                      const showTimestamp = index === conversationMessages.length - 1 ||
                        new Date(conversationMessages[index + 1]?.created_at).getTime() - new Date(message.created_at).getTime() > 300000

                      return (
                        <div key={message.id} className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-xs lg:max-w-sm ${isVendor ? 'flex-row-reverse' : 'flex-row'}`}>
                            {showAvatar && (
                              <div className={`flex-shrink-0 ${isVendor ? 'ml-2' : 'mr-2'}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                  isVendor ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {isVendor ? 'Y' : (message.sender_name?.[0] || 'U')}
                                </div>
                              </div>
                            )}
                            {!showAvatar && <div className="w-9" />}
                            <div className={`flex flex-col ${isVendor ? 'items-end' : 'items-start'}`}>
                              <div className={`px-3 py-2 rounded-xl text-sm ${
                                isVendor
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                              }`}>
                                <p className="whitespace-pre-wrap">{message.message}</p>
                              </div>
                              {showTimestamp && (
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {new Date(message.created_at).toLocaleString()}
                                </p>
                              )}
                              {isVendor && (
                                <span className="text-[10px] text-gray-400 mt-0.5">
                                  {message.status === 'read' ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )
                })()}
              </div>

              {/* Message Input */}
              <div className="p-3 border-t border-gray-100 bg-white">
                {sendMessageError && (
                  <div className="mb-2 p-2.5 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                    <X className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700">{sendMessageError}</p>
                  </div>
                )}
                <div className="flex gap-2">
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
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={1}
                    style={{ minHeight: '38px', maxHeight: '100px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = Math.min(target.scrollHeight, 100) + 'px'
                    }}
                  />
                  <button
                    onClick={handleNewMessage}
                    disabled={!newMessageContent.trim() || sendingMessage}
                    className={`px-3 py-2 rounded-lg transition flex items-center ${
                      newMessageContent.trim() && !sendingMessage
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {sendingMessage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Conversations List */
            <div className="space-y-4">
              {/* Filter Tabs — Pill Style */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'customer', label: 'Customers', count: messageCounts.customer },
                  { key: 'admin', label: 'Admin', count: messageCounts.admin },
                  { key: 'unread', label: 'Unread', count: messageCounts.unread }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      filter === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Conversation Cards */}
              <div className="space-y-2">
                {(() => {
                  const conversations = messages.reduce((groups, message) => {
                    let conversationId: string
                    let conversationName: string
                    let conversationType: 'customer' | 'admin'

                    if (message.sender_role === 'admin' || message.recipient_role === 'admin') {
                      conversationId = 'admin'
                      conversationName = 'Admin'
                      conversationType = 'admin'
                    } else {
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

                    if (new Date(message.created_at) > new Date(groups[conversationId].lastMessageTime)) {
                      groups[conversationId].latestMessage = message
                      groups[conversationId].lastMessageTime = message.created_at
                    }

                    return groups
                  }, {} as Record<string, any>)

                  let conversationList = Object.values(conversations)

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
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <p className="text-sm text-gray-500">No conversations</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {filter === 'unread' ? 'No unread messages.' :
                         filter === 'customer' ? 'No customer conversations.' :
                         'No admin conversations.'}
                      </p>
                    </div>
                  ) : (
                    conversationList.map((conversation: any) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation.id)}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50/50 cursor-pointer transition group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            {conversation.type === 'admin' ? 'A' : conversation.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">{conversation.name}</p>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {conversation.unreadCount > 0 && (
                                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700">
                                    {conversation.unreadCount}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {new Date(conversation.lastMessageTime).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{conversation.latestMessage.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{conversation.totalMessages} message{conversation.totalMessages !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}