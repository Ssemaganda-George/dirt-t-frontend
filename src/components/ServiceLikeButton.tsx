import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { likeService, unlikeService, hasVisitorLikedService } from '../lib/database'

interface ServiceLikeButtonProps {
  serviceId: string
  visitorSessionId?: string
  userId?: string
  ipAddress?: string
  onLikeChange?: (isLiked: boolean, count: number) => void
  initialLikeCount?: number
}

export default function ServiceLikeButton({
  serviceId,
  visitorSessionId,
  userId,
  ipAddress,
  onLikeChange,
  initialLikeCount = 0,
}: ServiceLikeButtonProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user has already liked this service
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!visitorSessionId || !serviceId) return

      try {
        const liked = await hasVisitorLikedService(serviceId, visitorSessionId)
        setIsLiked(liked)
      } catch (err) {
        console.error('Error checking if service is liked:', err)
      }
    }

    checkIfLiked()
  }, [serviceId, visitorSessionId])

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!visitorSessionId) {
      setError('Please refresh the page to like this service')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (isLiked) {
        // Unlike
        await unlikeService(serviceId, visitorSessionId)
        setIsLiked(false)
        setLikeCount(Math.max(0, likeCount - 1))
        onLikeChange?.(false, Math.max(0, likeCount - 1))
      } else {
        // Like
        await likeService(serviceId, visitorSessionId, {
          userId,
          ipAddress,
        })
        setIsLiked(true)
        setLikeCount(likeCount + 1)
        onLikeChange?.(true, likeCount + 1)
      }
    } catch (err) {
      console.error('Error toggling like:', err)
      setError(err instanceof Error ? err.message : 'Failed to update like')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleLike}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
          isLiked
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={error || undefined}
      >
        <Heart
          className={`w-5 h-5 transition-all ${isLiked ? 'fill-current' : ''}`}
        />
        <span className="font-medium">{likeCount}</span>
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
