import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Star, CheckCircle, AlertCircle, ArrowLeft, MapPin, Clock, Shield } from 'lucide-react'
import { validateReviewToken, submitReviewWithToken } from '../lib/database'
import { getKpisForCategory, calculateOverallFromKpis, getKpiIcon } from '../lib/reviewKpis'
import type { KpiRatings } from '../lib/reviewKpis'

interface TokenValidation {
  valid: boolean
  tokenData?: any
  booking?: any
  service?: any
}

export default function ReviewFromEmail() {
  const { token } = useParams<{ token: string }>()
  const [validation, setValidation] = useState<TokenValidation | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [kpiRatings, setKpiRatings] = useState<KpiRatings>({})
  const [kpiHoverRatings, setKpiHoverRatings] = useState<Record<string, number>>({})

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setError('No review token provided')
        setLoading(false)
        return
      }

      try {
        const result = await validateReviewToken(token)
        if (!result || !result.valid) {
          if (result?.tokenData?.is_used) {
            setError('You have already submitted a review for this booking. Thank you!')
          } else {
            setError('This review link has expired or is invalid.')
          }
        } else {
          setValidation(result)
          setVisitorName(result.tokenData?.guest_name || '')
        }
      } catch (err) {
        setError('Failed to validate review link. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    validate()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const categoryKpis = getKpisForCategory(validation?.service?.service_categories?.name || '')
    
    if (categoryKpis.length > 0) {
      // Validate all KPIs rated
      const missingKpis = categoryKpis.filter(kpi => !kpiRatings[kpi.key])
      if (missingKpis.length > 0) {
        setError(`Please rate all aspects: ${missingKpis.map(k => k.label).join(', ')}`)
        return
      }
    } else if (rating === 0) {
      setError('Please select a rating')
      return
    }
    if (!comment.trim()) {
      setError('Please share your experience')
      return
    }

    const finalRating = categoryKpis.length > 0
      ? Math.round(calculateOverallFromKpis(kpiRatings) * 10) / 10
      : rating

    setSubmitting(true)
    setError(null)

    try {
      await submitReviewWithToken(token!, {
        rating: Math.round(finalRating),
        comment: comment.trim(),
        visitorName: visitorName.trim() || undefined,
        kpiRatings: categoryKpis.length > 0 ? kpiRatings : undefined,
      })
      setRating(Math.round(finalRating))
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Validating your review link...</p>
        </div>
      </div>
    )
  }

  // Success state after submission
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Review Submitted</h1>
          <p className="text-gray-600 text-sm mb-1">
            Your review has been submitted successfully.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            As a verified booking, your review is now live and will help other travelers.
          </p>
          <div className="flex items-center justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
            <span className="ml-2 text-sm font-medium text-gray-700">{ratingLabels[rating]}</span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Explore More Services
          </Link>
        </div>
      </div>
    )
  }

  // Error or invalid token state
  if (error && !validation?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Oops!</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const service = validation?.service
  const booking = validation?.booking

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Dirt Trails</span>
          </Link>
          <div className="flex items-center gap-1.5 text-emerald-600">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">Verified Booking Review</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Service Card */}
        {service && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
            <div className="flex flex-col sm:flex-row">
              {service.images?.[0] && (
                <div className="sm:w-48 h-40 sm:h-auto flex-shrink-0">
                  <img
                    src={service.images[0]}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5 flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{service.title}</h2>
                {service.vendors?.business_name && (
                  <p className="text-sm text-gray-500 mb-2">by {service.vendors.business_name}</p>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  {service.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{service.location}</span>
                    </div>
                  )}
                  {booking?.booking_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">How was your experience?</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Hi {validation?.tokenData?.guest_name || 'there'}! We'd love to hear about your experience.<br className="hidden sm:block" /> Your feedback helps other travelers make informed decisions.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating - KPI aware */}
            {(() => {
              const categoryKpis = getKpisForCategory(validation?.service?.service_categories?.name || '')
              return categoryKpis.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 font-medium tracking-wide uppercase text-center">
                    Rate each aspect of your experience
                  </p>
                  <div className="space-y-2.5">
                    {categoryKpis.map((kpi) => {
                      const KpiIcon = getKpiIcon(kpi.key)
                      return (
                      <div key={kpi.key} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5 border border-gray-100 hover:border-gray-200 transition-colors">
                        <span className="text-sm text-gray-700 flex items-center gap-2.5 font-medium">
                          <KpiIcon className="w-4 h-4 text-gray-400" /> {kpi.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setKpiRatings(prev => ({ ...prev, [kpi.key]: star }))}
                              onMouseEnter={() => setKpiHoverRatings(prev => ({ ...prev, [kpi.key]: star }))}
                              onMouseLeave={() => setKpiHoverRatings(prev => ({ ...prev, [kpi.key]: 0 }))}
                              className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                            >
                              <Star className={`w-6 h-6 sm:w-7 sm:h-7 transition-colors ${
                                star <= (kpiHoverRatings[kpi.key] || kpiRatings[kpi.key] || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-200 hover:text-gray-300'
                              }`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      )
                    })}
                  </div>
                  {/* Overall calculated display */}
                  {Object.keys(kpiRatings).length > 0 && (
                    <div className="flex items-center justify-center gap-2.5 pt-4 border-t border-gray-100">
                      <span className="text-sm font-semibold text-gray-900">Overall:</span>
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xl font-bold text-gray-900">{calculateOverallFromKpis(kpiRatings).toFixed(1)}</span>
                      <span className="text-sm text-gray-500">
                        ({ratingLabels[Math.round(calculateOverallFromKpis(kpiRatings))] || ''})
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tap a star to rate
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${
                            star <= (hoverRating || rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {(hoverRating || rating) > 0 && (
                    <p className="mt-2 text-sm font-medium text-gray-600">
                      {ratingLabels[hoverRating || rating]}
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-gray-50/50 focus:bg-white"
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Tell us about your experience <span className="text-red-400">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you enjoy? What could be improved? Share details that would help other travelers..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition-colors bg-gray-50/50 focus:bg-white"
              />
              <p className="mt-1.5 text-xs text-gray-400">{comment.length}/500 characters</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || (rating === 0 && Object.keys(kpiRatings).length === 0)}
              className="w-full py-3.5 px-6 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-base shadow-sm hover:shadow-md"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </span>
              ) : (
                'Submit Review'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              This is a verified review from a confirmed booking. Your honest feedback is appreciated.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
