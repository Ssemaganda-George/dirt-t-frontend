import { useEffect, useState } from 'react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { getVisitorActivityStats, getAllVendorsWithActivity } from '../../lib/database'
import {
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface DemographicData {
  ageGroup: string
  count: number
  percentage: string | number
}

interface CountryData {
  country: string
  count: number
  percentage: string | number
}

interface ReviewData {
  id: string
  serviceName: string
  rating: number
  comment: string
  visitorName: string
  date: string
  helpful: number
}

interface LikeData {
  id: string
  serviceName: string
  category: string
  totalLikes: number
  avgRating: number
}

interface VisitorStats {
  totalVisitors: number
  uniqueVisitors: number
  avgSessionDuration: number
  bounceRate: number
  topCountries: CountryData[]
  ageGroups: DemographicData[]
  genderDistribution: { male: number; female: number; other: number }
  topLikedServices: LikeData[]
  recentReviews: ReviewData[]
  reviewsThisMonth: number
  avgRating: number
}

// ============================================================================
// Components
// ============================================================================

interface StatCardProps {
  title: string
  value: string | number
  color: 'blue' | 'green' | 'purple' | 'orange'
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-l-4 border-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-l-4 border-green-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-l-4 border-purple-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-l-4 border-orange-600' }
  }

  const colorConfig = colorClasses[color] || colorClasses.blue
  const valueStr = String(value)
  let valueFontSize = 'text-2xl'
  if (valueStr.length > 20) {
    valueFontSize = 'text-sm'
  } else if (valueStr.length > 15) {
    valueFontSize = 'text-base'
  } else if (valueStr.length > 10) {
    valueFontSize = 'text-lg'
  }

  return (
    <div
      className={`text-left bg-white rounded-xl shadow-sm ${colorConfig.border} border border-gray-200 p-4 hover:shadow-lg hover:scale-105 transition-all duration-300 h-full`}
    >
      <div className="flex items-start justify-between gap-3 h-full flex-col">
        <div className="w-full">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest line-clamp-2">{title}</p>
        </div>
        <div className="w-full flex-1 flex flex-col justify-center">
          <p className={`${valueFontSize} font-bold text-gray-900 break-words line-clamp-2`}>{value}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const VisitorActivity = () => {
  const [stats, setStats] = useState<VisitorStats>({
    totalVisitors: 0,
    uniqueVisitors: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
    topCountries: [],
    ageGroups: [],
    genderDistribution: { male: 0, female: 0, other: 0 },
    topLikedServices: [],
    recentReviews: [],
    reviewsThisMonth: 0,
    avgRating: 0
  })
  const [vendorStats, setVendorStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null)

  useEffect(() => {
    fetchVisitorActivity()
  }, [])

  const fetchVisitorActivity = async () => {
    try {
      setLoading(true)
      const [platformData, vendorsData] = await Promise.all([
        getVisitorActivityStats(),
        getAllVendorsWithActivity()
      ])
      setStats(platformData)
      setVendorStats(vendorsData)
    } catch (error) {
      console.error('Error fetching visitor activity:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Visitor Activity</h1>
        <p className="mt-2 text-base text-gray-600">
          Track visitor demographics, engagement, and service preferences
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Visitors"
          value={stats.totalVisitors.toLocaleString()}
          color="blue"
        />
        <StatCard
          title="Unique Visitors"
          value={stats.uniqueVisitors.toLocaleString()}
          color="green"
        />
        <StatCard
          title="Avg Session Duration"
          value={`${stats.avgSessionDuration} min`}
          color="purple"
        />
        <StatCard
          title="Bounce Rate"
          value={`${stats.bounceRate}%`}
          color="orange"
        />
      </div>

      {/* Demographics and Likes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Top Countries</h2>
          </div>
          <div className="space-y-4">
            {stats.topCountries.map((country, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{country.country}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${country.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-bold text-gray-900">{country.count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{country.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Age Groups */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Age Distribution</h2>
          </div>
          <div className="space-y-4">
            {stats.ageGroups.map((group, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{group.ageGroup} years</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${group.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-bold text-gray-900">{group.count.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{group.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">
          Gender Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Male', count: stats.genderDistribution.male, color: 'bg-blue-100 text-blue-800' },
            { label: 'Female', count: stats.genderDistribution.female, color: 'bg-purple-100 text-purple-800' },
            { label: 'Other', count: stats.genderDistribution.other, color: 'bg-orange-100 text-orange-800' }
          ].map((gender, idx) => (
            <div key={idx} className={`p-4 rounded-lg text-center ${gender.color}`}>
              <p className="text-sm font-semibold mb-2">{gender.label}</p>
              <p className="text-3xl font-bold">{gender.count.toLocaleString()}</p>
              <p className="text-xs mt-2">
                {((gender.count / (stats.genderDistribution.male + stats.genderDistribution.female + stats.genderDistribution.other)) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Liked Services */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Top Liked Services</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Service Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Likes</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {stats.topLikedServices.map((service) => (
                <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{service.serviceName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{service.category}</td>
                  <td className="py-3 px-4 text-sm font-bold text-red-600 text-right">{service.totalLikes.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm font-bold text-yellow-600 text-right flex items-center justify-end gap-1">
                    {service.avgRating.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Recent Reviews</h2>
            <p className="text-xs text-gray-500 mt-1">{stats.reviewsThisMonth} reviews this month • Average rating: {stats.avgRating}/5</p>
          </div>
        </div>
        <div className="space-y-4">
          {stats.recentReviews.map((review) => (
            <div key={review.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{review.serviceName}</p>
                  <p className="text-xs text-gray-500 mt-1">by {review.visitorName} on {new Date(review.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`text-sm ${idx < review.rating ? 'text-yellow-600' : 'text-gray-300'}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-3">{review.comment}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {review.helpful} people found this helpful
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Vendor Activity Section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Vendor Account Activity</h2>
          <p className="mt-2 text-base text-gray-600">Monitor visitor engagement and performance metrics for individual vendor accounts</p>
        </div>

        <div className="space-y-4">
          {vendorStats && vendorStats.length > 0 ? (
            vendorStats.map((vendor: any) => (
              <div key={vendor.vendorId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedVendor(expandedVendor === vendor.vendorId ? null : vendor.vendorId)}
                  className="w-full p-6 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="text-left flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{vendor.vendorName}</h3>
                    <p className="text-sm text-gray-600 mt-1">{vendor.vendorEmail}</p>
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Visitors</p>
                        <p className="text-xl font-bold text-gray-900">{vendor.totalVisitors}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Services</p>
                        <p className="text-xl font-bold text-gray-900">{vendor.totalServices}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Bookings</p>
                        <p className="text-xl font-bold text-blue-600">{vendor.totalBookings}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Conversion</p>
                        <p className="text-xl font-bold text-green-600">{vendor.conversionRate}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {expandedVendor === vendor.vendorId ? (
                      <ChevronUp className="h-6 w-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedVendor === vendor.vendorId && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-6">
                    {/* Vendor Demographics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Countries for Vendor */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                          Top Countries
                        </h4>
                        <div className="space-y-3">
                          {vendor.topCountries && vendor.topCountries.length > 0 ? (
                            vendor.topCountries.map((country: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-700">{country.country}</p>
                                <p className="text-xs font-bold text-gray-900">{country.percentage}%</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No geographic data</p>
                          )}
                        </div>
                      </div>

                      {/* Age Distribution for Vendor */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                          Age Distribution
                        </h4>
                        <div className="space-y-3">
                          {vendor.ageGroups && vendor.ageGroups.length > 0 ? (
                            vendor.ageGroups.map((group: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-700">{group.ageGroup}</p>
                                <p className="text-xs font-bold text-gray-900">{group.percentage}%</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">No age data</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Gender Distribution */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                      <h4 className="text-sm font-bold text-gray-900 mb-4">Gender Distribution</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-2">Male</p>
                          <p className="text-2xl font-semibold text-blue-600">{vendor.genderDistribution?.male || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-2">Female</p>
                          <p className="text-2xl font-semibold text-purple-600">{vendor.genderDistribution?.female || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-2">Other</p>
                          <p className="text-2xl font-semibold text-orange-600">{vendor.genderDistribution?.other || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Top Services */}
                    {vendor.topServices && vendor.topServices.length > 0 && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                          Top Services
                        </h4>
                        <div className="space-y-2">
                          {vendor.topServices.map((service: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-gray-100 last:border-b-0">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{service.serviceName}</p>
                                <p className="text-gray-500">{service.category}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-red-600 font-bold">{service.totalLikes} likes</span>
                                <span className="text-yellow-600 font-bold">★ {service.avgRating}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Reviews */}
                    {vendor.recentReviews && vendor.recentReviews.length > 0 && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                          Recent Reviews ({vendor.reviewsThisMonth} this month)
                        </h4>
                        <div className="space-y-3">
                          {vendor.recentReviews.slice(0, 3).map((review: any, idx: number) => (
                            <div key={idx} className="text-xs p-3 bg-gray-50 rounded border border-gray-200">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="font-medium text-gray-900">{review.serviceName}</p>
                                  <p className="text-gray-500">by {review.visitorName}</p>
                                </div>
                                <div className="flex gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span
                                      key={i}
                                      className={`text-xs ${i < review.rating ? 'text-yellow-600' : 'text-gray-300'}`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-gray-700">{review.comment}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500">No vendors found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default VisitorActivity
