import { useEffect, useState } from 'react'
import { Star, CheckCircle, XCircle, Clock, MessageSquare, Shield, Search } from 'lucide-react'
import { getAllReviewsForAdmin, approveReview, rejectReview } from '../../lib/database'
import type { ServiceReview } from '../../lib/database'
import { useAuth } from '../../contexts/AuthContext'

type ReviewWithMeta = ServiceReview & { service_title?: string; vendor_name?: string }

export function Reviews() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReview, setSelectedReview] = useState<ReviewWithMeta | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const data = await getAllReviewsForAdmin()
      setReviews(data)
    } catch (err) {
      console.error('Error fetching reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  const handleApprove = async (reviewId: string) => {
    setActionLoading(reviewId)
    try {
      await approveReview(reviewId, user?.id)
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: 'approved' as const, approved_at: new Date().toISOString() } : r))
    } catch (err) {
      console.error('Error approving review:', err)
      alert('Failed to approve review')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (reviewId: string) => {
    setActionLoading(reviewId)
    try {
      await rejectReview(reviewId, rejectionReason || undefined)
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status: 'rejected' as const, rejection_reason: rejectionReason } : r))
      setShowRejectModal(false)
      setRejectionReason('')
      setSelectedReview(null)
    } catch (err) {
      console.error('Error rejecting review:', err)
      alert('Failed to reject review')
    } finally {
      setActionLoading(null)
    }
  }

  const openRejectModal = (review: ReviewWithMeta) => {
    setSelectedReview(review)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const filteredReviews = reviews.filter(r => {
    const statusMatch = statusFilter === 'all' || r.status === statusFilter
    const searchMatch = !searchQuery || 
      (r.visitor_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.comment?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.service_title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    return statusMatch && searchMatch
  })

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    verified: reviews.filter(r => r.is_verified_booking).length,
    avgRating: reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) 
      : '0',
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
        <p className="text-gray-600 mt-1">Moderate and manage customer reviews across all services</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <p className="text-xs font-medium text-gray-500">Total</p>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <p className="text-xs font-medium text-yellow-600">Pending</p>
          </div>
          <p className="text-2xl font-semibold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-xs font-medium text-green-600">Approved</p>
          </div>
          <p className="text-2xl font-semibold text-green-700">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-xs font-medium text-red-600">Rejected</p>
          </div>
          <p className="text-2xl font-semibold text-red-700">{stats.rejected}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-medium text-blue-600">Verified</p>
          </div>
          <p className="text-2xl font-semibold text-blue-700">{stats.verified}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-medium text-amber-600">Avg Rating</p>
          </div>
          <p className="text-2xl font-semibold text-amber-700">{stats.avgRating}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews by name, comment, service..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 text-sm rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : status === 'approved' ? 'bg-green-100 text-green-800 border border-green-300'
                    : status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'pending' && stats.pending > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-600 text-white text-xs rounded-full">{stats.pending}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No reviews found matching your filters.</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-lg border p-5 transition-all hover:shadow-md ${
                review.status === 'pending' ? 'border-l-4 border-l-yellow-400' :
                review.status === 'rejected' ? 'border-l-4 border-l-red-400 opacity-75' :
                'border-l-4 border-l-green-400'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Review Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{review.visitor_name || 'Anonymous'}</h3>
                        {review.is_verified_booking && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Verified
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          review.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          review.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {review.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span>·</span>
                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        {review.visitor_email && (
                          <>
                            <span>·</span>
                            <span>{review.visitor_email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Service Info */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500">
                      Service: <span className="font-medium text-gray-700">{review.service_title}</span>
                      {review.vendor_name && <> · Vendor: <span className="font-medium text-gray-700">{review.vendor_name}</span></>}
                    </p>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                  )}

                  {/* Rejection reason */}
                  {review.status === 'rejected' && review.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                      <span className="font-medium">Rejection reason:</span> {review.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {review.status === 'pending' && (
                  <div className="flex lg:flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(review.id)}
                      disabled={actionLoading === review.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(review)}
                      disabled={actionLoading === review.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
                {review.status === 'approved' && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => openRejectModal(review)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 text-xs rounded-lg hover:bg-red-50 border border-red-200 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                )}
                {review.status === 'rejected' && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleApprove(review.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-green-600 text-xs rounded-lg hover:bg-green-50 border border-green-200 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Review</h3>
            <p className="text-sm text-gray-600 mb-4">
              Review by <span className="font-medium">{selectedReview.visitor_name}</span> on <span className="font-medium">{selectedReview.service_title}</span>
            </p>
            
            {/* Show the review */}
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < selectedReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              {selectedReview.comment && (
                <p className="text-sm text-gray-700">{selectedReview.comment}</p>
              )}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for rejection (optional)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Inappropriate content, spam, irrelevant..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleReject(selectedReview.id)}
                disabled={actionLoading === selectedReview.id}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {actionLoading === selectedReview.id ? 'Rejecting...' : 'Reject Review'}
              </button>
              <button
                onClick={() => { setShowRejectModal(false); setSelectedReview(null) }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reviews
