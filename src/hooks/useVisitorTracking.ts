import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  getOrCreateVisitorSession,
  logServiceView,
  recordServiceLike,
  removeServiceLike,
  checkServiceLiked,
  submitServiceReview,
  getServiceReviews,
  getServiceLikes,
} from '../lib/database'
import type { VisitorSession } from '../lib/database'

interface ServiceReviewInput {
  visitorName: string
  visitorEmail?: string
  rating: number
  comment?: string
}

let sharedSession: VisitorSession | null = null
let sharedSessionPromise: Promise<VisitorSession | null> | null = null

function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    return /ipad/i.test(ua) ? 'tablet' : 'mobile'
  }
  return 'desktop'
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edge')) return 'Edge'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  return 'Unknown'
}

async function resolveVisitorSession(userId?: string): Promise<VisitorSession | null> {
  if (sharedSession) return sharedSession
  if (sharedSessionPromise) return sharedSessionPromise

  sharedSessionPromise = (async () => {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json')
      const ipData = await ipResponse.json()
      const ipAddress = ipData.ip

      const { data, error } = await supabase.functions.invoke('visitor-session', {
        body: {
          ipAddress,
          userId: userId || null,
          deviceType: getDeviceType(),
          browserInfo: getBrowserInfo(),
          userAgent: navigator.userAgent,
        },
      })

      if (!error && data?.session) {
        sharedSession = data.session as VisitorSession
        return sharedSession
      }

      // Fallback when edge function is unavailable (local dev / not yet deployed)
      const session = await getOrCreateVisitorSession(ipAddress, {
        userId: userId || undefined,
        deviceType: getDeviceType(),
        browserInfo: getBrowserInfo(),
        userAgent: navigator.userAgent,
      })
      sharedSession = session
      return sharedSession
    } catch (err) {
      console.error('Error initializing visitor session:', err)
      return null
    } finally {
      sharedSessionPromise = null
    }
  })()

  return sharedSessionPromise
}

/**
 * Hook to manage visitor session and track activity (likes, reviews, views)
 */
export function useVisitorTracking() {
  const { user } = useAuth()
  const [visitorSession, setVisitorSession] = useState<VisitorSession | null>(sharedSession)
  const [loading, setLoading] = useState(!sharedSession)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const initializeSession = async () => {
      try {
        setLoading(true)
        setError(null)
        const session = await resolveVisitorSession(user?.id)
        if (!cancelled) setVisitorSession(session)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize visitor session')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initializeSession()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const trackServiceView = useCallback(
    async (serviceId: string, referrer?: string) => {
      const session = visitorSession || sharedSession || (await resolveVisitorSession(user?.id))
      if (!session) return

      try {
        await logServiceView(serviceId, session.id, {
          userId: user?.id,
          ipAddress: session.ip_address,
          referrer,
        })
      } catch (err) {
        console.error('Error tracking service view:', err)
      }
    },
    [visitorSession, user?.id]
  )

  const likeService = useCallback(
    async (serviceId: string) => {
      const session = visitorSession || sharedSession
      if (!session) {
        setError('No visitor session available')
        return false
      }

      try {
        await recordServiceLike(serviceId, session.id, {
          userId: user?.id,
          ipAddress: session.ip_address,
        })
        return true
      } catch (err) {
        console.error('Error liking service:', err)
        setError(err instanceof Error ? err.message : 'Failed to like service')
        return false
      }
    },
    [visitorSession, user?.id]
  )

  const unlikeService = useCallback(
    async (serviceId: string) => {
      const session = visitorSession || sharedSession
      if (!session) {
        setError('No visitor session available')
        return false
      }

      try {
        await removeServiceLike(serviceId, session.id)
        return true
      } catch (err) {
        console.error('Error unliking service:', err)
        setError(err instanceof Error ? err.message : 'Failed to unlike service')
        return false
      }
    },
    [visitorSession]
  )

  const isServiceLiked = useCallback(
    async (serviceId: string): Promise<boolean> => {
      const session = visitorSession || sharedSession
      if (!session) return false

      try {
        return await checkServiceLiked(serviceId, session.id)
      } catch (err) {
        console.error('Error checking if service is liked:', err)
        return false
      }
    },
    [visitorSession]
  )

  const submitReview = useCallback(
    async (serviceId: string, review: ServiceReviewInput) => {
      const session = visitorSession || sharedSession
      if (!session) {
        setError('No visitor session available')
        return { success: false, error: 'No visitor session' }
      }

      try {
        const data = await submitServiceReview(serviceId, session.id, {
          ...review,
          userId: user?.id,
          ipAddress: session.ip_address,
        })
        return { success: true, data }
      } catch (err) {
        console.error('Error submitting review:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Failed to submit review' }
      }
    },
    [visitorSession, user?.id]
  )

  const fetchServiceReviews = useCallback(async (serviceId: string, limit?: number) => {
    try {
      return await getServiceReviews(serviceId, { limit: limit || 10 })
    } catch (err) {
      console.error('Error fetching reviews:', err)
      return []
    }
  }, [])

  const fetchLikesCount = useCallback(async (serviceId: string) => {
    try {
      const likes = await getServiceLikes(serviceId)
      return likes.length
    } catch (err) {
      console.error('Error fetching likes count:', err)
      return 0
    }
  }, [])

  return {
    visitorSession,
    loading,
    error,
    trackServiceView,
    likeService,
    unlikeService,
    isServiceLiked,
    submitReview,
    fetchServiceReviews,
    fetchLikesCount,
  }
}
