import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVendorServices, getVendorActivityStats } from '../lib/database'
import { Star } from 'lucide-react'

interface Props {
  vendorId: string
  limit?: number
  title?: string
}

export default function VendorServicesCarousel({ vendorId, limit = 10, title = 'More from this provider' }: Props) {
  const [services, setServices] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [svcs, s] = await Promise.all([
          getVendorServices(vendorId),
          getVendorActivityStats(vendorId).catch(() => null)
        ])

        setServices((svcs || []).slice(0, limit))
        setStats(s)
      } catch (err) {
        console.warn('Failed to load vendor services carousel', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [vendorId, limit])

  if (loading) return null
  if (!services || services.length === 0) return null

  // Build a quick map of avg ratings from stats if available
  const ratingMap: Record<string, number> = {}
  if (stats?.topServices && Array.isArray(stats.topServices)) {
    stats.topServices.forEach((s: any) => {
      if (s.id) ratingMap[s.id] = s.avgRating || 0
    })
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="overflow-x-auto -mx-3 px-3">
        <div className="flex space-x-3">
          {services.map((svc) => (
            <Link key={svc.id} to={`/service/${svc.slug || svc.id}`} className="flex-shrink-0 w-40 bg-white rounded-md shadow-sm overflow-hidden hover:shadow-md">
              <div className="w-40 h-24 bg-gray-100 flex items-center justify-center overflow-hidden">
                <img alt={svc.title} src={svc.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'} className="w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <div className="text-sm font-medium text-gray-900 line-clamp-2">{svc.title}</div>
                <div className="mt-1 flex items-center text-sm text-amber-600">
                  <Star className="w-4 h-4 text-amber-400 mr-1" />
                  <span className="text-xs text-gray-700">{(ratingMap[svc.id] && ratingMap[svc.id] > 0) ? ratingMap[svc.id].toFixed(1) : '—'}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
