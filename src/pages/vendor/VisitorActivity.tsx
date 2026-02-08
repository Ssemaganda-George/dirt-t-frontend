import { useAuth } from '../../contexts/AuthContext'
import { useEffect, useState } from 'react'
import { Eye, TrendingUp, Users, Star, Calendar, MapPin, BarChart3 } from 'lucide-react'
import { getVendorActivityStats } from '../../lib/database'

interface ReviewData {
  id: string
  serviceName: string
  rating: number
  comment: string
  visitorName: string
  date: string
  helpful: number
}

interface CountryData {
  country: string
  count: number
  percentage: string
}

interface DemographicData {
  ageGroup: string
  count: number
  percentage: string
}

interface LikeData {
  id: string
  serviceName: string
  category: string
  totalLikes: number
  avgRating: number
  timesChecked?: number
}

interface VendorStats {
  totalVisitors: number
  uniqueVisitors: number
  totalServices: number
  totalBookings: number
  conversionRate: number
  topCountries: CountryData[]
  ageGroups: DemographicData[]
  genderDistribution: { male: number; female: number; other: number }
  topServices: LikeData[]
  servicesChecked: LikeData[]
  visitorSessions: any[]
  recentReviews: ReviewData[]
  reviewsThisMonth: number
  avgRating: number
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange'
  trend?: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => {
  const colorClasses: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    blue: { bg: 'bg-white', text: 'text-blue-600', border: 'border-l-4 border-blue-600', iconBg: 'bg-blue-50' },
    green: { bg: 'bg-white', text: 'text-green-600', border: 'border-l-4 border-green-600', iconBg: 'bg-green-50' },
    purple: { bg: 'bg-white', text: 'text-purple-600', border: 'border-l-4 border-purple-600', iconBg: 'bg-purple-50' },
    orange: { bg: 'bg-white', text: 'text-orange-600', border: 'border-l-4 border-orange-600', iconBg: 'bg-orange-50' }
  }

  const colorConfig = colorClasses[color] || colorClasses.blue
  const valueStr = String(value)

