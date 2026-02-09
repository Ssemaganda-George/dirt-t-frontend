import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  MapPin, 
  Star, 
  Users, 
  Clock, 
  Calendar,
  ArrowLeft,
  Heart,
  Share2,
  ShoppingCart,
  CheckCircle
} from 'lucide-react'
import { getServiceBySlug, getServiceById, getTicketTypes, createOrder, getServiceReviews } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { usePreferences } from '../contexts/PreferencesContext'

interface ServiceDetail {
  id: string
  slug?: string
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
    id?: string
    user_id?: string
  } | null
  vendor_id?: string
  scan_enabled?: boolean
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
  breakfast_included?: boolean
  wifi_available?: boolean
  parking_available?: boolean
  pet_friendly?: boolean
  generator_backup?: boolean
  smoking_allowed?: boolean
  children_allowed?: boolean
  disabled_access?: boolean
  concierge_service?: boolean
  total_rooms?: number
  minimum_stay?: number
  maximum_guests?: number
  hotel_policies?: string[]
  difficulty_level?: string
  minimum_age?: number
  languages_offered?: string[]
  included_items?: string[]
  excluded_items?: string[]
  itinerary?: string[]
  meeting_point?: string
  end_point?: string
  transportation_included?: boolean
  meals_included?: string[]
  guide_included?: boolean
  accommodation_included?: boolean
  vehicle_type?: string
  vehicle_capacity?: number
  driver_included?: boolean
  air_conditioning?: boolean
  pickup_locations?: string[]
  dropoff_locations?: string[]
  route_description?: string
  license_required?: string
  booking_notice_hours?: number
  gps_tracking?: boolean
  fuel_included?: boolean
  tolls_included?: boolean
  insurance_included?: boolean
  usb_charging?: boolean
  child_seat?: boolean
  roof_rack?: boolean
  towing_capacity?: boolean
  four_wheel_drive?: boolean
  automatic_transmission?: boolean
  reservations_required?: boolean
  transport_terms?: string
  airline?: string
  flight_number?: string
  departure_city?: string
  arrival_city?: string
  flight_class?: string
  cuisine_type?: string
  average_cost_per_person?: number
  outdoor_seating?: boolean
  menu_items?: string[]
  dietary_options?: string[]
  opening_hours?: any
  live_music?: boolean
  private_dining?: boolean
  alcohol_served?: boolean
  activity_type?: string
  skill_level_required?: string
  equipment_provided?: string[]
  languages_spoken?: string[]
  specialties?: string[]
  certifications?: string[]
  years_experience?: number
  service_area?: string

  // Event-specific fields
  event_datetime?: string
  event_location?: string
  event_status?: string
  registration_deadline?: string
  max_participants?: number
  event_highlights?: string[]
  event_inclusions?: string[]
  event_prerequisites?: string[]
}

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [service, setService] = useState<ServiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [guests, setGuests] = useState(1)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState('')
  const [reviews, setReviews] = useState<any[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { addToCart } = useCart()
  const { selectedCurrency, selectedLanguage } = usePreferences()

  // Currency conversion functions
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    const exchangeRates: { [key: string]: number } = {
      'UGX': 1,
      'USD': 0.00027,
      'EUR': 0.00025,
      'GBP': 0.00021,
      'KES': 0.0023,
      'TZS': 0.00064,
      'BRL': 0.0014,
      'MXN': 0.0054,
      'EGP': 0.0084,
      'MAD': 0.0025,
      'TRY': 0.0089,
      'THB': 0.0077,
      'KRW': 0.33,
      'RUB': 0.019,
      'INR': 0.022,
      'CNY': 0.0019,
      'JPY': 0.039,
      'CAD': 0.00036,
      'AUD': 0.00037,
      'CHF': 0.00024,
      'SEK': 0.0024,
      'NOK': 0.0024,
      'DKK': 0.0017,
      'PLN': 0.0011,
      'CZK': 0.0064,
      'HUF': 0.088,
      'ZAR': 0.0048,
      'NGN': 0.11,
      'GHS': 0.0037,
      'XAF': 0.16,
      'XOF': 0.16
    }

    if (fromCurrency === toCurrency) return amount
    const amountInUGX = fromCurrency === 'UGX' ? amount : amount / exchangeRates[fromCurrency]
    return amountInUGX * (exchangeRates[toCurrency] || 1)
  }

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(selectedLanguage || 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch (error) {
      return `${currency} ${amount.toLocaleString()}`
    }
  }

  const formatCurrencyWithConversion = (amount: number, serviceCurrency: string) => {
    const convertedAmount = convertCurrency(amount, serviceCurrency, selectedCurrency || 'UGX')
    return formatAmount(convertedAmount, selectedCurrency || 'UGX')
  }
  const [ticketTypes, setTicketTypes] = useState<any[]>([])
  const [ticketQuantities, setTicketQuantities] = useState<{ [key: string]: number }>({})
  const ticketsTotal = ticketTypes.reduce((sum, t) => sum + (t.price * (ticketQuantities[t.id] || 0)), 0)

  useEffect(() => {
    if (slug) {
      fetchService()
    }
  }, [slug])

  useEffect(() => {
    const loadTickets = async () => {
      if (!service) return
      try {
  if ((service.service_categories?.name?.toLowerCase() === 'activities') || (service.service_categories?.name?.toLowerCase() === 'events')) {
          const types = await getTicketTypes(service.id)
          setTicketTypes(types || [])
          const initial: { [key: string]: number } = {}
          ;(types || []).forEach((t: any) => { initial[t.id] = 0 })
          setTicketQuantities(initial)
        }
      } catch (err) {
        console.error('Failed to load ticket types:', err)
      }
    }
    loadTickets()
  }, [service])

  useEffect(() => {
    if (service?.images && service.images.length > 0) {
      setSelectedImage(service.images[0])
    }
  }, [service])

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollLeft = scrollContainerRef.current.scrollLeft
        const width = scrollContainerRef.current.clientWidth
        const index = Math.round(scrollLeft / width)
        setCurrentImageIndex(Math.min(index, (service?.images?.length || 1) - 1))
      }
    }

    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [service?.images?.length])

  const fetchService = async () => {
    try {
      if (!slug) {
        console.error('No service slug/ID provided')
        setService(null)
        setLoading(false)
        return
      }
      
      console.log('Fetching service with slug/ID:', slug)
      
      // Try to fetch by slug first
      let serviceData = await getServiceBySlug(slug)
      
      // If not found by slug, try to fetch by ID
      if (!serviceData) {
        console.log('Service not found by slug, trying by ID:', slug)
        serviceData = await getServiceById(slug)
      }
      
      console.log('Service data received:', serviceData)
      
      if (!serviceData) {
        console.log('No service found with slug/ID:', slug)
        setService(null)
      } else {
        setService(serviceData)
        // Fetch reviews for this service
        try {
          const serviceReviews = await getServiceReviews(serviceData.id)
          setReviews(serviceReviews || [])
        } catch (error) {
          console.error('Error fetching reviews:', error)
          setReviews([])
        }
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
  // Accept public-facing 'events' and 'event' names and normalize to internal 'activities'
  'events': 'activities',
  'event': 'activities',
      'flights': 'flights',
      'flight': 'flights',
      'air travel': 'flights'
    }
    
    return categoryMap[categoryName.toLowerCase()] || 'activities' // Default to activities
  }

  const handleBooking = () => {
    if (!service) return
    
    // For transport services, check for date range
    if (service.service_categories?.name?.toLowerCase() === 'transport') {
      if (!startDate || !endDate) return
    } else if (['hotels', 'hotel', 'accommodation'].includes(service.service_categories?.name?.toLowerCase() || '')) {
      if (!checkInDate || !checkOutDate) return
    } else {
      if (!selectedDate) return
    }
    
    const bookingCategory = mapCategoryToBookingFlow(service.service_categories?.name || 'service')
    
    // Navigate to clean booking URL without query parameters
    const bookingUrl = `/service/${service.slug}/book/${bookingCategory}`
    
    // Pass selected dates and guests via navigation state
    const navigationState = service.service_categories?.name?.toLowerCase() === 'transport' 
      ? { startDate, endDate, guests }
      : ['hotels', 'hotel', 'accommodation'].includes(service.service_categories?.name?.toLowerCase() || '')
      ? { checkInDate, checkOutDate, guests, rooms: 1 }
      : { selectedDate, guests }
    
    // Use React Router navigation with state
    navigate(bookingUrl, { state: navigationState })
  }

  const handleInquiry = () => {
    if (!service) return
    // Navigate to inquiry form
    navigate(`/service/${service.slug}/inquiry`)
  }

  const handleSaveToCart = () => {
    if (!service) return
    
    // Determine booking data based on service category
    const isAccommodation = ['hotels', 'hotel', 'accommodation'].includes(service.service_categories?.name?.toLowerCase() || '')
    const isTransport = service.service_categories?.name?.toLowerCase() === 'transport'
    
    const bookingData = {
      date: isTransport ? startDate : isAccommodation ? checkInDate : selectedDate,
      checkInDate: isAccommodation ? checkInDate : '',
      checkOutDate: isAccommodation ? checkOutDate : '',
      guests: guests,
      rooms: 1,
      roomType: '',
      pickupLocation: '',
      dropoffLocation: '',
      returnTrip: false,
      specialRequests: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      paymentMethod: 'mobile'
    }
    
    // Add to cart with basic service info
    addToCart({
      serviceId: service.id,
      service,
      bookingData,
      category: service.service_categories.name.toLowerCase(),
      totalPrice: totalPrice,
      currency: service.currency
    })
    // Could add a toast notification here
  }

  // Get appropriate button text based on category
  const getBookingButtonText = (categoryName: string): string => {
    const categoryTexts: { [key: string]: string } = {
      'hotels': 'Check Availability',
      'transport': 'Check Availability',
      'tours': 'Check Availability',
      'restaurants': 'Check Availability',
      'activities': 'Check Availability',
      'flights': 'Check Availability'
    }
    
    const mappedCategory = mapCategoryToBookingFlow(categoryName)
    return categoryTexts[mappedCategory] || 'Check Availability'
  }

  // Render category-specific information
  const renderCategorySpecificInfo = (service: ServiceDetail) => {
    const categoryName = service.service_categories?.name?.toLowerCase() || 'service'

    switch (categoryName) {
      case 'hotels':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Accommodation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.star_rating && (
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-400 fill-current mr-2" />
                  <span className="text-sm text-gray-600">{service.star_rating} Star Hotel</span>
                </div>
              )}
              {service.total_rooms && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Rooms:</span> {service.total_rooms}
                </div>
              )}
              {service.minimum_stay && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Minimum Stay:</span> {service.minimum_stay} nights
                </div>
              )}
              {service.maximum_guests && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Max Guests per Room:</span> {service.maximum_guests}
                </div>
              )}
            </div>

            {/* Hotel Amenities */}
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Hotel Amenities</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {service.breakfast_included && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Breakfast Included</span>
                  </div>
                )}
                {service.wifi_available && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Free WiFi</span>
                  </div>
                )}
                {service.parking_available && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Parking Available</span>
                  </div>
                )}
                {service.pet_friendly && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Pet Friendly</span>
                  </div>
                )}
                {service.generator_backup && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Generator Backup</span>
                  </div>
                )}
                {service.smoking_allowed && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Smoking Allowed</span>
                  </div>
                )}
                {service.children_allowed && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Children Allowed</span>
                  </div>
                )}
                {service.disabled_access && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Disabled Access</span>
                  </div>
                )}
                {service.concierge_service && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Concierge Service</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {service.facilities && service.facilities.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Facilities:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.facilities.map((facility, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {service.check_in_time && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Check-in Time:</span> {service.check_in_time}
                </div>
              )}
              {service.check_out_time && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Check-out Time:</span> {service.check_out_time}
                </div>
              )}
            </div>

            {/* Hotel Policies */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">Hotel Policies</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>• <span className="font-medium">Check-in:</span> {service.check_in_time || '2:00 PM'}</p>
                <p>• <span className="font-medium">Check-out:</span> {service.check_out_time || '11:00 AM'}</p>
                <p>• Free cancellation up to 24 hours before check-in</p>
                {service.hotel_policies && service.hotel_policies.length > 0 && (
                  <>
                    {service.hotel_policies.map((policy, index) => (
                      <p key={index}>• {policy}</p>
                    ))}
                  </>
                )}
              </div>
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
              {service.meeting_point && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Meeting Point:</span> {service.meeting_point}
                </div>
              )}
              {service.end_point && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">End Point:</span> {service.end_point}
                </div>
              )}
            </div>

            {/* Tour Inclusions */}
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Tour Inclusions</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {service.transportation_included && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Transportation</span>
                  </div>
                )}
                {service.guide_included && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Professional Guide</span>
                  </div>
                )}
                {service.accommodation_included && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Accommodation</span>
                  </div>
                )}
                {service.meals_included && service.meals_included.length > 0 && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Meals: {service.meals_included.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {service.included_items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {service.excluded_items && service.excluded_items.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">What's Not Included:</span>
                  <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                    {service.excluded_items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {service.itinerary && service.itinerary.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Itinerary:</span>
                  <ol className="text-sm text-gray-600 mt-1 list-decimal list-inside">
                    {service.itinerary.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ol>
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
              {service.license_required && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">License Required:</span> {service.license_required}
                </div>
              )}
              {service.booking_notice_hours && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Booking Notice:</span> {service.booking_notice_hours} hours
                </div>
              )}
            </div>

            {/* Vehicle Features */}
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Vehicle Features</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {service.air_conditioning && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Air Conditioning</span>
                  </div>
                )}
                {service.gps_tracking && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">GPS Tracking</span>
                  </div>
                )}
                {service.usb_charging && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">USB Charging</span>
                  </div>
                )}
                {service.child_seat && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Child Seat</span>
                  </div>
                )}
                {service.roof_rack && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Roof Rack</span>
                  </div>
                )}
                {service.towing_capacity && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Towing Capacity</span>
                  </div>
                )}
                {service.four_wheel_drive && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">4WD</span>
                  </div>
                )}
                {service.automatic_transmission && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Automatic</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Inclusions */}
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">Service Inclusions</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {service.driver_included && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Professional Driver</span>
                  </div>
                )}
                {service.fuel_included && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Fuel Included</span>
                  </div>
                )}
                {service.tolls_included && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Tolls Included</span>
                  </div>
                )}
                {service.insurance_included && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Insurance Included</span>
                  </div>
                )}
                {service.reservations_required && (
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-gray-600">Reservations Required</span>
                  </div>
                )}
              </div>
            </div>

            {/* Locations */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.pickup_locations && service.pickup_locations.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Pickup Locations:</span>
                  <div className="text-sm text-gray-600 mt-1">
                    {service.pickup_locations.join(', ')}
                  </div>
                </div>
              )}
              {service.dropoff_locations && service.dropoff_locations.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Drop-off Locations:</span>
                  <div className="text-sm text-gray-600 mt-1">
                    {service.dropoff_locations.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Route Description */}
            {service.route_description && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700">Route Description:</span>
                <p className="text-sm text-gray-600 mt-1">{service.route_description}</p>
              </div>
            )}

            {/* Additional Terms */}
            {service.transport_terms && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700">Additional Terms & Conditions:</span>
                <p className="text-sm text-gray-600 mt-1">{service.transport_terms}</p>
              </div>
            )}

            {/* Fuel Policy */}
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-medium text-amber-900 mb-1">Fuel Policy</h4>
              {service.fuel_included ? (
                <p className="text-sm text-amber-800">Fuel is included in your rental — no extra charges for fuel.</p>
              ) : (
                <p className="text-sm text-amber-800">
                  Fuel costs are your responsibility. You'll be charged for fuel used during your rental.
                </p>
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
                  <span className="font-medium">Average Cost:</span> {formatCurrencyWithConversion(service.average_cost_per_person, service.currency)} per person
                </div>
              )}
              {service.outdoor_seating && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Outdoor Seating Available</span>
                </div>
              )}
              {service.live_music && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Live Music</span>
                </div>
              )}
              {service.private_dining && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Private Dining Available</span>
                </div>
              )}
              {service.alcohol_served && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm text-gray-600">Alcohol Served</span>
                </div>
              )}
              {service.reservations_required && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-600">Reservations Required</span>
                </div>
              )}
            </div>

            {service.menu_items && service.menu_items.length > 0 && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700">Popular Menu Items:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {service.menu_items.map((item, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {service.dietary_options && service.dietary_options.length > 0 && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700">Dietary Options:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {service.dietary_options.map((option, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      {option}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {service.opening_hours && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700">Opening Hours:</span>
                <div className="text-sm text-gray-600 mt-1">
                  {typeof service.opening_hours === 'object' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {Object.entries(service.opening_hours).map(([day, hours]) => (
                        <div key={day} className="capitalize">
                          <span className="font-medium">{day}:</span> {String(hours)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>{service.opening_hours}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case 'activities':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.event_datetime && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Event Date & Time:</span>{' '}
                  {new Date(service.event_datetime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
              {service.event_location && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Event Location:</span> {service.event_location}
                </div>
              )}
              {service.registration_deadline && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Registration Deadline:</span>{' '}
                  {new Date(service.registration_deadline).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
              {service.max_participants && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Maximum Participants:</span> {service.max_participants}
                </div>
              )}
              {service.minimum_age && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Minimum Age:</span> {service.minimum_age} years
                </div>
              )}
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
              {service.years_experience && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Years of Experience:</span> {service.years_experience}
                </div>
              )}
              {service.service_area && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Service Area:</span> {service.service_area}
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
              {service.languages_spoken && service.languages_spoken.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Languages Spoken:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.languages_spoken.map((language, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {service.specialties && service.specialties.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Specialties:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.specialties.map((specialty, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {service.certifications && service.certifications.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Certifications:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.certifications.map((certification, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        {certification}
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

  // Calculate number of days for transport services based on actual time difference
  const calculateDays = (startDate: string, startTime: string, endDate: string, endTime: string): number => {
    if (!startDate || !endDate) return 1
    
    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${endDate}T${endTime}`)
    
    const diffTime = Math.abs(endDateTime.getTime() - startDateTime.getTime())
    const diffHours = diffTime / (1000 * 60 * 60)
    
    // Round up to the next day if more than 24 hours
    return Math.ceil(diffHours / 24) || 1
  }

  // Calculate number of nights for accommodation services
  const calculateNights = (checkInDate: string, checkOutDate: string): number => {
    if (!checkInDate || !checkOutDate) return 1
    
    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)
    
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays || 1
  }

  const totalPrice = service.service_categories?.name?.toLowerCase() === 'transport'
    ? service.price * calculateDays(startDate, startTime, endDate, endTime)
    : ['hotels', 'hotel', 'accommodation'].includes(service.service_categories?.name?.toLowerCase() || '')
    ? service.price * calculateNights(checkInDate, checkOutDate)
    : service.price * guests

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Desktop only */}
      <div className="hidden md:block bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to search
            </Link>
            <div className="flex items-center space-x-3 md:space-x-2 ml-auto">
              <button className="flex items-center text-gray-600 hover:text-red-600 group">
                <Heart className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden md:inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm">Save</span>
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-900 group">
                <Share2 className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden md:inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm">Share</span>
              </button>
              <button 
                onClick={handleSaveToCart}
                className="flex items-center text-gray-600 hover:text-green-600 group"
              >
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden md:inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm">Save to Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Image with Header Overlay */}
      <div className="md:hidden w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw]">
        <div className="relative h-[60vh]">
          {/* Scrollable Image Container */}
          <div 
            ref={scrollContainerRef}
            className="w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth" 
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="flex w-full h-full">
              {service.images && service.images.length > 0 ? (
                service.images.map((image, index) => (
                  <div key={index} className="flex-shrink-0 w-full snap-center">
                    <img
                      src={image}
                      alt={`${service.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))
              ) : (
                <div className="flex-shrink-0 w-full snap-center">
                  <img
                    src="https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg"
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Header Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
            <Link to="/" className="flex items-center text-white bg-black bg-opacity-50 hover:bg-opacity-70 px-3 py-2 rounded-lg drop-shadow-lg transition-all">
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back</span>
            </Link>
            <div className="flex items-center space-x-2">
              <button className="flex items-center text-white bg-black bg-opacity-50 hover:bg-opacity-70 p-2 rounded-lg drop-shadow-lg transition-all">
                <Heart className="h-5 w-5" />
              </button>
              <button className="flex items-center text-white bg-black bg-opacity-50 hover:bg-opacity-70 p-2 rounded-lg drop-shadow-lg transition-all">
                <Share2 className="h-5 w-5" />
              </button>
              <button 
                onClick={handleSaveToCart}
                className="flex items-center text-white bg-black bg-opacity-50 hover:bg-opacity-70 p-2 rounded-lg drop-shadow-lg transition-all"
              >
                <ShoppingCart className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Image Counter */}
          {service.images && service.images.length > 0 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm z-10">
              {currentImageIndex + 1} / {service.images.length}
            </div>
          )}

          {/* Event hero overlay for Activities to mimic Quicket-style layout */}
          {(service.service_categories?.name?.toLowerCase() === 'activities' || service.service_categories?.name?.toLowerCase() === 'events') && (
            <div className="absolute left-6 bottom-6 max-w-2xl bg-gradient-to-r from-black/70 via-black/40 to-transparent text-white p-6 rounded-lg">
              <div className="text-sm uppercase tracking-wide text-gray-200 mb-2">{service.service_categories?.name || 'Event'}</div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">{service.title}</h2>
              <div className="mt-3 flex items-center text-sm text-gray-200 space-x-4">
                {service.duration_hours && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{service.duration_hours} hours</span>
                  </div>
                )}
                {service.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{service.location}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-300">From</div>
                  <div className="text-2xl font-semibold">{formatCurrencyWithConversion(ticketTypes.length > 0 ? Math.min(...ticketTypes.map((t: any) => Number(t.price || 0))) : service.price, service.currency)}</div>
                </div>
                <div>
                  <button onClick={() => {
                    // scroll to tickets sidebar
                    const el = document.querySelector('[data-tickets-section]')
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Buy Tickets</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile - Centered Info Block Near Image */}
      <div className="md:hidden bg-white border-b">
        <div className="max-w-md mx-auto px-4 py-3 text-center">
          {/* Title */}
          <h1 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h1>

          {/* Description */}
          <p className="text-gray-700 text-xs leading-relaxed mb-1">
            {service.description}
          </p>

          {/* Location */}
          <p className="text-gray-600 text-xs mb-2">
            in {service.location}
          </p>

          {/* Rating & Reviews */}
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="ml-1 text-xs font-medium text-gray-900">4.5</span>
            </div>
            <span className="text-xs text-gray-500 ml-2">(24 reviews)</span>
          </div>
        </div>
      </div>

      {/* Mobile Information Section - Organized & Logical Flow */}
      <div className="md:hidden bg-gray-50 pb-20">
        <div className="px-4 py-6 space-y-6">
          {/* 2. Quick Info - All Details Consolidated */}
          <div className="bg-white rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium mb-3 uppercase">Quick Info</p>
            <div className="space-y-2">
              {service.duration_hours && service.service_categories?.name?.toLowerCase() !== 'transport' && (
                <div className="flex items-center text-xs text-gray-700">
                  <Clock className="h-4 w-4 text-gray-400 mr-2" />
                  Duration: {service.duration_hours} hours
                </div>
              )}
              {service.max_capacity && (
                <div className="flex items-center text-xs text-gray-700">
                  <Users className="h-4 w-4 text-gray-400 mr-2" />
                  Up to {service.max_capacity} guests
                </div>
              )}
              <div className="flex items-center text-xs text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Instant confirmation
              </div>
              
              {/* Amenities in Quick Info */}
              {service.amenities && service.amenities.length > 0 && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-gray-500 font-medium mb-2">What's Included</p>
                    <div className="space-y-1">
                      {service.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center text-xs text-gray-700">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                          {amenity}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              
              {/* Hotel-specific details in Quick Info */}
              {service.service_categories?.name?.toLowerCase() === 'hotels' && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs text-gray-500 font-medium mb-2">Accommodation Details</p>
                    <div className="space-y-1 text-xs">
                      {service.star_rating && (
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-400 fill-current mr-2" />
                          <span className="text-gray-700">{service.star_rating} Star</span>
                        </div>
                      )}
                      {service.total_rooms && <div className="text-gray-700">Rooms: <span className="font-medium">{service.total_rooms}</span></div>}
                      {service.minimum_stay && <div className="text-gray-700">Min. Stay: <span className="font-medium">{service.minimum_stay} nights</span></div>}
                      {service.check_in_time && <div className="text-gray-700">Check-in: <span className="font-medium">{service.check_in_time}</span></div>}
                      {service.check_out_time && <div className="text-gray-700">Check-out: <span className="font-medium">{service.check_out_time}</span></div>}
                    </div>
                  </div>
                </>
              )}
              
              {/* Provider info in Quick Info */}
              {service.vendors && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-gray-500 font-medium mb-2">Provider</p>
                  <div className="flex items-start space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-600">
                        {service.vendors.business_name?.charAt(0) || 'V'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-xs">{service.vendors.business_name || 'Service Provider'}</h4>
                      <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">
                        {service.vendors.business_description || 'No description available'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reviews Summary */}
          <div className="bg-white rounded-lg p-4 border-t-4 border-yellow-400">
            <p className="text-xs text-gray-500 font-medium mb-3 uppercase">Reviews</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="ml-1 text-lg font-bold text-gray-900">4.5</span>
                </div>
                <div>
                  <p className="text-xs text-gray-600">({reviews.length} reviews)</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Reviews Messages */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs text-gray-500 font-medium mb-3 uppercase">Recent Reviews</p>
              <div className="space-y-3">
                {reviews.slice(0, 5).map((review, index) => (
                  <div key={index} className="border-b pb-3 last:border-b-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">{review.visitor_name || 'Anonymous'}</p>
                        <div className="flex items-center mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-gray-600 line-clamp-3 mt-1">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery - Desktop */}
            <div className="mb-8 hidden md:block">
              {/* Main Image Display */}
              <div className="relative mb-4">
                <img
                  src={selectedImage || service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
                  alt={service.title}
                  className="w-full h-[640px] object-cover rounded-lg shadow-lg"
                />

                {/* Event hero overlay for Activities to mimic Quicket-style layout */}
                {(service.service_categories?.name?.toLowerCase() === 'activities' || service.service_categories?.name?.toLowerCase() === 'events') && (
                  <div className="absolute left-6 bottom-6 max-w-2xl bg-gradient-to-r from-black/70 via-black/40 to-transparent text-white p-6 rounded-lg">
                    <div className="text-sm uppercase tracking-wide text-gray-200 mb-2">{service.service_categories?.name || 'Event'}</div>
                    <h2 className="text-3xl md:text-4xl font-bold leading-tight">{service.title}</h2>
                    <div className="mt-3 flex items-center text-sm text-gray-200 space-x-4">
                      {service.duration_hours && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{service.duration_hours} hours</span>
                        </div>
                      )}
                      {service.location && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>{service.location}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-300">From</div>
                        <div className="text-2xl font-semibold">{formatCurrencyWithConversion(ticketTypes.length > 0 ? Math.min(...ticketTypes.map((t: any) => Number(t.price || 0))) : service.price, service.currency)}</div>
                      </div>
                      <div>
                        <button onClick={() => {
                          // scroll to tickets sidebar
                          const el = document.querySelector('[data-tickets-section]')
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Buy Tickets</button>
                      </div>
                    </div>
                  </div>
                )}
                {service.images && service.images.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    Images
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery - Desktop */}
              {service.images && service.images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {service.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(image)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === image ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${service.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Desktop - Centered Info Block Near Image (matches mobile) */}
              <div className="hidden md:block bg-white border-b mb-8 px-4 py-6">
                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">{service.title}</h1>

                {/* Description + Location in one line */}
                <div className="text-center">
                  {service.description && (
                    <p className="text-gray-700 text-sm leading-relaxed mb-2">
                      {service.description}
                    </p>
                  )}
                  {service.location && (
                    <p className="text-gray-600 text-sm">
                      {['activities', 'events', 'activity', 'event'].includes(service.service_categories?.name?.toLowerCase() || '') ? 'at' : 'in'} <span className="font-medium">{service.location}</span>
                    </p>
                  )}
                </div>

                {/* Rating & Reviews */}
                <div className="flex items-center justify-center mt-4">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium text-gray-900">4.5</span>
                  </div>
                  <span className="text-sm text-gray-500 ml-2">({reviews.length} reviews)</span>
                </div>
              </div>

              {/* Description, Location, and Reviews - Top Priority Sections */}
              <div className="mt-8 space-y-6">
                {/* Quick Info - Consolidated Details */}
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900 mb-4 uppercase">Quick Info</p>
                  <div className="space-y-3">
                    {service.duration_hours && service.service_categories?.name?.toLowerCase() !== 'transport' && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Clock className="h-4 w-4 text-gray-400 mr-3" />
                        Duration: {service.duration_hours} hours
                      </div>
                    )}
                    {service.max_capacity && (
                      <div className="flex items-center text-sm text-gray-700">
                        <Users className="h-4 w-4 text-gray-400 mr-3" />
                        Up to {service.max_capacity} guests
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                      Instant confirmation
                    </div>
                    
                    {/* Amenities in Quick Info */}
                    {service.amenities && service.amenities.length > 0 && (
                      <>
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs text-gray-500 font-medium mb-2">What's Included</p>
                          <div className="space-y-1">
                            {service.amenities.map((amenity, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-700">
                                <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                                {amenity}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Hotel-specific details in Quick Info */}
                    {service.service_categories?.name?.toLowerCase() === 'hotels' && (
                      <>
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs text-gray-500 font-medium mb-2">Accommodation Details</p>
                          <div className="space-y-1 text-sm">
                            {service.star_rating && (
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-400 fill-current mr-2" />
                                <span className="text-gray-700">{service.star_rating} Star</span>
                              </div>
                            )}
                            {service.total_rooms && <div className="text-gray-700">Rooms: <span className="font-medium">{service.total_rooms}</span></div>}
                            {service.minimum_stay && <div className="text-gray-700">Min. Stay: <span className="font-medium">{service.minimum_stay} nights</span></div>}
                            {service.check_in_time && <div className="text-gray-700">Check-in: <span className="font-medium">{service.check_in_time}</span></div>}
                            {service.check_out_time && <div className="text-gray-700">Check-out: <span className="font-medium">{service.check_out_time}</span></div>}
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Provider info in Quick Info */}
                    {service.vendors && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-gray-500 font-medium mb-2">Provider</p>
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-600">
                              {service.vendors.business_name?.charAt(0) || 'V'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm">{service.vendors.business_name || 'Service Provider'}</h4>
                            <p className="text-gray-600 text-sm mt-0.5 line-clamp-2">
                              {service.vendors.business_description || 'No description available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reviews Summary */}
                <div className="bg-white rounded-lg p-6 shadow-sm border-t-4 border-yellow-400">
                  <p className="text-sm font-semibold text-gray-900 mb-4 uppercase">Reviews</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        <span className="ml-1 text-2xl font-bold text-gray-900">4.5</span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">({reviews.length} reviews)</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reviews List */}
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-4 border-t pt-4">
                      {reviews.map((review, index) => (
                        <div key={index} className="border-b pb-4 last:border-b-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{review.visitor_name || 'Anonymous'}</p>
                              <div className="flex items-center mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-gray-600">{review.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 pt-4 border-t">No reviews yet. Be the first to share your experience!</p>
                  )}
                </div>
              </div>
            </div>

            {/* Category-Specific Information */}
            {renderCategorySpecificInfo(service)}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              {(service.service_categories?.name?.toLowerCase() === 'activities' || service.service_categories?.name?.toLowerCase() === 'events') ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets</h3>
                  <div className="space-y-3 mb-4">
                    {ticketTypes.length === 0 && (
                      <div className="text-sm text-gray-500">No ticket types configured for this event.</div>
                    )}
                    {ticketTypes.map((t) => {
                      const remaining = (t.quantity || 0) - (t.sold || 0)
                      const soldOut = remaining <= 0
                      const saleStart = t.sale_start || (t.metadata && t.metadata.sale_start)
                      const saleEnd = t.sale_end || (t.metadata && t.metadata.sale_end)
                      const now = new Date()
                      const startOk = !saleStart || new Date(saleStart) <= now
                      const endOk = !saleEnd || new Date(saleEnd) >= now
                      const saleOpen = startOk && endOk

                      return (
                        <div key={t.id} className={`border p-3 rounded-lg ${(soldOut || !saleOpen) ? 'opacity-60' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{t.title}</div>
                              {t.description && <div className="text-sm text-gray-500">{t.description}</div>}
                              <div className="text-sm text-gray-600 mt-1">{formatCurrencyWithConversion(t.price, service.currency)} · {remaining} left</div>
                              {!saleOpen && (
                                <div className="text-xs text-yellow-700 mt-1">
                                  {saleStart && new Date(saleStart) > now && `Sales open from ${new Date(saleStart).toLocaleString()}`}
                                  {saleEnd && new Date(saleEnd) < now && `Sales closed (deadline ${new Date(saleEnd).toLocaleString()})`}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button disabled={soldOut || !saleOpen} onClick={() => setTicketQuantities(q => ({ ...q, [t.id]: Math.max(0, (q[t.id] || 0) - 1) }))} className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50">-</button>
                              <input type="number" min={0} max={t.quantity} value={ticketQuantities[t.id] || 0} onChange={(e) => setTicketQuantities(q => ({ ...q, [t.id]: Math.min(t.quantity, Math.max(0, Number(e.target.value || 0))) }))} className="w-16 text-center border rounded px-2 py-1" disabled={!saleOpen} />
                              <button disabled={soldOut || !saleOpen} onClick={() => setTicketQuantities(q => ({ ...q, [t.id]: Math.min(t.quantity, (q[t.id] || 0) + 1) }))} className="px-2 py-1 bg-gray-100 rounded disabled:opacity-50">+</button>
                            </div>
                          </div>
                          {soldOut && <div className="text-xs text-red-600 mt-2">Sold out</div>}
                        </div>
                      )
                    })}
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Total</span>
                      <span className="font-medium">{formatCurrencyWithConversion(ticketsTotal, service.currency)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button onClick={async () => {
                      try {
                        const items = Object.entries(ticketQuantities).filter(([, qty]) => qty > 0).map(([ticket_type_id, qty]) => ({ ticket_type_id, quantity: qty as number, unit_price: ticketTypes.find(tt => tt.id === ticket_type_id)?.price || 0 }))
                        if (items.length === 0) return alert('Select at least one ticket')
                        const vendorId = service.vendor_id || service.vendors?.id || null
                          const order = await createOrder(user?.id || null, vendorId, items, service.currency)
                          // Navigate to checkout to collect buyer info and complete payment
                          navigate(`/checkout/${order.id}`)
                      } catch (err) {
                        console.error('Failed to create order:', err)
                        alert('Failed to create order. Try again later.')
                      }
                    }} disabled={ticketsTotal <= 0} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors">Buy Tickets</button>
                    <button onClick={handleInquiry} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors border border-gray-300">Contact Provider</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-gray-900">{formatCurrencyWithConversion(service.price, service.currency)}</div>
                    <div className="text-sm text-gray-500">
                      {service.service_categories?.name?.toLowerCase() === 'transport' ? 'per day' : 
                       ['hotels', 'hotel', 'accommodation'].includes(service.service_categories?.name?.toLowerCase() || '') ? 'per night' :
                       service.service_categories?.name?.toLowerCase() === 'shops' ? 'per item' :
                       service.service_categories?.name?.toLowerCase() === 'restaurants' ? 'per meal' : 'per person'}
                    </div>
                  </div>

                  {/* Date & Guest Selection Form */}
                  <div className="space-y-3 mb-6">
                    {service.service_categories?.name?.toLowerCase() === 'transport' ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2 uppercase">Pick-up</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <input type="date" className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg" value={startDate} onChange={(e) => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <input type="time" className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2 uppercase">Drop-off</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <input type="date" className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split('T')[0]} />
                            </div>
                            <input type="time" className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                          </div>
                        </div>
                      </>
                    ) : ['hotels', 'hotel', 'accommodation'].includes(service.service_categories?.name?.toLowerCase() || '') ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2 uppercase">Check-in</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input type="date" className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2 uppercase">Check-out</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input type="date" className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} min={checkInDate || new Date().toISOString().split('T')[0]} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2 uppercase">Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input type="date" className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                        </div>
                      </div>
                    )}

                    {service.service_categories?.name?.toLowerCase() !== 'transport' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2 uppercase">Guests</label>
                        <div className="relative">
                          <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <select className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                            {Array.from({ length: service.max_capacity || 10 }, (_, i) => i + 1).map(num => (<option key={num} value={num}>{num} guest{num > 1 ? 's' : ''}</option>))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price Calculation */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-6">
                    <div className="flex justify-between items-center mb-2 text-xs">
                      <span className="text-gray-600">
                        {service.service_categories?.name?.toLowerCase() === 'transport' 
                          ? `${formatCurrencyWithConversion(service.price, service.currency)} × ${calculateDays(startDate, startTime, endDate, endTime)} day${calculateDays(startDate, startTime, endDate, endTime) > 1 ? 's' : ''}`
                          : ['hotels', 'hotel', 'accommodation'].includes(service.service_categories?.name?.toLowerCase() || '')
                          ? `${formatCurrencyWithConversion(service.price, service.currency)} × ${calculateNights(checkInDate, checkOutDate)} night${calculateNights(checkInDate, checkOutDate) > 1 ? 's' : ''}`
                          : `${formatCurrencyWithConversion(service.price, service.currency)} × ${guests} guest${guests > 1 ? 's' : ''}`}
                      </span>
                      <span className="font-medium text-gray-900">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-sm">
                      <span>Total</span>
                      <span className="text-gray-900">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-3">
                    <button onClick={handleBooking} disabled={
                      service?.service_categories?.name?.toLowerCase() === 'transport' ? !startDate || !endDate :
                      ['hotels', 'hotel', 'accommodation'].includes(service?.service_categories?.name?.toLowerCase() || '') ? !checkInDate || !checkOutDate :
                      !selectedDate
                    } className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 text-sm rounded-lg transition-colors">{service ? getBookingButtonText(service.service_categories?.name || 'Service') : 'Check Availability'}</button>
                    <button onClick={handleInquiry} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 text-sm rounded-lg transition-colors border border-gray-300">Contact</button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">No charge yet</p>
                </div>
              )}

              {/* show scan link to vendor/admin when enabled */}
              {service.scan_enabled && (user?.id === service.vendors?.user_id) && (
                <div className="mt-4 text-sm text-center">
                  <a href={`/scan/${service.id}`} className="text-blue-600 underline">Open Event Scan Portal</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal - Removed, replaced with direct navigation */}
    </div>
  )
}