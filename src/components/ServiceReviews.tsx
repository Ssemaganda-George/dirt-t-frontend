import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { createServiceReview, getServiceReviews } from '../lib/database'
import type { ServiceReview } from '../lib/database'

interface ServiceReviewsProps {
  serviceId: string
  vendorName: string
  onReviewSubmitted?: () => void
  visitorSessionId?: string
  userId?: string
  ipAddress?: string
}

export default function ServiceReviews({
  serviceId,
  vendorName,
  onReviewSubmitted,
  visitorSessionId,
  userId,
  ipAddress,
}: ServiceReviewsProps) {
  const [reviews, setReviews] = useState<ServiceReview[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    visitorName: '',
    visitorEmail: '',
    rating: 5,
    comment: '',
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Validation
    if (!formData.visitorName.trim()) {
      setValidationError('Please enter your name')
      return
    }
    if (!formData.rating) {
      setValidationError('Please select a rating')
      return
    }
    if (!formData.comment.trim()) {
      setValidationError('Please enter a comment')
      return
    }

    try {
      setLoading(true)
      await createServiceReview(serviceId, {
        visitorSessionId,
        userId,
        ipAddress,
        visitorName: formData.visitorName,
        visitorEmail: formData.visitorEmail || undefined,
        rating: formData.rating,
        comment: formData.comment,
        isVerifiedBooking: false,
      })

      setSubmitSuccess(true)
      setFormData({
        visitorName: '',
        visitorEmail: '',
        rating: 5,
        comment: '',
      })
      setShowForm(false)

      // Reset success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000)

      // Refresh reviews
      const updatedReviews = await getServiceReviews(serviceId)
      setReviews(updatedReviews)

      onReviewSubmitted?.()
    } catch (error) {
      console.error('Error submitting review:', error)
      setValidationError(
        error instanceof Error ? error.message : 'Failed to submit review'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
        <p className="text-gray-600 mt-1">Share your experience with {vendorName}</p>
      </div>

      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            Thank you for your review! It will be visible after admin approval.
          </p>
        </div>
      )}

      {/* Review Form Toggle */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showForm && (
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Share Your Experience</h3>

          {validationError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800">{validationError}</p>
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating })}
                    className={`p-2 rounded-lg transition-colors ${
                      formData.rating >= rating
                        ? 'bg-yellow-100'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        formData.rating >= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.visitorName}
                onChange={(e) =>
                  setFormData({ ...formData, visitorName: e.target.value })
                }
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                value={formData.visitorEmail}
                onChange={(e) =>
                  setFormData({ ...formData, visitorEmail: e.target.value })
                }
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Your Review <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
                placeholder="Share your experience..."
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No approved reviews yet. Be the first to review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </div>
    </div>
  )
}

interface ReviewCardProps {
  review: ServiceReview
}

function ReviewCard({ review }: ReviewCardProps) {
  const [isHelpful, setIsHelpful] = useState(false)
  const [isUnhelpful, setIsUnhelpful] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < review.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="font-semibold text-gray-900">{review.visitor_name}</p>
          <p className="text-sm text-gray-500">
            {new Date(review.created_at).toLocaleDateString()}
          </p>
        </div>
        {review.is_verified_booking && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            Verified
          </span>
        )}
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-700 mb-4">{review.comment}</p>
      )}

      {/* Helpful Actions */}
      <div className="flex gap-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => setIsHelpful(!isHelpful)}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            isHelpful
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          <span className="text-sm">Helpful ({review.helpful_count})</span>
        </button>
        <button
          onClick={() => setIsUnhelpful(!isUnhelpful)}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            isUnhelpful
              ? 'bg-gray-200 text-gray-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          <span className="text-sm">Not helpful ({review.unhelpful_count})</span>
        </button>
      </div>
    </div>
  )
}
