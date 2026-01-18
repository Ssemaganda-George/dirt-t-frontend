import { useParams, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HotelBooking from './HotelBooking.tsx'
import TransportBooking from './TransportBooking.tsx'
import TourBooking from './TourBooking.tsx'
import RestaurantBooking from './RestaurantBooking.tsx'
import ActivityBooking from './ActivityBooking.tsx'
import FlightBooking from './FlightBooking.tsx'
import { getServiceById } from '../lib/database'

interface ServiceDetail {
  id: string
  vendor_id?: string
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  location: string
  duration_hours: number
  max_capacity: number
  amenities: string[]
  vendors?: {
    business_name: string
    business_description: string
    business_phone: string
    business_email: string
    business_address: string
  } | null
  service_categories: {
    name: string
  }
  vehicle_type?: string
  vehicle_capacity?: number
  driver_included?: boolean
  fuel_included?: boolean
  pickup_locations?: string[]
  dropoff_locations?: string[]
}

export default function BookingFlow() {
  const { id } = useParams<{ id: string }>()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchService()
    }
  }, [id])

  const fetchService = async () => {
    try {
      if (!id) return
      
      const serviceData = await getServiceById(id)
      setService(serviceData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching service:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!service) {
    return <Navigate to="/" replace />
  }

  // Route to appropriate booking component based on category
  const categoryName = service.service_categories.name.toLowerCase()

  switch (categoryName) {
    case 'hotels':
      return <HotelBooking service={service} />

    case 'tours':
      return <TourBooking service={service} />

    case 'transport':
      return <TransportBooking service={service} />

    case 'restaurants':
      return <RestaurantBooking service={service} />

    case 'activities':
      return <ActivityBooking service={service} />

    case 'flights':
      return <FlightBooking service={service} />

    default:
      // Default to general booking flow
      return <ActivityBooking service={service} />
  }
}