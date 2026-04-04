import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatDistanceToNow } from 'date-fns'
import { getTouristMessages, sendMessage } from '../lib/database'

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
  author: string
  body: string
  createdAt: string
}

export default function Messages() {
  const { user } = useAuth()
  const { t } = usePreferences()
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [compose, setCompose] = useState('')
  const [sendMessageError, setSendMessageError] = useState<string | null>(null)

  // Fetch real messages for tourist and map to threads
  useEffect(() => {
    if (!user?.id) return

    const load = async () => {
      try {
        console.debug('Messages page: SUPABASE_URL=', import.meta.env.VITE_SUPABASE_URL, 'userId=', user.id)
        console.debug('Messages page: calling getTouristMessages for user', user.id)
        const rows: any[] = await getTouristMessages(user.id)
        console.debug('Messages page: getTouristMessages returned', rows?.length)

        // Group messages by conversation partner (other profile id + role)
        const grouped: Record<string, any[]> = {}
        rows.forEach((r) => {
          const otherId = r.sender_id === user.id ? r.recipient_id : r.sender_id
          const otherRole = r.sender_id === user.id ? r.recipient_role : r.sender_role
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
            : last.sender_role === 'admin' || last.recipient_role === 'admin'
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
          newMessages[key] = (msgs as any[]).map((m) => ({ id: m.id, threadId: key, author: m.sender?.full_name || m.sender_role, body: m.message, createdAt: m.created_at }))
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
    if (!activeThreadId || !compose.trim() || !user?.id) return

    setSendMessageError(null)
    const [role, otherId] = activeThreadId.split('_')
    const recipientRole = role
    const recipientId = otherId

    try {
      const res = await sendMessage({
        sender_id: user.id,
        sender_role: 'tourist',
        recipient_id: recipientId,
        recipient_role: recipientRole,
        subject: '',
        message: compose.trim(),
      })

      setMessages((prev) => ({
        ...prev,
        [activeThreadId]: [...(prev[activeThreadId] || []), { id: res?.id || `m_${Date.now()}`, threadId: activeThreadId, author: user.email || 'you', body: compose.trim(), createdAt: new Date().toISOString() }]
      }))
      setCompose('')
    } catch (err) {
      console.error('Failed to send message', err)
      setSendMessageError((err as Error)?.message || 'Failed to send message. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Threads */}
        <aside className="md:col-span-1 bg-white rounded-lg shadow-sm p-3 overflow-y-auto" style={{ maxHeight: '80vh' }}>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('messages')}</h2>
          <div className="space-y-2">
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

        {/* Messages + composer */}
        <main className="md:col-span-2 bg-white rounded-lg shadow-sm p-4 flex flex-col" style={{ minHeight: '60vh' }}>
          {!activeThreadId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{threads.find((t) => t.id === activeThreadId)?.title}</h3>
                  <div className="text-xs text-gray-500">Conversation</div>
                </div>
                <div className="text-xs text-gray-400">{threads.find((t) => t.id === activeThreadId)?.type}</div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-3" style={{ maxHeight: '56vh' }}>
                {activeMessages.map((m) => (
                  <div key={m.id} className={`p-3 rounded-md ${m.author === (user?.email || 'you') ? 'bg-emerald-50 self-end' : 'bg-gray-50'}`}>
                    <div className="text-xs text-gray-600 mb-1">{m.author} • {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <div className="flex gap-2">
                  <input value={compose} onChange={(e) => setCompose(e.target.value)} placeholder="Write a reply..." className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                  <button onClick={handleSendMessage} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm">Send</button>
                </div>
                {sendMessageError && (
                  <p className="text-xs text-red-700 mt-2">{sendMessageError}</p>
                )}
              </div>
            </>
          )}
        </main>

        {/* Right column: details / quick actions */}
        <aside className="hidden md:block md:col-span-1 bg-white rounded-lg shadow-sm p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Details</h4>
          <p className="text-xs text-gray-600">Select a thread to see more actions, attachments and booking context.</p>
          <div className="mt-4 space-y-2">
            <Link to="/support" className="text-sm text-emerald-600 hover:underline">Contact support</Link>
            <Link to="/bookings" className="text-sm text-gray-700 hover:underline">View bookings</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
