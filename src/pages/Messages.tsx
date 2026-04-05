import { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { getTouristMessages, sendMessage, getAdminProfileId, decryptMessages, markConversationAsRead } from '../lib/database'
import { MessageSquare, Send, Plus, ChevronLeft, Check, CheckCheck } from 'lucide-react'

type Thread = {
  id: string
  title: string
  type: 'inquiry' | 'vendor' | 'admin' | 'system'
  lastMessageAt: string
  unread: number
}

type Message = {
  id: string
  threadId: string
  senderId: string
  author: string
  body: string
  createdAt: string
  status?: 'sent' | 'delivered' | 'read'
}

export default function Messages() {
  const { user } = useAuth()
  const { t } = usePreferences()
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [compose, setCompose] = useState('')
  const [sendMessageError, setSendMessageError] = useState<string | null>(null)
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [newMessageToAdmin, setNewMessageToAdmin] = useState('')
  const [sendingNewMessage, setSendingNewMessage] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change or thread changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeThreadId, messages])

  // Mark messages as read when opening a conversation
  useEffect(() => {
    if (!activeThreadId || !user?.id) return
    
    // Extract partner ID from thread ID (format: "role_partnerId")
    const parts = activeThreadId.split('_')
    if (parts.length >= 2) {
      const partnerId = parts.slice(1).join('_') // Handle UUIDs with underscores
      if (partnerId && partnerId !== 'admin_system') {
        markConversationAsRead(user.id, partnerId)
          .then(() => {
            // Update local state to reflect read status and clear unread count
            setThreads(prev => prev.map(t => 
              t.id === activeThreadId ? { ...t, unread: 0 } : t
            ))
            setMessages(prev => ({
              ...prev,
              [activeThreadId]: (prev[activeThreadId] || []).map(m => ({
                ...m,
                status: m.senderId !== user.id ? 'read' : m.status
              }))
            }))
          })
          .catch(e => console.error('Error marking conversation as read:', e))
      }
    }
  }, [activeThreadId, user?.id])

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

  // Fetch real messages for tourist and map to threads
  useEffect(() => {
    if (!user?.id) return

    const load = async () => {
      try {
        console.debug('Messages page: SUPABASE_URL=', import.meta.env.VITE_SUPABASE_URL, 'userId=', user.id)
        console.debug('Messages page: calling getTouristMessages for user', user.id)
        const rawRows: any[] = await getTouristMessages(user.id)
        console.debug('Messages page: getTouristMessages returned', rawRows?.length)
        
        // Decrypt any encrypted messages
        const rows = await decryptMessages(rawRows, user.id)

        // Group messages by conversation partner (other profile id + role)
        // System messages are grouped with admin
        const grouped: Record<string, any[]> = {}
        rows.forEach((r) => {
          // Treat system messages as part of admin conversation
          const isSystem = r.sender_role === 'system'
          const otherId = isSystem ? 'admin_system' : (r.sender_id === user.id ? r.recipient_id : r.sender_id)
          const otherRole = isSystem ? 'admin' : (r.sender_id === user.id ? r.recipient_role : r.sender_role)
          const key = `${otherRole}_${otherId}`
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(r)
        })

        // Build threads list
        const newThreads: Thread[] = Object.keys(grouped).map((key) => {
          const msgs = grouped[key]
          const last = msgs[0]
          const other = last.sender_id === user.id ? last.recipient : last.sender
          const type: Thread['type'] = last.sender_role === 'vendor' || last.recipient_role === 'vendor'
            ? 'vendor'
            : last.sender_role === 'admin' || last.recipient_role === 'admin' || last.sender_role === 'system'
            ? 'admin'
            : 'inquiry'

          return {
            id: key,
            title: other?.full_name || other?.business_name || type,
            type,
            lastMessageAt: last.created_at,
            unread: msgs.filter((m: any) => m.status === 'unread' && m.recipient_id === user.id).length
          }
        }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

        const newMessages: Record<string, Message[]> = {}
        Object.entries(grouped).forEach(([key, msgs]) => {
          // Sort messages ascending (oldest first) for WhatsApp-style display
          const sortedMsgs = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          newMessages[key] = sortedMsgs.map((m) => ({ 
            id: m.id, 
            threadId: key, 
            senderId: m.sender_id,
            author: m.sender?.full_name || m.sender_role, 
            body: m.message, 
            createdAt: m.created_at,
            status: m.status === 'read' ? 'read' : 'delivered'
          }))
        })

        setThreads(newThreads)
        setMessages(newMessages)
        setActiveThreadId((prev) => prev || (newThreads[0]?.id ?? null))
      } catch (err) {
        console.error('Failed to load tourist messages', err)
      }
    }

    load()
  }, [user])

  const activeMessages = useMemo(() => (activeThreadId ? messages[activeThreadId] || [] : []), [activeThreadId, messages])

  const handleSendMessage = async () => {
    if (!activeThreadId || !compose.trim() || !user?.id || isSending) return

    setIsSending(true)
    setSendMessageError(null)
    const [role, otherId] = activeThreadId.split('_')
    const recipientRole = role
    const recipientId = otherId
    const messageText = compose.trim()
    setCompose('') // Clear immediately for better UX

    try {
      const res = await sendMessage({
        sender_id: user.id,
        sender_role: 'tourist',
        recipient_id: recipientId,
        recipient_role: recipientRole,
        subject: '',
        message: messageText,
      })

      setMessages((prev) => ({
        ...prev,
        [activeThreadId]: [...(prev[activeThreadId] || []), { 
          id: res?.id || `m_${Date.now()}`, 
          threadId: activeThreadId, 
          senderId: user.id,
          author: user.email || 'you', 
          body: messageText, 
          createdAt: new Date().toISOString(),
          status: 'sent'
        }]
      }))
    } catch (err) {
      console.error('Failed to send message', err)
      setSendMessageError((err as Error)?.message || 'Failed to send message. Please try again.')
      setCompose(messageText) // Restore message on error
    } finally {
      setIsSending(false)
    }
  }

  const handleSendNewMessageToAdmin = async () => {
    if (!newMessageToAdmin.trim() || !user?.id) return

    setSendingNewMessage(true)
    setSendMessageError(null)

    try {
      const adminId = await getAdminProfileId()
      if (!adminId) {
        setSendMessageError('Unable to contact support at this time. Please try again later.')
        return
      }

      const res = await sendMessage({
        sender_id: user.id,
        sender_role: 'tourist',
        recipient_id: adminId,
        recipient_role: 'admin',
        subject: 'Support Request',
        message: newMessageToAdmin.trim(),
      })

      // Create or update the admin thread
      const threadKey = `admin_${adminId}`
      setThreads((prev) => {
        const existingThread = prev.find((t) => t.id === threadKey)
        if (existingThread) {
          // Update existing thread
          return prev.map((t) =>
            t.id === threadKey
              ? { ...t, lastMessageAt: new Date().toISOString() }
              : t
          ).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        } else {
          // Add new thread
          return [
            {
              id: threadKey,
              title: 'Support Team',
              type: 'admin' as const,
              lastMessageAt: new Date().toISOString(),
              unread: 0
            },
            ...prev
          ]
        }
      })

      setMessages((prev) => ({
        ...prev,
        [threadKey]: [...(prev[threadKey] || []), {
          id: res?.id || `m_${Date.now()}`,
          threadId: threadKey,
          senderId: user.id,
          author: user.email || 'you',
          body: newMessageToAdmin.trim(),
          createdAt: new Date().toISOString(),
          status: 'sent'
        }]
      }))

      setNewMessageToAdmin('')
      setShowNewMessageModal(false)
      setActiveThreadId(threadKey)
    } catch (err) {
      console.error('Failed to send message to admin', err)
      setSendMessageError((err as Error)?.message || 'Failed to send message. Please try again.')
    } finally {
      setSendingNewMessage(false)
    }
  }

  return (
    <div className="h-[calc(100dvh-4rem)] md:h-auto md:min-h-screen bg-gray-50 overflow-hidden md:overflow-visible">
      <div className="h-full md:h-auto max-w-6xl mx-auto px-4 py-2 md:py-8 grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        {/* Threads - hidden on mobile when chat is open */}
        <aside className={`${activeThreadId ? 'hidden md:block' : 'block'} md:col-span-1 bg-white rounded-lg shadow-sm p-3 overflow-y-auto`} style={{ maxHeight: 'calc(100dvh - 6rem)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">{t('messages')}</h2>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
              title="Contact Support"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {threads.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No messages yet</p>
                <button
                  onClick={() => setShowNewMessageModal(true)}
                  className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Contact Support
                </button>
              </div>
            )}
            {threads.map((th) => (
              <button
                key={th.id}
                onClick={() => setActiveThreadId(th.id)}
                className={`w-full text-left p-2 rounded-md flex items-center justify-between transition-colors ${
                  activeThreadId === th.id ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{th.title}</div>
                  <div className="text-xs text-gray-500">{th.type} • {formatDistanceToNow(new Date(th.lastMessageAt), { addSuffix: true })}</div>
                </div>
                {th.unread > 0 && <div className="bg-emerald-600 text-white text-xs font-semibold px-2 py-0.5 rounded-md">{th.unread}</div>}
              </button>
            ))}
          </div>
        </aside>

        {/* Messages + composer - WhatsApp Style */}
        <main className={`${!activeThreadId ? 'hidden md:flex' : 'flex'} md:col-span-2 bg-white rounded-lg shadow-sm flex-col overflow-hidden h-[calc(100dvh-6rem)] md:h-auto`} style={{ minHeight: 'min(70vh, 500px)', maxHeight: 'calc(100dvh - 6rem)' }}>
          {!activeThreadId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#f0f2f5]">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] border-b border-gray-200">
                <button 
                  onClick={() => setActiveThreadId(null)}
                  className="md:hidden p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
                  {threads.find((t) => t.id === activeThreadId)?.title?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">{threads.find((t) => t.id === activeThreadId)?.title}</h3>
                  <div className="text-xs text-gray-500">{threads.find((t) => t.id === activeThreadId)?.type}</div>
                </div>
              </div>

              {/* Messages Area - WhatsApp style background */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-3" 
                style={{ 
                  backgroundColor: '#e5ddd5',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              >
                <div className="space-y-1 flex flex-col">
                  {activeMessages.map((m, index) => {
                    const isMe = m.senderId === user?.id
                    const showAvatar = index === 0 || activeMessages[index - 1]?.senderId !== m.senderId
                    const isLastInGroup = index === activeMessages.length - 1 || activeMessages[index + 1]?.senderId !== m.senderId
                    
                    return (
                      <div 
                        key={m.id} 
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-2' : 'mt-0.5'}`}
                      >
                        <div 
                          className={`relative max-w-[75%] px-3 py-2 ${
                            isMe 
                              ? 'bg-[#dcf8c6] rounded-lg rounded-tr-none' 
                              : 'bg-white rounded-lg rounded-tl-none'
                          } shadow-sm`}
                        >
                          {/* Message tail */}
                          {isLastInGroup && (
                            <div 
                              className={`absolute top-0 w-3 h-3 ${
                                isMe 
                                  ? '-right-1.5 bg-[#dcf8c6]' 
                                  : '-left-1.5 bg-white'
                              }`}
                              style={{
                                clipPath: isMe 
                                  ? 'polygon(0 0, 100% 0, 0 100%)' 
                                  : 'polygon(100% 0, 0 0, 100% 100%)'
                              }}
                            />
                          )}
                          
                          {/* Sender name for received messages */}
                          {!isMe && showAvatar && (
                            <div className="text-xs font-medium text-emerald-600 mb-1">
                              {m.author}
                            </div>
                          )}
                          
                          {/* Message body */}
                          <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{m.body}</p>
                          
                          {/* Time and status */}
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] text-gray-500">
                              {formatMessageTime(m.createdAt)}
                            </span>
                            {isMe && (
                              <span className={`${m.status === 'read' ? 'text-blue-500' : 'text-gray-500'}`}>
                                {m.status === 'sent' ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCheck className="w-3.5 h-3.5" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input - WhatsApp Style */}
              <div className="px-4 py-3 bg-[#f0f2f5] border-t border-gray-200">
                {sendMessageError && (
                  <p className="text-xs text-red-600 mb-2 px-2">{sendMessageError}</p>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-white rounded-3xl px-4 py-2 flex items-center">
                    <textarea 
                      value={compose} 
                      onChange={(e) => setCompose(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Type a message" 
                      className="flex-1 resize-none text-sm outline-none max-h-24 bg-transparent"
                      rows={1}
                      style={{ minHeight: '24px' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height = Math.min(target.scrollHeight, 96) + 'px'
                      }}
                    />
                  </div>
                  <button 
                    onClick={handleSendMessage}
                    disabled={!compose.trim() || isSending}
                    className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Right column: details / quick actions */}
        <aside className="hidden md:block md:col-span-1 bg-white rounded-lg shadow-sm p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Details</h4>
          <p className="text-xs text-gray-600">Select a thread to see more actions, attachments and booking context.</p>
          <div className="mt-4 space-y-2">
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="text-sm text-emerald-600 hover:underline block"
            >
              Contact support
            </button>
            <Link to="/bookings" className="text-sm text-gray-700 hover:underline block">View bookings</Link>
          </div>
        </aside>
      </div>

      {/* New Message to Support Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Contact Support</h3>
                <button
                  onClick={() => {
                    setShowNewMessageModal(false)
                    setNewMessageToAdmin('')
                    setSendMessageError(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Send a message to our support team</p>
            </div>
            <div className="p-4">
              <textarea
                value={newMessageToAdmin}
                onChange={(e) => setNewMessageToAdmin(e.target.value)}
                placeholder="Describe your issue or question..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                rows={5}
              />
              {sendMessageError && (
                <p className="text-xs text-red-600 mt-2">{sendMessageError}</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewMessageModal(false)
                  setNewMessageToAdmin('')
                  setSendMessageError(null)
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNewMessageToAdmin}
                disabled={!newMessageToAdmin.trim() || sendingNewMessage}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {sendingNewMessage ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
