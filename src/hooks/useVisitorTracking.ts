import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
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

/**
 * Hook to manage visitor session and track activity (likes, reviews, views)
 */
export function useVisitorTracking() {
  const { user } = useAuth()
  const [visitorSession, setVisitorSession] = useState<VisitorSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize visitor session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get visitor's IP address
        const ipResponse = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipResponse.json()
        const ipAddress = ipData.ip

        // Get browser info
        const userAgent = navigator.userAgent
        const deviceType = getDeviceType()
        const browserInfo = getBrowserInfo()

        // Note: Geolocation will be fetched server-side in the RPC function
        // to avoid CORS issues with ipapi.co

        // Get or create visitor session
        const session = await getOrCreateVisitorSession(ipAddress, {
          userId: user?.id,
          deviceType,
          browserInfo,
          userAgent,
        })

        setVisitorSession(session)
      } catch (err) {
        console.error('Error initializing visitor session:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize visitor session')
      } finally {
        setLoading(false)
      }
    }

    initializeSession()
  }, [user?.id])

  // Function to log service view
  const trackServiceView = useCallback(
    async (serviceId: string, referrer?: string) => {
      if (!visitorSession) return

      try {
        await logServiceView(serviceId, visitorSession.id, {
          userId: user?.id,
          ipAddress: visitorSession.ip_address,
          referrer,
        })
      } catch (err) {
        console.error('Error tracking service view:', err)
      }
    },
    [visitorSession, user?.id]
  )

  // Function to like a service
  const likeService = useCallback(
    async (serviceId: string) => {
      if (!visitorSession) {
        setError('No visitor session available')
        return false
      }

      try {
        await recordServiceLike(serviceId, visitorSession.id, {
          userId: user?.id,
          ipAddress: visitorSession.ip_address,
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

  // Function to unlike a service
  const unlikeService = useCallback(
    async (serviceId: string) => {
      if (!visitorSession) {
        setError('No visitor session available')
        return false
      }

      try {
        await removeServiceLike(serviceId, visitorSession.id)
        return true
      } catch (err) {
        console.error('Error unliking service:', err)
        setError(err instanceof Error ? err.message : 'Failed to unlike service')
        return false
      }
    },
    [visitorSession]
  )

  // Function to check if service is liked
  const isServiceLiked = useCallback(
    async (serviceId: string): Promise<boolean> => {
      if (!visitorSession) return false

      try {
        return await checkServiceLiked(serviceId, visitorSession.id)
      } catch (err) {
        console.error('Error checking if service is liked:', err)
        return false
      }
    },
    [visitorSession]
  )

  // Function to submit a review
  const submitReview = useCallback(
    async (serviceId: string, review: ServiceReviewInput) => {
      if (!visitorSession) {
        setError('No visitor session available')
        return { success: false, error: 'No visitor session' }
      }

      try {
        const data = await submitServiceReview(serviceId, visitorSession.id, {
          ...review,
          userId: user?.id,
          ipAddress: visitorSession.ip_address,
        })
        return { success: true, data }
      } catch (err) {
        console.error('Error submitting review:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Failed to submit review' }
      }
    },
    [visitorSession, user?.id]
  )

  // Function to get service reviews
  const fetchServiceReviews = useCallback(
    async (serviceId: string, limit?: number) => {
      try {
        return await getServiceReviews(serviceId, {
          limit: limit || 10,
        })
      } catch (err) {
        console.error('Error fetching reviews:', err)
        return []
      }
    },
    []
  )

  // Function to get likes count
  const fetchLikesCount = useCallback(
    async (serviceId: string) => {
      try {
        const likes = await getServiceLikes(serviceId)
        return likes.length
      } catch (err) {
        console.error('Error fetching likes count:', err)
        return 0
      }
    },
    []
  )

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

/**
 * Detect device type from user agent
 */
function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    return /ipad/i.test(ua) ? 'tablet' : 'mobile'
  }
  return 'desktop'
}

/**
 * Get browser info from user agent
 */
function getBrowserInfo(): string {
  const ua = navigator.userAgent
  
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edge')) return 'Edge'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  
  return 'Unknown'
}
