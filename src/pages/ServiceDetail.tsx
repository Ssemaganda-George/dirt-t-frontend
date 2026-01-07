import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  MapPin, 
  Star, 
  Users, 
  Clock, 
  Calendar,
  Phone,
  Mail,
  ArrowLeft,
  Heart,
  Share2,
  CheckCircle
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { getServiceById } from '../lib/database'

interface ServiceDetail {
  id: string
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

  // Service-specific fields
  duration_days?: number
  star_rating?: number
  room_types?: string[]
  check_in_time?: string
  check_out_time?: string
  facilities?: string[]
  difficulty_level?: string
  minimum_age?: number
  languages_offered?: string[]
  included_items?: string[]
  vehicle_type?: string
  vehicle_capacity?: number
  driver_included?: boolean
  air_conditioning?: boolean
  pickup_locations?: string[]
  airline?: string
  flight_number?: string
  departure_city?: string
  arrival_city?: string
  flight_class?: string
  cuisine_type?: string
  average_cost_per_person?: number
  outdoor_seating?: boolean
  reservations_required?: boolean
  activity_type?: string
  skill_level_required?: string
  equipment_provided?: string[]
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [guests, setGuests] = useState(1)

  useEffect(() => {
    if (id) {
      fetchService()
    }
  }, [id])