  return (
    <div className={`${colorConfig.bg} ${colorConfig.border} rounded-lg p-6 shadow-sm border border-gray-200`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{valueStr}</p>
          {trend && <p className="mt-1 text-xs text-gray-600">{trend}</p>}
        </div>
        <div className={`${colorConfig.iconBg} ${colorConfig.text} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function VendorVisitorActivity() {
  const { profile, vendor } = useAuth()
  const vendorId = vendor?.id || profile?.id
  
  const [stats, setStats] = useState<VendorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedService, setExpandedService] = useState<string | null>(null)

  useEffect(() => {
    if (!vendorId) return
    
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getVendorActivityStats(vendorId)
        setStats(data)
      } catch (err) {
        console.error('Error fetching vendor activity:', err)
        setError('Failed to load activity data')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [vendorId])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">Activity Data Loading</p>
          <p className="text-yellow-700 text-sm mt-1">
            {error || 'Loading your visitor activity data. Some data may be unavailable at this time.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-8 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Eye className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">Visitor Activity</h1>
        </div>
        <p className="text-gray-600">
          Monitor your business performance and visitor engagement
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Visitors"
          value={stats.totalVisitors}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          trend={`${stats.uniqueVisitors} unique`}
        />
        <StatCard
          title="Service Bookings"
          value={stats.totalBookings}
          icon={<Calendar className="h-5 w-5" />}
          color="green"
          trend={`${stats.conversionRate.toFixed(1)}% conversion`}
        />
        <StatCard
          title="Total Services"
          value={stats.totalServices}
          icon={<BarChart3 className="h-5 w-5" />}
          color="purple"
          trend="Active listings"
        />
        <StatCard
          title="Avg Rating"
          value={stats.avgRating.toFixed(1)}
          icon={<Star className="h-5 w-5" />}
          color="orange"
          trend={`${stats.reviewsThisMonth} reviews this month`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Insights */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Performance Insights</h2>
              <TrendingUp className="h-5 w-5 text-gray-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <p className="text-sm text-gray-700 font-medium">Booking Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.conversionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  {stats.totalBookings} of {stats.totalVisitors} visitors booked
                </p>
              </div>

              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <p className="text-sm text-gray-700 font-medium">Unique Visitors</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.uniqueVisitors}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  {((stats.uniqueVisitors / Math.max(stats.totalVisitors, 1)) * 100).toFixed(0)}% of total visits
                </p>
              </div>

              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <p className="text-sm text-gray-700 font-medium">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.avgRating.toFixed(1)} / 5
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Based on {stats.reviewsThisMonth} reviews this month
                </p>
              </div>

              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <p className="text-sm text-gray-700 font-medium">Active Services</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalServices}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  All services are published
                </p>
              </div>
            </div>
          </div>

          {/* Top Services */}
          {stats.topServices.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Your Services</h2>
              <div className="space-y-3">
                {stats.topServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer border border-gray-200"
                    onClick={() => setExpandedService(expandedService === service.id ? null : service.id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{service.serviceName}</p>
                      <p className="text-sm text-gray-600">
                        Rating: {service.avgRating > 0 ? `${service.avgRating.toFixed(1)} / 5` : 'No ratings yet'}
                      </p>
                    </div>
                    {expandedService === service.id && (
                      <div className="text-right text-sm text-gray-600 font-medium">
                        • Expanded
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services Checked by Visitors */}
          {stats.servicesChecked && stats.servicesChecked.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Most Viewed Services</h2>
              </div>
              <div className="space-y-3">
                {stats.servicesChecked.map((service, idx) => (
                  <div key={service.id || idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{service.serviceName}</p>
                      <p className="text-sm text-gray-600">Service views & interactions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{service.timesChecked || 0}</p>
                      <p className="text-xs text-gray-500">times checked</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visitor Demographics */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Visitor Demographics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Age Groups */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Age Distribution</h3>
                {stats.ageGroups.length > 0 ? (
                  <div className="space-y-3">
                    {stats.ageGroups.map((age, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-600">{age.ageGroup}</p>
                          <p className="text-sm font-bold text-gray-900">{age.count}</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${parseFloat(age.percentage)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{age.percentage}%</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Age data not available</p>
                )}
              </div>

              {/* Gender Distribution */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Gender Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(stats.genderDistribution).map(([gender, count]) => {
                    const total = Object.values(stats.genderDistribution).reduce((a: number, b: number) => a + b, 0);
                    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                    const colors: Record<string, string> = {
                      male: 'bg-blue-600',
                      female: 'bg-pink-600',
                      other: 'bg-purple-600'
                    };
                    const labels: Record<string, string> = {
                      male: 'Male',
                      female: 'Female',
                      other: 'Other'
                    };

                    return (
                      <div key={gender}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-600">{labels[gender]}</p>
                          <p className="text-sm font-bold text-gray-900">{count}</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`${colors[gender]} h-2 rounded-full`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{percentage}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          {stats.recentReviews.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Reviews</h2>
              <div className="space-y-4">
                {stats.recentReviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{review.visitorName}</p>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800">
                            {review.rating}/5 stars
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{review.serviceName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(review.date).toLocaleDateString()}
                        </p>
                      </div>
                      {review.helpful > 0 && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700">
                            {review.helpful}
                          </p>
                          <p className="text-xs text-gray-500">helpful</p>
                        </div>
                      )}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg italic">
                        "{review.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Summary */}
          {stats.recentReviews.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews</h2>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Star className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">No reviews yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Reviews will appear here as visitors rate your services
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Visitor Info */}
        <div className="space-y-8">
          {/* Visitor Demographics Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Demographics</h2>
            <div className="space-y-4">
              {/* Gender Stats */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Gender</p>
                <div className="flex gap-2">
                  {Object.entries(stats.genderDistribution).map(([gender, count]) => {
                    const total = Object.values(stats.genderDistribution).reduce((a: number, b: number) => a + b, 0);
                    const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                    const labels: Record<string, string> = {
                      male: 'Male',
                      female: 'Female',
                      other: 'Other'
                    };

                    return (
                      <div key={gender} className="flex-1 bg-gray-50 p-3 rounded-lg text-center">
                        <p className="text-xs font-bold text-gray-900">{percentage}%</p>
                        <p className="text-xs text-gray-600">{labels[gender]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Age Stats */}
              {stats.ageGroups.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Top Age Groups</p>
                  <div className="space-y-2">
                    {stats.ageGroups.slice(0, 3).map((age, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{age.ageGroup}</span>
                        <span className="font-bold text-gray-900">{age.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visitor Geography */}
          {stats.topCountries.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Visitor Countries</h2>
              </div>
              <div className="space-y-3">
                {stats.topCountries.map((country, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-700">{country.country}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{country.count}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${parseFloat(country.percentage)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{country.percentage}% of visitors</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Visitor Sessions */}
          {stats.visitorSessions && stats.visitorSessions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Visitors</h2>
              <div className="space-y-3">
                {stats.visitorSessions.slice(0, 8).map((session: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.location || 'Unknown Location'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
                        {session.ipAddress && session.ipAddress !== 'Unknown' && (
                          <span className="bg-gray-100 px-2 py-1 rounded">IP: {session.ipAddress}</span>
                        )}
                        {session.device_type && (
                          <span className="bg-gray-100 px-2 py-1 rounded">{session.device_type}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                        {session.sessionDuration > 0 && (
                          <span>Session: {session.sessionDuration} min</span>
                        )}
                        {session.pagesVisited && (
                          <span>Pages: {session.pagesVisited}</span>
                        )}
                        {session.visit_count && (
                          <span>Visits: {session.visit_count}</span>
                        )}
                        {session.daysSinceFirstVisit !== undefined && (
                          <span>{session.daysSinceFirstVisit === 0 ? 'Today' : `${session.daysSinceFirstVisit}d ago`}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Visitors</span>
                <span className="font-bold text-gray-900">{stats.totalVisitors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unique Visitors</span>
                <span className="font-bold text-gray-900">{stats.uniqueVisitors}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed Bookings</span>
                <span className="font-bold text-gray-900">{stats.totalBookings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Services</span>
                <span className="font-bold text-gray-900">{stats.totalServices}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-600 font-medium">Conversion Rate</span>
                <span className="font-bold text-gray-900">{stats.conversionRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
