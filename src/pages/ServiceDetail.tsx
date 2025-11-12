import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  vendors: {
    business_name: string
    business_description: string
    business_phone: string
    business_email: string
    business_address: string
  }
  service_categories: {
    name: string
  }
}

// Mock data for demonstration
const mockService: ServiceDetail = {
  id: '1',
  title: 'Professional Photography Session',
  description: 'Capture your special moments with our professional photography service. Perfect for portraits, events, or commercial needs.',
  price: 150,
  currency: 'USD',
  images: ['https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'],
  location: 'Downtown Studio, New York',
  duration_hours: 2,
  max_capacity: 8,
  amenities: ['Professional lighting', 'Multiple backdrop options', 'Digital copies included', 'Editing service'],
  vendors: {
    business_name: 'Creative Studios',
    business_description: 'Professional photography and creative services with over 10 years of experience.',
    business_phone: '+1 (555) 123-4567',
    business_email: 'info@creativestudios.com',
    business_address: '123 Main St, New York, NY 10001'
  },
  service_categories: {
    name: 'Photography'
  }
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [guests, setGuests] = useState(1)
  const [showBookingModal, setShowBookingModal] = useState(false)

  useEffect(() => {
    if (id) {
      fetchService()
    }
  }, [id])

  const fetchService = async () => {
    try {
      // Simulate API call delay
      setTimeout(() => {
        setService(mockService)
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Error fetching service:', error)
      setLoading(false)
    }
  }

  const handleBooking = () => {
    setShowBookingModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service not found</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
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

            {/* Vendor Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About the provider</h3>
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600">
                    {service.vendors.business_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{service.vendors.business_name}</h4>
                  <p className="text-gray-600 text-sm mb-3">
                    {service.vendors.business_description}
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

              <button
                onClick={handleBooking}
                disabled={!selectedDate}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Book Now
              </button>

              <p className="text-xs text-gray-500 text-center mt-3">
                You won't be charged yet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Complete your booking</h3>
              <p className="text-gray-600 mb-6">
                Please sign in or create an account to complete your booking.
              </p>
              <div className="flex space-x-3">
                <Link
                  to="/login"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}