  const fetchService = async () => {
    try {
      if (!id) {
        console.error('No service ID provided')
        setService(null)
        setLoading(false)
        return
      }
      
      console.log('Fetching service with ID:', id)
      const serviceData = await getServiceById(id)
      console.log('Service data received:', serviceData)
      
      if (!serviceData) {
        console.log('No service found with ID:', id)
        setService(null)
      } else {
        setService(serviceData)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching service:', error)
      setService(null) // Explicitly set to null on error
      setLoading(false)
    }
  }

  // Map service category names to booking flow categories
  const mapCategoryToBookingFlow = (categoryName: string): string => {
    const categoryMap: { [key: string]: string } = {
      'hotels': 'hotels',
      'hotel': 'hotels',
      'accommodation': 'hotels',
      'transport': 'transport',
      'transportation': 'transport',
      'car rental': 'transport',
      'tours': 'tours',
      'tour': 'tours',
      'guided tour': 'tours',
      'restaurants': 'restaurants',
      'restaurant': 'restaurants',
      'dining': 'restaurants',
      'activities': 'activities',
      'activity': 'activities',
      'experience': 'activities',
      'flights': 'flights',
      'flight': 'flights',
      'air travel': 'flights'
    }
    
    return categoryMap[categoryName.toLowerCase()] || 'activities' // Default to activities
  }

  const handleBooking = () => {
    if (!service || !selectedDate) return
    
    const bookingCategory = mapCategoryToBookingFlow(service.service_categories.name)
    // Use React Router navigation
    navigate(`/service/${id}/book/${bookingCategory}`)
  }

  const handleInquiry = () => {
    if (!service) return
    // Navigate to inquiry form
    navigate(`/service/${id}/inquiry`)
  }

  // Get appropriate button text based on category
  const getBookingButtonText = (categoryName: string): string => {
    const categoryTexts: { [key: string]: string } = {
      'hotels': 'Book Hotel',
      'transport': 'Book Transport',
      'tours': 'Book Tour',
      'restaurants': 'Make Reservation',
      'activities': 'Book Activity',
      'flights': 'Book Flight'
    }
    
    const mappedCategory = mapCategoryToBookingFlow(categoryName)
    return categoryTexts[mappedCategory] || 'Book Now'
  }

  const getInquiryButtonText = (categoryName: string): string => {
    const categoryTexts: { [key: string]: string } = {
      'hotels': 'Hotel Inquiry',
      'transport': 'Transport Inquiry',
      'tours': 'Tour Inquiry',
      'restaurants': 'Reservation Inquiry',
      'activities': 'Activity Inquiry',
      'flights': 'Flight Inquiry'
    }
    
    const mappedCategory = mapCategoryToBookingFlow(categoryName)
    return categoryTexts[mappedCategory] || 'Make an Inquiry'
  }

  // Render category-specific information
  const renderCategorySpecificInfo = (service: ServiceDetail) => {
    const categoryName = service.service_categories.name.toLowerCase()

    switch (categoryName) {
      case 'hotels':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.star_rating && (
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 fill-current mr-2" />
                  <span className="text-sm text-gray-600">{service.star_rating} Star Hotel</span>
                </div>
              )}
              {service.room_types && service.room_types.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Room Types:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.room_types.map((room, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {room}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {service.check_in_time && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Check-in:</span> {service.check_in_time}
                </div>
              )}
              {service.check_out_time && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Check-out:</span> {service.check_out_time}
                </div>
              )}
              {service.facilities && service.facilities.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Facilities:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.facilities.slice(0, 4).map((facility, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'tours':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tour Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.difficulty_level && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Difficulty:</span> {service.difficulty_level}
                  </span>
                </div>
              )}
              {service.duration_days && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Duration:</span> {service.duration_days} days
                </div>
              )}
              {service.minimum_age && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Minimum Age:</span> {service.minimum_age} years
                </div>
              )}
              {service.languages_offered && service.languages_offered.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Languages:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.languages_offered.map((lang, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {service.included_items && service.included_items.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">What's Included:</span>
                  <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                    {service.included_items.slice(0, 3).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )

      case 'transport':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transport Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.vehicle_type && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Vehicle Type:</span> {service.vehicle_type}
                </div>
              )}
              {service.vehicle_capacity && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Capacity:</span> {service.vehicle_capacity} passengers
                </div>
              )}
              {service.driver_included && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Professional Driver Included</span>
                </div>
              )}
              {service.air_conditioning && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Air Conditioning</span>
                </div>
              )}
              {service.pickup_locations && service.pickup_locations.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Pickup Locations:</span>
                  <div className="text-sm text-gray-600 mt-1">
                    {service.pickup_locations.slice(0, 2).join(', ')}
                    {service.pickup_locations.length > 2 && '...'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'flights':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Flight Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.airline && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Airline:</span> {service.airline}
                </div>
              )}
              {service.flight_number && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Flight Number:</span> {service.flight_number}
                </div>
              )}
              {service.departure_city && service.arrival_city && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Route:</span> {service.departure_city} → {service.arrival_city}
                </div>
              )}
              {service.flight_class && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Class:</span> {service.flight_class}
                </div>
              )}
            </div>
          </div>
        )

      case 'restaurants':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Restaurant Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.cuisine_type && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Cuisine:</span> {service.cuisine_type}
                </div>
              )}
              {service.average_cost_per_person && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Average Cost:</span> {formatCurrency(service.average_cost_per_person, service.currency)} per person
                </div>
              )}
              {service.outdoor_seating && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Outdoor Seating Available</span>
                </div>
              )}
              {service.reservations_required && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-600">Reservations Required</span>
                </div>
              )}
            </div>
          </div>
        )

      case 'activities':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.activity_type && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Activity Type:</span> {service.activity_type}
                </div>
              )}
              {service.skill_level_required && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Skill Level:</span> {service.skill_level_required}
                </div>
              )}
              {service.duration_hours && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Duration:</span> {service.duration_hours} hours
                </div>
              )}
              {service.equipment_provided && service.equipment_provided.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Equipment Provided:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.equipment_provided.map((equipment, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                        {equipment}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    console.log('ServiceDetail: Loading state is true')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!service) {
    console.log('ServiceDetail: Service is null, showing not found message')
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service not found</h1>
          <p className="text-gray-600 mb-4">The service you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700 underline">
            Return to home
          </Link>
        </div>
      </div>
    )
  }

  const totalPrice = service.price * guests
  const imageUrl = service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to search
            </Link>
            <div className="flex items-center space-x-4">
              <button className="flex items-center text-gray-600 hover:text-red-600">
                <Heart className="h-5 w-5 mr-1" />
                Save
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-900">
                <Share2 className="h-5 w-5 mr-1" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="mb-8">
              <img
                src={imageUrl}
                alt={service.title}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
              />
            </div>

            {/* Service Info */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {service.service_categories.name}
                </span>
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="ml-1 text-sm font-medium">4.5</span>
                  <span className="ml-1 text-sm text-gray-500">(24 reviews)</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">{service.title}</h1>
              
              <div className="flex items-center text-gray-600 mb-6">
                <MapPin className="h-5 w-5 mr-2" />
                {service.location}
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                {service.description}
              </p>

              {/* Service Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {service.duration_hours && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      {service.duration_hours} hours
                    </span>
                  </div>
                )}
                {service.max_capacity && (
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">
                      Up to {service.max_capacity} guests
                    </span>
                  </div>
                )}
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Instant confirmation</span>
                </div>
              </div>

              {/* Amenities */}
              {service.amenities && service.amenities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">What's included</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {service.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-600">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category-Specific Information */}
            {renderCategorySpecificInfo(service)}

            {/* Vendor Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About the provider</h3>
              {service.vendors ? (
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600">
                      {service.vendors.business_name?.charAt(0) || 'V'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{service.vendors.business_name || 'Vendor'}</h4>
                    <p className="text-gray-600 text-sm mb-3">
                      {service.vendors.business_description || 'No description available'}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {service.vendors.business_phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {service.vendors.business_phone}
                        </div>
                      )}
                      {service.vendors.business_email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {service.vendors.business_email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>Vendor information not available</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(service.price, service.currency)}
                </div>
                <div className="text-sm text-gray-500">per person</div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of guests
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                    >
                      {Array.from({ length: service.max_capacity || 10 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} guest{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">
                    {formatCurrency(service.price, service.currency)} × {guests} guest{guests > 1 ? 's' : ''}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(totalPrice, service.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totalPrice, service.currency)}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleBooking}
                  disabled={!selectedDate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {service ? getBookingButtonText(service.service_categories.name) : 'Book Now'}
                </button>
                <button
                  onClick={handleInquiry}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {service ? getInquiryButtonText(service.service_categories.name) : 'Make an Inquiry'}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-3">
                You won't be charged yet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal - Removed, replaced with direct navigation */}
    </div>
  )
}