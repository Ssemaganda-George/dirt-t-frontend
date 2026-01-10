import { useEffect, useState } from 'react'
import { MessageSquare, User, Store, CheckCircle, Send, X, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getAdminMessages, markMessageAsRead, replyToMessage, getAllVendors, Vendor, sendMessage, getVendorMessages } from '../../lib/database'
import { getStatusColor } from '../../lib/utils'
import { useNavigate, useSearchParams } from 'react-router-dom'

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
  status: 'unread' | 'read' | 'replied'
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
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'vendor_to_admin' | 'tourist_to_admin'>('all')
  const [replyMessage, setReplyMessage] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorSearch, setVendorSearch] = useState('')
  const [currentVendorPage, setCurrentVendorPage] = useState(1)
  const VENDORS_PER_PAGE = 5

  // Chat functionality state
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessageContent, setNewMessageContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendMessageError, setSendMessageError] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  const fetchChatMessages = async () => {
    const chatPartnerId = vendorId || touristId
    if (!chatPartnerId) return

    try {
      setLoading(true)
      const data = await getVendorMessages(chatPartnerId, 'admin')
      setChatMessages(data)
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
                {vendorId || touristId ? 'Chat' : 'Manage Messages'}
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                {vendorId || touristId 
                  ? `Chat with ${vendorId ? vendors.find(v => v.user_id === vendorId)?.business_name || 'Vendor' : 'Tourist'}`
                  : 'Manage messages and vendor accounts'
                }
              </p>
            </div>
            {vendorId || touristId && (
              <button
                onClick={() => navigate('/admin/messages')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back to All Messages
              </button>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-1 ${vendorId || touristId ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-8`}>
          {vendorId || touristId ? (
            /* Chat Interface */
            <div className={`shadow-sm rounded-lg overflow-hidden ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
              {/* Chat Header */}
              <div className="mb-4 flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigate('/admin/messages')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ←
                  </button>
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    {vendorId ? (
                      <Store className="w-5 h-5 text-primary-600" />
                    ) : (
                      <User className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vendorId
                        ? vendors.find(v => v.user_id === vendorId)?.business_name || 'Vendor'
                        : 'Tourist'
                      }
                    </h3>
                    <p className="text-sm text-gray-500">
                      {vendorId ? 'Vendor Account' : 'Tourist Account'}
                    </p>
                  </div>
                </div>
                {/* Theme Toggle */}
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>

              {/* Messages Container */}
              <div className={`h-96 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <h3 className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>No messages yet</h3>
                      <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Start the conversation with this {vendorId ? 'vendor' : 'tourist'}.</p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((message, index) => {
                    const isAdmin = message.sender_role === 'admin'
                    const showAvatar = index === 0 || chatMessages[index - 1].sender_role !== message.sender_role
                    const showTimestamp = index === chatMessages.length - 1 || 
                      new Date(chatMessages[index + 1].created_at).getTime() - new Date(message.created_at).getTime() > 300000 // 5 minutes

                    return (
                      <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-xs lg:max-w-md ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                          {showAvatar && (
                            <div className={`flex-shrink-0 ${isAdmin ? 'ml-2' : 'mr-2'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isAdmin 
                                  ? (isDarkMode ? 'bg-blue-800' : 'bg-primary-100')
                                  : (isDarkMode ? 'bg-green-800' : 'bg-blue-100')
                              }`}>
                                {isAdmin ? (
                                  <User className={`w-4 h-4 ${isDarkMode ? 'text-blue-300' : 'text-primary-600'}`} />
                                ) : (
                                  <Store className={`w-4 h-4 ${isDarkMode ? 'text-green-300' : 'text-blue-600'}`} />
                                )}
                              </div>
                            </div>
                          )}
                          {!showAvatar && <div className="w-10" />}
                          <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2 rounded-2xl ${
                              isAdmin
                                ? (isDarkMode ? 'bg-[#005c4b] text-white rounded-br-md' : 'bg-primary-600 text-white rounded-br-md')
                                : (isDarkMode ? 'bg-gray-700 text-white rounded-bl-md border border-gray-600' : 'bg-white text-gray-900 rounded-bl-md border border-gray-200')
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            </div>
                            {showTimestamp && (
                              <p className={`text-xs mt-1 ${isAdmin ? 'text-right' : 'text-left'} ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(message.created_at).toLocaleString()}
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
              <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700 bg-[#0a0a0a]' : 'border-gray-200 bg-white'}`}>
                {sendMessageError && (
                  <div className={`mb-3 p-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-red-900 border-red-700' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center">
                      <X className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
                      <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{sendMessageError}</p>
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
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type your message..."
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 resize-none ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-400' 
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = 'auto'
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessageContent.trim() || sendingMessage}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                      newMessageContent.trim() && !sendingMessage
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {sendingMessage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                    {(() => {
                      const vendorMessages = messages.filter(m => m.sender_role === 'vendor')
                      const touristMessages = messages.filter(m => m.sender_role === 'tourist')
                      const vendorGroups = vendorMessages.reduce((groups, message) => {
                        const senderId = message.sender_id
                        if (!groups[senderId]) {
                          groups[senderId] = { unreadCount: 0 }
                        }
                        if (message.status === 'unread') {
                          groups[senderId].unreadCount++
                        }
                        return groups
                      }, {} as Record<string, any>)

                      const touristGroups = touristMessages.reduce((groups, message) => {
                        const senderId = message.sender_id
                        if (!groups[senderId]) {
                          groups[senderId] = { unreadCount: 0 }
                        }
                        if (message.status === 'unread') {
                          groups[senderId].unreadCount++
                        }
                        return groups
                      }, {} as Record<string, any>)

                      const totalSenders = Object.keys(vendorGroups).length + Object.keys(touristGroups).length
                      const sendersWithUnread = Object.values(vendorGroups).filter((g: any) => g.unreadCount > 0).length +
                                               Object.values(touristGroups).filter((g: any) => g.unreadCount > 0).length

                      return (
                        <>
                          <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              filter === 'all'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            All ({totalSenders})
                          </button>
                          <button
                            onClick={() => setFilter('unread')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              filter === 'unread'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Unread ({sendersWithUnread})
                          </button>
                          <button
                            onClick={() => setFilter('vendor_to_admin')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              filter === 'vendor_to_admin'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Vendors ({Object.keys(vendorGroups).length})
                          </button>
                          <button
                            onClick={() => setFilter('tourist_to_admin')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              filter === 'tourist_to_admin'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            Tourists ({Object.keys(touristGroups).length})
                          </button>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Messages List - Show vendors with messages */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(() => {
                    // Group messages by sender (both vendors and tourists)
                    const senderGroups = messages.reduce((groups, message) => {
                      const senderId = message.sender_id
                      if (!groups[senderId]) {
                        // Find vendor info if this is a vendor
                        const vendorInfo = message.sender_role === 'vendor' ? 
                          vendors.find(v => v.user_id === senderId) : null
                        
                        groups[senderId] = {
                          senderId,
                          senderName: message.sender_role === 'vendor' && vendorInfo ? 
                            vendorInfo.business_name : message.sender_name,
                          senderRole: message.sender_role,
                          senderEmail: message.sender_role === 'vendor' && vendorInfo ? 
                            vendorInfo.business_email : message.sender?.email,
                          latestMessage: message,
                          unreadCount: 0,
                          totalMessages: 0,
                          lastMessageTime: message.created_at
                        }
                      }
                      groups[senderId].totalMessages++
                      if (message.status === 'unread') {
                        groups[senderId].unreadCount++
                      }
                      // Update latest message if this one is newer
                      if (new Date(message.created_at) > new Date(groups[senderId].lastMessageTime)) {
                        groups[senderId].latestMessage = message
                        groups[senderId].lastMessageTime = message.created_at
                      }
                      return groups
                    }, {} as Record<string, any>)

                    let senderList = Object.values(senderGroups)

                    // Apply filter
                    if (filter === 'unread') {
                      senderList = senderList.filter((s: any) => s.unreadCount > 0)
                    } else if (filter === 'vendor_to_admin') {
                      senderList = senderList.filter((s: any) => s.senderRole === 'vendor')
                    } else if (filter === 'tourist_to_admin') {
                      senderList = senderList.filter((s: any) => s.senderRole === 'tourist')
                    }

                    senderList = senderList.sort((a: any, b: any) =>
                      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
                    )

                    return senderList.length === 0 ? (
                      <div className="p-4 text-center">
                        <MessageSquare className="mx-auto h-8 w-8 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {filter === 'all' ? 'No messages found.' :
                           filter === 'unread' ? 'No senders with unread messages.' :
                           filter === 'vendor_to_admin' ? 'No messages from vendors.' :
                           'No messages from tourists.'}
                        </p>
                      </div>
                    ) : (
                      senderList.slice(0, 5).map((senderGroup: any) => (
                        <div
                          key={senderGroup.senderId}
                          onClick={() => {
                            if (senderGroup.senderRole === 'vendor') {
                              navigate(`/admin/messages?vendorId=${senderGroup.senderId}`)
                            } else {
                              // For tourists, we might need a different approach since we don't have a tourist chat interface yet
                              // For now, just navigate to a tourist chat or show an alert
                              alert('Tourist chat interface not implemented yet')
                            }
                          }}
                          className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border-gray-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              <div className="flex-shrink-0">
                                {senderGroup.senderRole === 'vendor' ? (
                                  <Store className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <User className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {senderGroup.senderName}
                                  </p>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      senderGroup.senderRole === 'vendor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                      {senderGroup.senderRole}
                                    </span>
                                    {senderGroup.unreadCount > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        {senderGroup.unreadCount} unread
                                      </span>
                                    )}
                                    <p className="text-xs text-gray-500">
                                      {new Date(senderGroup.lastMessageTime).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                  {senderGroup.latestMessage.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {senderGroup.totalMessages} message{senderGroup.totalMessages !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  })()}
                </div>

                {(() => {
                  const senderGroups = messages.reduce((groups, message) => {
                    const senderId = message.sender_id
                    if (!groups[senderId]) {
                      groups[senderId] = { senderRole: message.sender_role, unreadCount: 0 }
                    }
                    if (message.status === 'unread') {
                      groups[senderId].unreadCount++
                    }
                    return groups
                  }, {} as Record<string, any>)

                  let senderList = Object.values(senderGroups)
                  if (filter === 'unread') {
                    senderList = senderList.filter((s: any) => s.unreadCount > 0)
                  } else if (filter === 'vendor_to_admin') {
                    senderList = senderList.filter((s: any) => s.senderRole === 'vendor')
                  } else if (filter === 'tourist_to_admin') {
                    senderList = senderList.filter((s: any) => s.senderRole === 'tourist')
                  }

                  return senderList.length > 5 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Showing 5 of {senderList.length} senders
                      </p>
                    </div>
                  )
                })()}
              </div>

              {/* Vendor Accounts Card - Only show when not filtering by specific vendor or tourist */}
              {!vendorId && !touristId && (
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
            </>
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