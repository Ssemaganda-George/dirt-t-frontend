import { useEffect, useState, useRef, useMemo } from 'react'
import { Send, X, ChevronLeft, MessageSquare, Users, Shield, Bell, CheckCheck, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getVendorMessages, sendMessage, getAdminProfileId, decryptMessages } from '../../lib/database'
import { format, isToday, isYesterday } from 'date-fns'

interface Message {
  id: string
  sender_id: string
  sender_name?: string
  sender_email?: string
  sender_role: string
  sender?: {
    id: string
    full_name: string
    email: string
  }
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'customer' | 'admin'>('all')
  const [newMessageContent, setNewMessageContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendMessageError, setSendMessageError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom()
    }
  }, [selectedConversation, messages])

  // Format message timestamp
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm')
    }
    return format(date, 'dd/MM/yyyy HH:mm')
  }

  // Compute conversations from messages
  const conversations = useMemo(() => {
    const currentUserId = profile?.id || vendor?.user_id
    const groups: Record<string, any> = {}
    
    messages.forEach(message => {
      let conversationId: string
      let conversationName: string
      let conversationType: 'customer' | 'admin'

      // Admin/System messages go to admin conversation thread
      if (message.sender_role === 'admin' || message.sender_role === 'system' || message.recipient_role === 'admin') {
        conversationId = 'admin'
        conversationName = 'Support Team'
        conversationType = 'admin'
      } else {
        conversationId = message.sender_id === currentUserId ? message.recipient_id : message.sender_id
        // Get customer name from messages they sent (not from vendor's sent messages)
        // Use sender.full_name from the joined profiles table
        const customerName = message.sender_id !== currentUserId 
          ? (message.sender?.full_name || message.sender_name) 
          : null
        conversationType = 'customer'
        
        // Only set conversationName if we have a real name from the customer
        if (customerName) {
          conversationName = customerName
        } else {
          conversationName = 'Customer'
        }
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
      } else if (conversationType === 'customer') {
        // Update name if we found a better one (actual customer name vs "Customer")
        const existingName = groups[conversationId].name
        if (existingName === 'Customer' && conversationName !== 'Customer') {
          groups[conversationId].name = conversationName
        }
      }

      groups[conversationId].totalMessages++
      if (message.status === 'unread' && message.recipient_id === currentUserId) {
        groups[conversationId].unreadCount++
      }

      if (new Date(message.created_at) > new Date(groups[conversationId].lastMessageTime)) {
        groups[conversationId].latestMessage = message
        groups[conversationId].lastMessageTime = message.created_at
      }
    })

    return Object.values(groups).sort((a: any, b: any) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    )
  }, [messages, profile?.id, vendor?.user_id])

  // Compute counts based on unique conversations
  const conversationCounts = useMemo(() => {
    const customerConvos = conversations.filter((c: any) => c.type === 'customer')
    const adminConvos = conversations.filter((c: any) => c.type === 'admin')
    const unreadConvos = conversations.filter((c: any) => c.unreadCount > 0)
    const totalUnreadMessages = conversations.reduce((sum: number, c: any) => sum + c.unreadCount, 0)

    return {
      all: conversations.length,
      customer: customerConvos.length,
      admin: adminConvos.length,
      unread: unreadConvos.length,
      totalUnreadMessages
    }
  }, [conversations])

  // Get filtered conversations
  const filteredConversations = useMemo(() => {
    if (filter === 'unread') {
      return conversations.filter((c: any) => c.unreadCount > 0)
    } else if (filter === 'customer') {
      return conversations.filter((c: any) => c.type === 'customer')
    } else if (filter === 'admin') {
      return conversations.filter((c: any) => c.type === 'admin')
    }
    return conversations
  }, [conversations, filter])

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
    console.debug('VendorMessages page: SUPABASE_URL=', import.meta.env.VITE_SUPABASE_URL, 'profileId=', profile?.id, 'vendorUserId=', vendor?.user_id)
    fetchMessages()
  }, [filter])

  const fetchMessages = async () => {
    const vendorId = profile?.id || vendor?.user_id || ''
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

      console.debug('VendorMessages: calling getVendorMessages', { vendorId, filterParam })
      const rawData = await getVendorMessages(vendorId, filterParam)
      console.debug('VendorMessages: getVendorMessages returned', rawData?.length)
      
      // Decrypt any encrypted messages
      const data = await decryptMessages(rawData, vendorId)
      
      // Update state and cache
      setMessages(data)
      saveMessagesToCache(vendorId, filter, data)
    } catch (error) {
      console.error('Error fetching messages:', error)
      try { console.debug('Error fetching messages detail:', JSON.stringify(error)) } catch (e) {}
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
    if (!selectedConversation) {
      setSendMessageError('No conversation selected.')
      return
    }

    setSendingMessage(true)
    try {
      const userId = profile?.id || vendor?.user_id || ''
      let recipientId: string
      let recipientRole: string

      if (selectedConversation === 'admin') {
        // Sending to admin
        const adminRecipientId = await getAdminProfileId()
        if (!adminRecipientId) {
          setSendMessageError('No admin profile found. Cannot send message.')
          return
        }
        recipientId = adminRecipientId
        recipientRole = 'admin'
      } else {
        // Sending to a customer (tourist)
        recipientId = selectedConversation
        recipientRole = 'tourist'
      }

      const payload = {
        sender_id: userId,
        sender_role: 'vendor',
        recipient_id: recipientId,
        recipient_role: recipientRole,
        subject: '',
        message: newMessageContent
      }
      console.debug('VendorMessages: sending message payload', payload)
      const newMsg = await sendMessage(payload)
      console.debug('VendorMessages: sendMessage returned', newMsg)

      // Optimistically add the new message to the current conversation
      setMessages((prev) => [
        {
          id: newMsg?.id || Math.random().toString(),
          sender_id: userId,
          sender_name: profile?.full_name || 'You',
          sender_email: profile?.email || '',
          sender_role: 'vendor',
          recipient_id: recipientId,
          recipient_role: recipientRole,
          subject: '',
          message: newMessageContent,
          status: 'unread',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ])

      setNewMessageContent('')
      setSendMessageError(null)
      // Refresh messages in the background
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
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Manage communications with customers and administrators</p>
        </div>
        {!selectedConversation && (
          <button
            onClick={() => setSelectedConversation('admin')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Contact Support</span>
            <span className="sm:hidden">Support</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            /* Chat Interface */
            (() => {
              // Get selected conversation details
              const currentConvo = conversations.find((c: any) => c.id === selectedConversation)
              const convoName = currentConvo?.name || (selectedConversation === 'admin' ? 'Support Team' : 'Customer')
              const isAdmin = selectedConversation === 'admin'
              
              return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: 'min(70vh, 520px)' }}>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                  isAdmin ? 'bg-blue-600' : 'bg-gray-900'
                }`}>
                  {isAdmin ? <Shield className="w-4 h-4" /> : (convoName?.[0]?.toUpperCase() || 'C')}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {convoName}{!isAdmin && <span className="text-gray-500 font-normal ml-1">(Tourist)</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isAdmin ? 'Admin & System Notifications' : 'Customer Account'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {(() => {
                  const conversationMessages = messages.filter(msg => {
                    if (selectedConversation === 'admin') {
                      // Include admin and system messages in admin thread
                      return msg.sender_role === 'admin' || msg.sender_role === 'system' || msg.recipient_role === 'admin'
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
                      const currentUserId = profile?.id || vendor?.user_id
                      const isVendor = message.sender_id === currentUserId
                      const isSystem = message.sender_role === 'system'
                      const showAvatar = !isSystem && (index === 0 || conversationMessages[index - 1]?.sender_id !== message.sender_id)
                      const showTimestamp = index === conversationMessages.length - 1 ||
                        new Date(conversationMessages[index + 1]?.created_at).getTime() - new Date(message.created_at).getTime() > 300000

                      // System messages are centered notifications
                      if (isSystem) {
                        return (
                          <div key={message.id} className="flex justify-center my-2">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 max-w-md">
                              <div className="flex items-center gap-2 text-amber-700">
                                <Bell className="w-4 h-4 flex-shrink-0" />
                                <p className="text-sm">{message.message}</p>
                              </div>
                              <p className="text-[10px] text-amber-500 mt-1 text-center">
                                {formatMessageTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div key={message.id} className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-xs lg:max-w-sm ${isVendor ? 'flex-row-reverse' : 'flex-row'}`}>
                            {showAvatar && (
                              <div className={`flex-shrink-0 ${isVendor ? 'ml-2' : 'mr-2'}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                  isVendor ? 'bg-gray-900 text-white' : 'bg-blue-600 text-white'
                                }`}>
                                  {isVendor ? 'Y' : (message.sender_role === 'admin' ? 'A' : ((message.sender?.full_name || message.sender_name)?.[0]?.toUpperCase() || 'C'))}
                                </div>
                              </div>
                            )}
                            {!showAvatar && <div className="w-9" />}
                            <div className={`flex flex-col ${isVendor ? 'items-end' : 'items-start'}`}>
                              <div className={`px-3 py-2 rounded-xl text-sm ${
                                isVendor
                                  ? 'bg-gray-900 text-white rounded-br-sm'
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                              }`}>
                                <p className="whitespace-pre-wrap">{message.message}</p>
                              </div>
                              {showTimestamp && (
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {formatMessageTime(message.created_at)}
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
                <div ref={messagesEndRef} />
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
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 resize-none"
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
                    className={`min-h-[38px] px-3 py-2 rounded-lg transition-all flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                      newMessageContent.trim() && !sendingMessage
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
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
              )
            })()
          ) : (
            /* Conversations List */
            <div className="space-y-4">
              {/* Filter Tabs — Icon Pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', count: conversationCounts.all, icon: MessageSquare },
                  { key: 'customer', label: 'Customers', count: conversationCounts.customer, icon: Users },
                  { key: 'admin', label: 'Admin', count: conversationCounts.admin, icon: Shield },
                  { key: 'unread', label: 'Unread', count: conversationCounts.unread, icon: Bell }
                ].map((tab) => {
                  const Icon = tab.icon
                  const isActive = filter === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as any)}
                      className={`min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Conversation Cards */}
              <div className="space-y-2">
                {filteredConversations.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No conversations</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {filter === 'unread' ? 'All caught up! No unread messages.' :
                       filter === 'customer' ? 'No customer conversations yet.' :
                       filter === 'admin' ? 'No admin conversations yet.' :
                       'Start a conversation to see messages here.'}
                    </p>
                    {(filter === 'admin' || filter === 'all') && (
                      <button
                        onClick={() => setSelectedConversation('admin')}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                      >
                        <Plus className="w-4 h-4" />
                        Contact Support Team
                      </button>
                    )}
                  </div>
                ) : (
                  filteredConversations.map((conversation: any) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`bg-white rounded-xl border p-4 cursor-pointer transition-all group focus-within:ring-2 focus-within:ring-gray-900/20 ${
                        conversation.unreadCount > 0 
                          ? 'border-gray-300 hover:border-gray-400 shadow-sm' 
                          : 'border-gray-200 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                          conversation.type === 'admin' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-900 text-white'
                        }`}>
                          {conversation.type === 'admin' ? (
                            <Shield className="w-5 h-5" />
                          ) : (
                            conversation.name?.[0]?.toUpperCase() || 'C'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className={`text-sm truncate ${
                                conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
                              }`}>
                                {conversation.name}
                              </p>
                              {conversation.type === 'admin' && (
                                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">Admin</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              {conversation.unreadCount > 0 && (
                                <span className="inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-xs font-semibold bg-red-500 text-white">
                                  {conversation.unreadCount}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {formatMessageTime(conversation.lastMessageTime)}
                              </span>
                            </div>
                          </div>
                          <p className={`text-sm mt-0.5 line-clamp-1 ${
                            conversation.unreadCount > 0 ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                            {conversation.latestMessage.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-gray-400">
                              {conversation.totalMessages} message{conversation.totalMessages !== 1 ? 's' : ''}
                            </span>
                            {conversation.unreadCount === 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <CheckCheck className="w-3.5 h-3.5" />
                                Read
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}