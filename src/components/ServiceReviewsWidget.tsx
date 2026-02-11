import { useEffect, useState } from 'react'
import { Heart, MessageSquare, Star } from 'lucide-react'
import { useVisitorTracking } from '../hooks/useVisitorTracking'
import type { ServiceReview } from '../lib/database'

interface ServiceReviewsWidgetProps {
  serviceId: string
  onReviewSubmit?: (review: ServiceReview) => void
}

export function ServiceReviewsWidget({ serviceId, onReviewSubmit }: ServiceReviewsWidgetProps) {
  const { 
    likeService, 
    unlikeService, 
    isServiceLiked, 
    submitReview, 
    fetchLikesCount,
    fetchServiceReviews 
  } = useVisitorTracking()

  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [reviews, setReviews] = useState<ServiceReview[]>([])
  const [isLoadingLikes, setIsLoadingLikes] = useState(true)
  const [isLoadingReviews, setIsLoadingReviews] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [formData, setFormData] = useState({
    visitorName: '',
    visitorEmail: '',
    rating: 5,
    comment: '',
  })

  // Load likes status and count
  useEffect(() => {
    const loadLikes = async () => {
      try {
        setIsLoadingLikes(true)
        const count = await fetchLikesCount(serviceId)
        setLikesCount(count)

        const liked = await isServiceLiked(serviceId)
        setIsLiked(liked)
      } catch (error) {
        console.error('Error loading likes:', error)
      } finally {
        setIsLoadingLikes(false)
      }
    }

    loadLikes()
  }, [serviceId, fetchLikesCount, isServiceLiked])

  // Load reviews
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setIsLoadingReviews(true)
        const reviewsData = await fetchServiceReviews(serviceId, 10)
        setReviews(reviewsData)
      } catch (error) {
        console.error('Error loading reviews:', error)
      } finally {
        setIsLoadingReviews(false)
      }
    }

    loadReviews()
  }, [serviceId, fetchServiceReviews])

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isLiked) {
      const success = await unlikeService(serviceId)
      if (success) {
        setIsLiked(false)
        setLikesCount(prev => Math.max(0, prev - 1))
      }
    } else {
      const success = await likeService(serviceId)
      if (success) {
        setIsLiked(true)
        setLikesCount(prev => prev + 1)
      }
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.visitorName.trim()) {
      alert('Please enter your name')
      return
    }

    if (formData.rating < 1 || formData.rating > 5) {
      alert('Please select a rating between 1 and 5')
      return
    }

    const result = await submitReview(serviceId, {
      visitorName: formData.visitorName,
      visitorEmail: formData.visitorEmail || undefined,
      rating: formData.rating,
      comment: formData.comment || undefined,
    })

    if (result.success) {
      setFormData({
        visitorName: '',
        visitorEmail: '',
        rating: 5,
        comment: '',
      })
      setShowReviewForm(false)
      alert('Review submitted! It will appear after moderation.')
      
      // Reload reviews
      const reviewsData = await fetchServiceReviews(serviceId, 10)
      setReviews(reviewsData)
      
      if (onReviewSubmit && result.data) {
        onReviewSubmit(result.data)
      }
    } else {
      alert('Error submitting review: ' + result.error)
    }
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      {/* Like Section */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <button
          onClick={handleLike}
          disabled={isLoadingLikes}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isLiked
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="font-medium">{likesCount}</span>
        </button>
        <span className="text-sm text-gray-600">
          {likesCount === 1 ? 'person likes this' : 'people like this'}
        </span>
      </div>

      {/* Reviews Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare size={20} />
              Reviews
            </h3>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.round(Number(averageRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{averageRating}</span>
                <span className="text-sm text-gray-600">({reviews.length} reviews)</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Write Review
          </button>
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={formData.visitorName}
                onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={formData.visitorEmail}
                onChange={(e) => setFormData({ ...formData, visitorEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rating *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: num })}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      size={28}
                      className={num <= formData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment (Optional)
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Share your experience..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit Review
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        {isLoadingReviews ? (
          <div className="text-center py-8 text-gray-500">Loading reviews...</div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{review.visitor_name}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm mb-3">{review.comment}</p>
                )}
                {review.helpful_count > 0 && (
                  <div className="text-xs text-gray-500">
                    {review.helpful_count} people found this helpful
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No reviews yet. Be the first to review!
          </div>
        )}
      </div>
    </div>
  )
}
