import { useParams, Navigate } from 'react-router-dom'
import HotelBooking from './HotelBooking.tsx'
import TransportBooking from './TransportBooking.tsx'
import TourBooking from './TourBooking.tsx'
import RestaurantBooking from './RestaurantBooking.tsx'
import ActivityBooking from './ActivityBooking.tsx'
import FlightBooking from './FlightBooking.tsx'
import { useServiceDetailQuery } from '../hooks/useServiceDetailQuery'

export default function BookingFlow() {
  const { slug } = useParams<{ slug: string }>()
  // Uses the same React Query key as ServiceDetail so the fetch is served from cache
  const { data, isLoading } = useServiceDetailQuery(slug)
  const service = data?.service ?? null

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!service) {
    return <Navigate to="/" replace />
  }

  const categoryName = (service as any).service_categories?.name?.toLowerCase() ?? ''

  switch (categoryName) {
    case 'hotels':
      return <HotelBooking service={service as any} />
    case 'tours':
      return <TourBooking service={service as any} />
    case 'transport':
      return <TransportBooking service={service as any} />
    case 'restaurants':
      return <RestaurantBooking service={service as any} />
    case 'activities':
      return <ActivityBooking service={service as any} />
    case 'flights':
      return <FlightBooking service={service as any} />
    default:
      return <ActivityBooking service={service as any} />
  }
}
