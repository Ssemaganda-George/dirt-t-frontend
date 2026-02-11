import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { MapPin, Star, MessageSquare } from 'lucide-react'
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
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              // Prefer a history back if available
              if (window.history.length > 1) return navigate(-1)
              // If a from location was provided via Link state, use it
              const from = (location.state as any)?.from
              if (from) return navigate(from)
              // Fallback: if vendor has top services, go to the first service detail
              const fallbackServiceId = stats?.topServices && stats.topServices.length > 0 ? stats.topServices[0].id : null
              if (fallbackServiceId) return navigate(`/service/${fallbackServiceId}`)
              // Final fallback: home
              return navigate('/')
            }}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm bg-white border hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>
          <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">{(vendor.business_name || 'V').charAt(0)}</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{vendor.business_name}</h1>
            {/* header: removed duplicate about/description to avoid repetition */}
            <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
              {vendor.business_city && (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>{vendor.business_city}{vendor.business_country ? `, ${vendor.business_country}` : ''}</span>
                </>
              )}
            </div>
          </div>
        </div>

          <div className="mt-4">
            <button
              type="button"
              aria-label={`Chat with ${vendor.business_name}`}
              onClick={() => {
                // Chat with vendor: go to top service inquiry if available, passing origin state
                const svcId = stats?.topServices && stats.topServices.length > 0 ? stats.topServices[0].id : null
                if (svcId) return navigate(`/service/${svcId}/inquiry`, { state: { from: location.pathname } })
                return navigate('/')
              }}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-md text-sm bg-white border border-gray-200 text-gray-800 hover:bg-gray-50"
            >
              <MessageSquare className="w-4 h-4 text-gray-600" />
              <span className="font-medium">Chat with {vendor.business_name}</span>
            </button>
          </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold">About</h3>
            <div className="text-sm text-gray-700 mt-2">
              {vendor.business_description ? (
                <p>{vendor.business_description}</p>
              ) : (
                <p className="text-gray-500">No description provided.</p>
              )}

              {vendor.years_experience && (
                <p className="mt-2 text-sm text-gray-600"><span className="font-medium">Years of experience:</span> {vendor.years_experience}</p>
              )}

              {vendor.languages_spoken && (
                <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Languages:</span> {vendor.languages_spoken}</p>
              )}

              {vendor.specialties && (
                <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Specialties:</span> {vendor.specialties}</p>
              )}

              {vendor.certifications && (
                <p className="mt-1 text-sm text-gray-600"><span className="font-medium">Certifications:</span> {vendor.certifications}</p>
              )}

              {/* Hobbies — show if available under common keys */}
              {(vendor.hobbies || vendor.personal_hobbies || vendor.business_hobbies) && (
                <p className="mt-2 text-sm text-gray-700"><span className="font-medium">Hobbies:</span> {vendor.hobbies || vendor.personal_hobbies || vendor.business_hobbies}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">Ratings & Reviews</h3>
            <div className="mt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center text-amber-500">
                  <Star className="w-5 h-5 text-amber-400" />
                  <span className="ml-1 text-2xl font-semibold text-gray-900">{stats?.avgRating ? stats.avgRating.toFixed(1) : '—'}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {stats?.recentReviews ? `${stats.recentReviews.length} review${stats.recentReviews.length !== 1 ? 's' : ''}` : 'No reviews yet'}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {stats?.recentReviews && stats.recentReviews.length > 0 ? (
                  stats.recentReviews.slice(0, 5).map((r: any) => (
                    <div key={r.id} className="p-3 bg-gray-50 rounded">
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
              </div>
            </div>
          </div>
        </div>
        {/* Other services carousel */}
        <VendorServicesCarousel vendorId={vendorId as string} limit={12} title={`Other services from "${vendor.business_name}"`} />
      </div>
    </div>
  )
}
