import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getServicesByCategory } from '../lib/database'
import { Star } from 'lucide-react'

interface Props {
  categoryId: string
  excludeServiceId?: string
  limit?: number
}

export default function SimilarServicesCarousel({ categoryId, excludeServiceId, limit = 10 }: Props) {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const svcs = await getServicesByCategory(categoryId, excludeServiceId, limit)
        setServices(svcs || [])
      } catch (err) {
        console.warn('Failed to load similar services carousel', err)
      } finally {
        setLoading(false)
      }
    }

    if (categoryId) {
      load()
    }
  }, [categoryId, excludeServiceId, limit])

  if (loading) return null
  if (!services || services.length === 0) return null

  return (
    <div className="mt-6">
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
                  <span className="text-xs text-gray-700">—</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}