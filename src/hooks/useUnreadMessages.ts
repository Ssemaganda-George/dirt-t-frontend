import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTouristMessages, getVendorMessages, getAdminMessages } from '../lib/database'
import { supabase } from '../lib/supabaseClient'

export default function useUnreadMessages() {
  const { user, profile, vendor } = useAuth()
  const [unreadCount, setUnreadCount] = useState<number>(0)

  const fetchUnread = useCallback(async () => {
    try {
      if (profile?.role === 'vendor' || vendor) {
        const id = vendor?.id || profile?.id || ''
        if (!id) return setUnreadCount(0)
        const rows = await getVendorMessages(id, 'unread')
        setUnreadCount(rows.length)
      } else if (profile?.role === 'admin') {
        const rows = await getAdminMessages('unread')
        setUnreadCount(rows.length)
      } else if (user) {
        const id = user.id
        const rows = await getTouristMessages(id, 'unread')
        setUnreadCount(rows.length)
      } else {
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('useUnreadMessages fetch error:', error)
    }
  }, [user, profile, vendor])

  useEffect(() => {
    fetchUnread()

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchUnread()
      })
      .subscribe()

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch (e) {
        //@ts-ignore
        channel?.unsubscribe && channel.unsubscribe()
      }
    }
  }, [fetchUnread])

  return { unreadCount, refresh: fetchUnread }
}
