import { useEffect, useState, useMemo } from 'react'
import { MessageSquare, User, Store, Send, X, ChevronLeft, Search, Users, Bell, ChevronRight, Check, CheckCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminMessages, getAllVendors, Vendor, sendMessage, getAdminConversationMessages, decryptMessages, markConversationAsRead } from '../../lib/database'
import { getStatusColor } from '../../lib/utils'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, isToday, isYesterday } from 'date-fns'

interface Message {
  id: string
  sender_id: string
  sender_name: string
  sender_role: string
  sender?: {
    id: string
    full_name: string
    email: string
  }
  recipient_id: string
  recipient_name: string
  recipient_role: string
  subject: string
  message: string
  status: 'unread' | 'delivered' | 'read' | 'replied'
  created_at: string
  updated_at: string
}

export default function Messages() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const vendorId = searchParams.get('vendorId')
  const touristId = searchParams.get('touristId')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'vendor_to_admin' | 'tourist_to_admin'>('all')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorSearch, setVendorSearch] = useState('')
  const [currentVendorPage, setCurrentVendorPage] = useState(1)
  const VENDORS_PER_PAGE = 5

  // Chat functionality state
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessageContent, setNewMessageContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendMessageError, setSendMessageError] = useState<string | null>(null)

  // Format timestamp helper
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return 'Yesterday'
    }
    return format(date, 'dd/MM/yyyy')
  }

  // Group messages by conversation partner (the non-admin user)
  const senderGroups = useMemo(() => {
    const groups: Record<string, any> = {}
    const adminId = profile?.id
    
    messages.forEach(message => {
      // Find the "other party" in the conversation (the non-admin user)
      // If admin sent the message, the other party is the recipient
      // If admin received the message, the other party is the sender
      const isAdminSender = message.sender_role === 'admin' || message.sender_id === adminId
      const partnerId = isAdminSender ? message.recipient_id : message.sender_id
      const partnerRole = isAdminSender ? message.recipient_role : message.sender_role
      
      if (!groups[partnerId]) {
        const vendorInfo = partnerRole === 'vendor' 
          ? vendors.find(v => v.user_id === partnerId) 
          : null
        
        // Get partner name from the appropriate side of the message
        const partnerName = isAdminSender 
          ? (message.recipient_role === 'vendor' && vendorInfo 
              ? vendorInfo.business_name 
              : 'Unknown')
          : (message.sender_role === 'vendor' && vendorInfo 
              ? vendorInfo.business_name 
              : (message.sender?.full_name || message.sender_name || 'Unknown'))
        
        groups[partnerId] = {
          senderId: partnerId,
          senderName: partnerName,
          senderRole: partnerRole,
          senderEmail: partnerRole === 'vendor' && vendorInfo 
            ? vendorInfo.business_email 
            : message.sender?.email,
          latestMessage: message,
          unreadCount: 0,
          totalMessages: 0,
          lastMessageTime: message.created_at
        }
      }
      groups[partnerId].totalMessages++
      // Only count unread messages where admin is the recipient
      if (message.status === 'unread' && !isAdminSender) {
        groups[partnerId].unreadCount++
      }
      if (new Date(message.created_at) > new Date(groups[partnerId].lastMessageTime)) {
        groups[partnerId].latestMessage = message
        groups[partnerId].lastMessageTime = message.created_at
      }
    })
    return groups
  }, [messages, vendors, profile?.id])

  // Compute counts
  const counts = useMemo(() => {
    const list = Object.values(senderGroups)
    return {
      all: list.length,
      unread: list.filter((s: any) => s.unreadCount > 0).length,
      vendors: list.filter((s: any) => s.senderRole === 'vendor').length,
      tourists: list.filter((s: any) => s.senderRole === 'tourist').length
    }
  }, [senderGroups])

  // Filtered sender list
  const filteredSenders = useMemo(() => {
    let list = Object.values(senderGroups)
    if (filter === 'unread') {
      list = list.filter((s: any) => s.unreadCount > 0)
    } else if (filter === 'vendor_to_admin') {
      list = list.filter((s: any) => s.senderRole === 'vendor')
    } else if (filter === 'tourist_to_admin') {
      list = list.filter((s: any) => s.senderRole === 'tourist')
    }
    return list.sort((a: any, b: any) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    )
  }, [senderGroups, filter])

  console.log('Messages component: profile:', profile)
  console.log('Messages component: vendorId from URL:', vendorId)

  useEffect(() => {
    fetchMessages()
    fetchVendors()
  }, [filter])

  useEffect(() => {
    setCurrentVendorPage(1)
  }, [vendorSearch])

  useEffect(() => {
    if (vendorId || touristId) {
      fetchChatMessages()
    }
  }, [vendorId, touristId])

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

      const rawData = await getAdminMessages(filterParam)
      // Decrypt any encrypted messages (admin user ID needed for decryption)
      const data = profile?.id ? await decryptMessages(rawData, profile.id) : rawData
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

  const fetchChatMessages = async () => {
    const chatPartnerId = vendorId || touristId
    if (!chatPartnerId) return

    try {
      setLoading(true)
      const partnerRole = vendorId ? 'vendor' : 'tourist'
      const data = await getAdminConversationMessages(chatPartnerId, partnerRole)
      setChatMessages(data)
      
      // Mark messages from this partner as read (blue ticks)
      if (profile?.id) {
        try {
          await markConversationAsRead(profile.id, chatPartnerId)
          // Refresh main messages to update unread counts in conversation list
          fetchMessages()
        } catch (e) {
          console.error('Error marking conversation as read:', e)
        }
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    const chatPartnerId = vendorId || touristId
    const chatPartnerRole = vendorId ? 'vendor' : 'tourist'
    if (!newMessageContent.trim() || !chatPartnerId) return

    setSendingMessage(true)
    setSendMessageError(null)

    try {
      await sendMessage({
        sender_id: profile?.id || '',
        sender_role: 'admin',
        recipient_id: chatPartnerId,
        recipient_role: chatPartnerRole,
        subject: '',
        message: newMessageContent
      })

      // Optimistically add the message
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender_id: profile?.id || '',
        sender_name: profile?.full_name || 'Admin',
        sender_email: profile?.email || '',
        sender_role: 'admin',
        recipient_id: chatPartnerId,
        recipient_role: chatPartnerRole,
        subject: '',
        message: newMessageContent,
        status: 'unread',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])

      setNewMessageContent('')
      fetchChatMessages() // Refresh to get the real message
    } catch (error) {
      setSendMessageError('Failed to send message. Please try again.')
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          {vendorId || touristId 
            ? `Conversation with ${vendorId ? vendors.find(v => v.user_id === vendorId)?.business_name || 'Vendor' : 'Tourist'}`
            : 'Manage communications with vendors and tourists'
          }
        </p>
      </div>

      <div className={`grid grid-cols-1 ${vendorId || touristId ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-6`}>
        {vendorId || touristId ? (
            /* Chat Interface */
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: 'min(70vh, 600px)' }}>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => navigate('/admin/messages')}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                  vendorId ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  {vendorId ? <Store className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {vendorId
                      ? vendors.find(v => v.user_id === vendorId)?.business_name || 'Vendor'
                      : (chatMessages[0]?.sender?.full_name || chatMessages[0]?.sender_name || 'Tourist')
                    }
                    <span className="text-gray-500 font-normal ml-1">
                      ({vendorId ? 'Vendor' : 'Tourist'})
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {vendorId ? 'Vendor Account' : 'Tourist Account'}
                  </p>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">No messages yet</p>
                      <p className="text-xs text-gray-400 mt-1">Start the conversation</p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((message, index) => {
                    const isAdmin = message.sender_role === 'admin'
                    const showAvatar = index === 0 || chatMessages[index - 1].sender_role !== message.sender_role
                    const showTimestamp = index === chatMessages.length - 1 || 
                      new Date(chatMessages[index + 1]?.created_at).getTime() - new Date(message.created_at).getTime() > 300000

                    return (
                      <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-xs lg:max-w-md ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                          {showAvatar && (
                            <div className={`flex-shrink-0 ${isAdmin ? 'ml-2' : 'mr-2'}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                isAdmin ? 'bg-gray-900 text-white' : (vendorId ? 'bg-blue-600 text-white' : 'bg-green-600 text-white')
                              }`}>
                                {isAdmin ? 'A' : (vendorId ? 'V' : 'T')}
                              </div>
                            </div>
                          )}
                          {!showAvatar && <div className="w-9" />}
                          <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                            <div className={`px-3 py-2 rounded-xl text-sm ${
                              isAdmin
                                ? 'bg-gray-900 text-white rounded-br-sm'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                            }`}>
                              <p className="whitespace-pre-wrap">{message.message}</p>
                              {/* Time and status ticks for admin messages */}
                              {isAdmin && (
                                <div className="flex items-center gap-1 mt-1 justify-end">
                                  <span className="text-[10px] text-white/70">
                                    {formatMessageTime(message.created_at)}
                                  </span>
                                  <span className={`${message.status === 'read' ? 'text-blue-400' : 'text-white/60'}`}>
                                    {message.status === 'unread' ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : (
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                            {showTimestamp && !isAdmin && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {formatMessageTime(message.created_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Message Input */}
              <div className="p-3 border-t border-gray-100 bg-white">
                {sendMessageError && (
                  <div className="mb-2 p-2.5 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2">
                    <X className="w-3.5 h-3.5 text-red-500" />
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
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-none"
                    rows={1}
                    style={{ minHeight: '38px', maxHeight: '100px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = Math.min(target.scrollHeight, 100) + 'px'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessageContent.trim() || sendingMessage}
                    className={`min-h-[38px] px-3 py-2 rounded-lg transition-all flex items-center ${
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
          ) : (
            <>
              {/* Conversations Card */}
              <div className="lg:col-span-2 space-y-4">
                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All', count: counts.all, icon: MessageSquare },
                    { key: 'unread', label: 'Unread', count: counts.unread, icon: Bell },
                    { key: 'vendor_to_admin', label: 'Vendors', count: counts.vendors, icon: Store },
                    { key: 'tourist_to_admin', label: 'Tourists', count: counts.tourists, icon: Users }
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

                {/* Conversations List */}
                <div className="space-y-2">
                  {filteredSenders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
                      <p className="mt-3 text-sm font-medium text-gray-900">No conversations</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {filter === 'unread' ? 'All caught up! No unread messages.' :
                         filter === 'vendor_to_admin' ? 'No messages from vendors.' :
                         filter === 'tourist_to_admin' ? 'No messages from tourists.' :
                         'No messages yet.'}
                      </p>
                    </div>
                  ) : (
                    filteredSenders.map((sender: any) => (
                      <div
                        key={sender.senderId}
                        onClick={() => {
                          if (sender.senderRole === 'vendor') {
                            navigate(`/admin/messages?vendorId=${sender.senderId}`)
                          } else {
                            navigate(`/admin/messages?touristId=${sender.senderId}`)
                          }
                        }}
                        className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${
                          sender.unreadCount > 0 
                            ? 'border-gray-300 shadow-sm' 
                            : 'border-gray-200 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            sender.senderRole === 'vendor' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-green-600 text-white'
                          }`}>
                            {sender.senderRole === 'vendor' ? (
                              <Store className="w-5 h-5" />
                            ) : (
                              sender.senderName?.[0]?.toUpperCase() || 'T'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className={`text-sm truncate ${
                                  sender.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
                                }`}>
                                  {sender.senderName}
                                </p>
                                <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  sender.senderRole === 'vendor' 
                                    ? 'bg-blue-50 text-blue-700' 
                                    : 'bg-green-50 text-green-700'
                                }`}>
                                  {sender.senderRole === 'vendor' ? 'Vendor' : 'Tourist'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                {sender.unreadCount > 0 && (
                                  <span className="inline-flex min-w-[20px] h-5 px-1.5 items-center justify-center rounded-full text-xs font-semibold bg-red-500 text-white">
                                    {sender.unreadCount}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {formatMessageTime(sender.lastMessageTime)}
                                </span>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1 mt-0.5 ${
                              sender.unreadCount > 0 ? 'text-gray-700' : 'text-gray-500'
                            }`}>
                              {/* Show tick if admin sent the latest message */}
                              {(sender.latestMessage.sender_role === 'admin' || sender.latestMessage.sender_id === profile?.id) && (
                                <span className={`flex-shrink-0 ${
                                  sender.latestMessage.status === 'read' ? 'text-blue-500' : 'text-gray-400'
                                }`}>
                                  {sender.latestMessage.status === 'unread' ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  )}
                                </span>
                              )}
                              <p className="text-sm line-clamp-1">
                                {sender.latestMessage.message}
                              </p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {sender.totalMessages} message{sender.totalMessages !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Monitor Vendor Chats */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-900">Monitor Vendor Chats</h2>
                    <span className="text-xs text-gray-500">{vendors.length}</span>
                  </div>

                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    />
                  </div>

                  {/* Vendor List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(() => {
                      const filteredVendors = vendors.filter(vendor =>
                        vendor.business_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                        (vendor.business_email && vendor.business_email.toLowerCase().includes(vendorSearch.toLowerCase()))
                      )

                      const startIndex = (currentVendorPage - 1) * VENDORS_PER_PAGE
                      const paginatedVendors = filteredVendors.slice(startIndex, startIndex + VENDORS_PER_PAGE)

                      return filteredVendors.length === 0 ? (
                        <div className="py-8 text-center">
                          <Store className="mx-auto h-8 w-8 text-gray-300" />
                          <p className="mt-2 text-xs text-gray-500">No vendors found</p>
                        </div>
                      ) : (
                        paginatedVendors.map((vendor) => (
                          <div
                            key={vendor.id}
                            onClick={() => navigate(`/admin/vendor-messages?vendor=${btoa(vendor.user_id)}`)}
                            className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                {vendor.business_name?.[0]?.toUpperCase() || 'V'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {vendor.business_name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {vendor.business_email || 'No email'}
                                </p>
                              </div>
                              <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusColor(vendor.status)}`}>
                                {vendor.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )
                    })()}
                  </div>

                  {/* Pagination */}
                  {(() => {
                    const filteredVendors = vendors.filter(vendor =>
                      vendor.business_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                      (vendor.business_email && vendor.business_email.toLowerCase().includes(vendorSearch.toLowerCase()))
                    )
                    const totalPages = Math.ceil(filteredVendors.length / VENDORS_PER_PAGE)

                    if (filteredVendors.length <= VENDORS_PER_PAGE) return null

                    return (
                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {Math.min((currentVendorPage - 1) * VENDORS_PER_PAGE + 1, filteredVendors.length)}-{Math.min(currentVendorPage * VENDORS_PER_PAGE, filteredVendors.length)} of {filteredVendors.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCurrentVendorPage(prev => Math.max(1, prev - 1))}
                            disabled={currentVendorPage === 1}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span>{currentVendorPage}/{totalPages}</span>
                          <button
                            onClick={() => setCurrentVendorPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentVendorPage === totalPages}
                            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

  )
}