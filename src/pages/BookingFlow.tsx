import { lazy, Suspense } from 'react'
import { useParams, Navigate, useLocation } from 'react-router-dom'
import { useServiceDetailQuery } from '../hooks/useServiceDetailQuery'

const HotelBooking = lazy(() => import('./HotelBooking'))
const TransportBooking = lazy(() => import('./TransportBooking'))
const TourBooking = lazy(() => import('./TourBooking'))
const RestaurantBooking = lazy(() => import('./RestaurantBooking'))
const ActivityBooking = lazy(() => import('./ActivityBooking'))

function BookingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
    </div>
  )
}

export default function BookingFlow() {
  const { slug } = useParams<{ slug: string }>()
  const location = useLocation()
  const { data, isLoading } = useServiceDetailQuery(slug)
  const service = data?.service ?? null

  if (isLoading) {
    return <BookingLoading />
  }

  if (!service) {
    return <Navigate to="/" replace />
  }

  const categoryName = (service as any).service_categories?.name?.toLowerCase() ?? ''

  let bookingPage: JSX.Element
  switch (categoryName) {
    case 'hotels':
      bookingPage = <HotelBooking service={service as any} />
      break
    case 'tours':
      bookingPage = <TourBooking service={service as any} />
      break
    case 'transport':
      bookingPage = <TransportBooking service={service as any} />
      break
    case 'restaurants':
      bookingPage = <RestaurantBooking service={service as any} />
      break
    case 'activities':
      bookingPage = <ActivityBooking service={service as any} />
      break
    case 'shops':
      return <Navigate to={`/service/${slug}/purchase`} replace state={location.state} />
    default:
      bookingPage = <ActivityBooking service={service as any} />
  }

  return <Suspense fallback={<BookingLoading />}>{bookingPage}</Suspense>
}
