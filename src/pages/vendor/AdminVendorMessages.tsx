import { useEffect, useState, useRef, useMemo } from 'react'
import { MessageSquare, ChevronLeft, Users, Shield, Bell, ArrowLeft, Eye } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getVendorMessages, getAllVendors, decryptMessages } from '../../lib/database'
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
  status: 'unread' | 'delivered' | 'read' | 'replied'
  created_at: string
  updated_at: string
}

export default function AdminVendorMessages() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const vendorParam = searchParams.get('vendor')
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'customer' | 'admin'>('all')
  const [vendor, setVendor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
    if (!vendor) return []
    const vendorUserId = vendor.user_id
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
        conversationId = message.sender_id === vendorUserId ? message.recipient_id : message.sender_id
        // Get customer name from messages they sent
        const customerName = message.sender_id !== vendorUserId 
          ? (message.sender?.full_name || message.sender_name) 
          : null
        conversationType = 'customer'
        
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
        const existingName = groups[conversationId].name
        if (existingName === 'Customer' && conversationName !== 'Customer') {
          groups[conversationId].name = conversationName
        }
      }

      groups[conversationId].totalMessages++
      if (message.status === 'unread' && message.recipient_id === vendorUserId) {
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
  }, [messages, vendor])

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

  useEffect(() => {
    fetchVendorAndMessages()
  }, [vendorParam, filter])

  const fetchVendorAndMessages = async () => {
    if (!vendorParam) return
    setLoading(true)
    
    try {
      const vendorId = atob(vendorParam)
      const allVendors = await getAllVendors()
      const foundVendor = allVendors.find(v => v.user_id === vendorId)
      
      if (!foundVendor) {
        console.error('Vendor not found for ID:', vendorId)
        setLoading(false)
        return
      }
      
      setVendor(foundVendor)
      
      let filterParam: 'unread' | 'customer' | 'admin' | undefined
      if (filter === 'unread') {
        filterParam = 'unread'
      } else if (filter === 'customer') {
        filterParam = 'customer'
      } else if (filter === 'admin') {
        filterParam = 'admin'
      }

      const rawData = await getVendorMessages(foundVendor.user_id, filterParam)
      // Note: Admin can only view encrypted messages if they have access to the vendor's private key
      // E2E encrypted messages will show as encrypted for security
      const data = await decryptMessages(rawData, foundVendor.user_id)
      setMessages(data)
    } catch (error) {
      console.error('Error fetching vendor and messages:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-7 w-36 bg-gray-200 rounded-lg" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-8 w-28 bg-gray-200 rounded-md" />)}
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

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Vendor not found</h2>
          <p className="text-gray-600 mt-2">The vendor you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/admin/messages')}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
          >
            Back to Messages
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/admin/messages')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Messages
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Eye className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Monitoring: {vendor.business_name}</h1>
            <p className="text-sm text-gray-500">Viewing vendor's conversations (Read-Only)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            /* Chat Interface - Read Only */
            (() => {
              const currentConvo = conversations.find((c: any) => c.id === selectedConversation)
              const convoName = currentConvo?.name || (selectedConversation === 'admin' ? 'Support Team' : 'Customer')
              const isAdmin = selectedConversation === 'admin'
              
              return (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: 'min(70vh, 520px)' }}>
                  {/* Chat Header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                      isAdmin ? 'bg-blue-600' : 'bg-gray-900'
                    }`}>
                      {isAdmin ? <Shield className="w-4 h-4" /> : (convoName?.[0]?.toUpperCase() || 'C')}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {convoName}{!isAdmin && <span className="text-gray-500 font-normal ml-1">(Tourist)</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isAdmin ? 'Admin & System Messages' : 'Customer Conversation'}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">
                      Read-Only
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    {(() => {
                      const conversationMessages = messages.filter(msg => {
                        if (selectedConversation === 'admin') {
                          return msg.sender_role === 'admin' || msg.sender_role === 'system' || msg.recipient_role === 'admin'
                        } else {
                          return msg.sender_id === selectedConversation || msg.recipient_id === selectedConversation
                        }
                      }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

                      return conversationMessages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-500">No messages in this conversation</p>
                          </div>
                        </div>
                      ) : (
                        conversationMessages.map((message, index) => {
                          const isVendor = message.sender_id === vendor.user_id
                          const isSystem = message.sender_role === 'system'
                          const showAvatar = !isSystem && (index === 0 || conversationMessages[index - 1]?.sender_id !== message.sender_id)
                          const showTimestamp = index === conversationMessages.length - 1 || 
                            new Date(conversationMessages[index + 1]?.created_at).getTime() - new Date(message.created_at).getTime() > 300000

                          if (isSystem) {
                            return (
                              <div key={message.id} className="flex justify-center">
                                <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full max-w-xs text-center">
                                  {message.message}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div key={message.id} className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
                              <div className={`flex max-w-xs lg:max-w-md ${isVendor ? 'flex-row-reverse' : 'flex-row'}`}>
                                {showAvatar && (
                                  <div className={`flex-shrink-0 ${isVendor ? 'ml-2' : 'mr-2'}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                      isVendor ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                                    }`}>
                                      {isVendor ? 'V' : (message.sender?.full_name?.[0] || message.sender_name?.[0] || 'C')}
                                    </div>
                                  </div>
                                )}
                                {!showAvatar && <div className="w-9" />}
                                <div className={`flex flex-col ${isVendor ? 'items-end' : 'items-start'}`}>
                                  {showAvatar && (
                                    <p className="text-[10px] text-gray-500 mb-0.5 px-1">
                                      {isVendor ? vendor.business_name : (message.sender?.full_name || message.sender_name || 'Customer')}
                                    </p>
                                  )}
                                  <div className={`px-3 py-2 rounded-xl text-sm ${
                                    isVendor
                                      ? 'bg-blue-600 text-white rounded-br-sm'
                                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                                  }`}>
                                    <p className="whitespace-pre-wrap">{message.message}</p>
                                  </div>
                                  {showTimestamp && (
                                    <p className="text-[10px] text-gray-400 mt-1">
                                      {formatMessageTime(message.created_at)}
                                    </p>
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

                  {/* Read-Only Notice */}
                  <div className="p-3 border-t border-gray-100 bg-amber-50">
                    <p className="text-xs text-amber-700 text-center">
                      You are viewing this conversation in read-only mode for monitoring purposes
                    </p>
                  </div>
                </div>
              )
            })()
          ) : (
            /* Conversation List */
            <div className="space-y-4">
              {/* Filter Tabs */}
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
                      className={`min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Conversations */}
              <div className="space-y-2">
                {filteredConversations.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-900">No conversations</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {filter === 'unread' ? 'No unread messages.' :
                       filter === 'customer' ? 'No customer messages.' :
                       filter === 'admin' ? 'No admin messages.' :
                       'No messages yet.'}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((convo: any) => (
                    <div
                      key={convo.id}
                      onClick={() => setSelectedConversation(convo.id)}
                      className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                        convo.unreadCount > 0 
                          ? 'border-gray-300 shadow-sm' 
                          : 'border-gray-200 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          convo.type === 'admin' ? 'bg-blue-600' : 'bg-green-600'
                        } text-white`}>
                          {convo.type === 'admin' ? (
                            <Shield className="w-5 h-5" />
                          ) : (
                            convo.name?.[0]?.toUpperCase() || 'C'
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className={`text-sm truncate ${
                                convo.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
                              }`}>
                                {convo.name}
                              </p>
                              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                convo.type === 'admin' 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'bg-green-50 text-green-700'
                              }`}>
                                {convo.type === 'admin' ? 'Admin' : 'Tourist'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              {convo.unreadCount > 0 && (
                                <span className="inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-xs font-semibold bg-red-500 text-white">
                                  {convo.unreadCount}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {formatMessageTime(convo.lastMessageTime)}
                              </span>
                            </div>
                          </div>
                          <p className={`text-sm mt-0.5 line-clamp-1 ${
                            convo.unreadCount > 0 ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                            {convo.latestMessage?.message || 'No messages'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {convo.totalMessages} message{convo.totalMessages !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Vendor Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-semibold">
                {vendor.business_name?.[0]?.toUpperCase() || 'V'}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{vendor.business_name}</h3>
                <p className="text-xs text-gray-500">{vendor.business_email || 'No email'}</p>
              </div>
            </div>
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  vendor.status === 'approved' ? 'bg-green-100 text-green-700' :
                  vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {vendor.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total Conversations</span>
                <span className="font-medium text-gray-900">{conversationCounts.all}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Unread Messages</span>
                <span className="font-medium text-gray-900">{conversationCounts.totalUnreadMessages}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Customer Chats</span>
                <span className="font-medium text-gray-900">{conversationCounts.customer}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-900">Monitoring Mode</h4>
                <p className="text-xs text-amber-700 mt-1">
                  You're viewing this vendor's conversations for quality assurance and support purposes. Messages are read-only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
