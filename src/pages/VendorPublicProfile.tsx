import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { MapPin, Star, MessageSquare, CheckCircle, ExternalLink } from 'lucide-react'
import { getVendorActivityStats } from '../lib/database'
import VendorServicesCarousel from '../components/VendorServicesCarousel'

export default function VendorPublicProfile() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const [vendor, setVendor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const fetchVendor = async () => {
      if (!vendorId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', vendorId)
          .single()

        if (!error && data) setVendor(data)
      } catch (err) {
        console.error('Failed to fetch vendor', err)
      } finally {
        setLoading(false)
      }
    }

    fetchVendor()
  }, [vendorId])

  useEffect(() => {
    const fetchStats = async () => {
      if (!vendorId) return
      try {
        const s = await getVendorActivityStats(vendorId)
        setStats(s)
      } catch (err) {
        console.warn('Failed to fetch vendor stats', err)
        setStats(null)
      }
    }

    fetchStats()
  }, [vendorId])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading vendor…</div>
  if (!vendor) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold">Vendor not found</h2>
        <Link to="/" className="text-blue-600 underline mt-2 block">Return home</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Hero / banner */}
          <div className="relative">
            <div
              className="h-44 md:h-56 w-full bg-gray-100 flex items-end"
              style={{ backgroundImage: vendor.cover_image ? `url(${vendor.cover_image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              {/* simple subtle overlay (not a gradient) to improve text contrast if an image exists */}
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="px-6 md:px-10 -mt-10 relative">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="relative flex-shrink-0">
                  {vendor.avatar_url ? (
                    <img src={vendor.avatar_url} alt={`${vendor.business_name} avatar`} className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white object-cover shadow" />
                  ) : (
                    <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white bg-white flex items-center justify-center text-2xl sm:text-3xl font-bold text-indigo-700 shadow">{(vendor.business_name || 'V').charAt(0)}</div>
                  )}
                  {vendor.is_verified && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">{vendor.business_name}</h1>
                      <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-3">
                        {vendor.business_city && (
                          <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4 text-gray-500" />{vendor.business_city}{vendor.business_country ? `, ${vendor.business_country}` : ''}</span>
                        )}
                        {vendor.website && (
                          <a href={vendor.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
                            <ExternalLink className="w-4 h-4" /> Visit website
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border w-full sm:w-auto justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium">{stats?.avgRating ? stats.avgRating.toFixed(1) : '—'}</span>
                        </div>
                        <span className="text-xs text-gray-500">{stats?.reviewsCount ? `(${stats.reviewsCount})` : ''}</span>
                      </div>

                      <button
                        onClick={() => {
                          const svcId = stats?.topServices && stats.topServices.length > 0 ? stats.topServices[0].id : null
                          if (svcId) return navigate(`/service/${svcId}/inquiry`, { state: { from: location.pathname } })
                          return navigate('/')
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  </div>

                  {/* short description */}
                  <p className="mt-3 text-sm text-gray-700">{vendor.business_description || 'No description provided.'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-10 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold">About</h3>
                <div className="mt-3 text-sm text-gray-700 space-y-2">
                  {vendor.business_description ? (
                    <p>{vendor.business_description}</p>
                  ) : (
                    <p className="text-gray-500">No description provided.</p>
                  )}

                  <div className="flex flex-wrap gap-3 mt-2">
                    {vendor.years_experience && <span className="text-xs px-2 py-1 bg-gray-100 rounded">Years of experience: <strong className="ml-1">{vendor.years_experience}</strong></span>}
                    {vendor.languages_spoken && <span className="text-xs px-2 py-1 bg-gray-100 rounded">Languages: <strong className="ml-1">{vendor.languages_spoken}</strong></span>}
                    {vendor.specialties && <span className="text-xs px-2 py-1 bg-gray-100 rounded">Specialties: <strong className="ml-1">{vendor.specialties}</strong></span>}
                    {vendor.certifications && <span className="text-xs px-2 py-1 bg-gray-100 rounded">Certifications: <strong className="ml-1">{vendor.certifications}</strong></span>}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Ratings & Reviews</h3>
                  <div className="mt-3 space-y-4">
                    {stats?.recentReviews && stats.recentReviews.length > 0 ? (
                      stats.recentReviews.slice(0, 5).map((r: any) => (
                        <div key={r.id} className="p-4 bg-gray-50 rounded">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{r.visitorName}</div>
                            <div className="text-sm text-amber-600">{r.rating} / 5</div>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{r.comment || '—'}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(r.date).toLocaleDateString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No approved reviews yet.</p>
                    )}
                    <div>
                      <Link to={`/vendor/${vendorId}/reviews`} className="text-sm text-indigo-600 hover:underline">See all reviews</Link>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="space-y-4">
                {/* Contact intentionally hidden on public profile for privacy */}
                <div className="p-4 bg-white rounded border">
                  <div className="text-sm text-gray-600">Top services</div>
                  <div className="mt-3 space-y-2">
                    {stats?.topServices && stats.topServices.length > 0 ? (
                      stats.topServices.slice(0, 5).map((s: any) => (
                        <Link key={s.id} to={`/service/${s.id}`} className="block text-sm text-gray-800 hover:text-indigo-600">{s.title}</Link>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">No services listed.</div>
                    )}
                  </div>
                </div>
              </aside>
            </div>

            <div className="mt-6">
              <VendorServicesCarousel vendorId={vendorId as string} limit={12} title={`Other services from "${vendor.business_name}"`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
