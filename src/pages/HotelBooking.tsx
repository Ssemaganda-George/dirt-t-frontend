import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, CreditCard, CheckCircle, Bed, Wifi, Car } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { createBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'

interface ServiceDetail {
  id: string
  slug?: string
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
    id?: string
    business_name: string
    business_description: string
    business_phone: string
    business_email: string
    business_address: string
  } | null
  service_categories: {
    name: string
  }
  // Hotel-specific fields
  room_types?: string[]
  check_in_time?: string
  check_out_time?: string
  star_rating?: number
  facilities?: string[]
}

interface HotelBookingProps {
  service: ServiceDetail
}

export default function HotelBooking({ service }: HotelBookingProps) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user, profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [cartSaved, setCartSaved] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingData, setBookingData] = useState({
    checkInDate: '',
    checkOutDate: '',
    guests: 1,
    rooms: 1,
    roomType: service.room_types?.[0] || 'Standard',
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentMethod: 'card',
    mobileProvider: ''
  })
  const [cardNoticeVisible, setCardNoticeVisible] = useState(false)
  

  // Auto-populate contact information for logged-in users
  useEffect(() => {
    const fetchTouristData = async () => {
      if (!user) return

      try {
        // Get tourist profile data
        const { data: touristData, error } = await supabase
          .from('tourists')
          .select('first_name, last_name, phone')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error fetching tourist data:', error)
        } else if (touristData) {
          // Auto-populate contact fields
          setBookingData(prev => ({
            ...prev,
            contactName: touristData.first_name && touristData.last_name 
              ? `${touristData.first_name} ${touristData.last_name}`.trim()
              : profile?.full_name || prev.contactName,
            contactEmail: profile?.email || prev.contactEmail,
            contactPhone: touristData.phone || prev.contactPhone
          }))
        } else {
          // Fallback to profile data if no tourist record exists
          setBookingData(prev => ({
            ...prev,
            contactName: profile?.full_name || prev.contactName,
            contactEmail: profile?.email || prev.contactEmail
          }))
        }
      } catch (error) {
        console.error('Error fetching tourist data:', error)
      }
    }

    fetchTouristData()
  }, [user, profile])

  const steps = [
    { id: 1, title: 'Select Dates & Rooms', icon: Calendar },
    { id: 2, title: 'Room Details', icon: Bed },
    { id: 3, title: 'Your Details', icon: Users },
    { id: 4, title: 'Payment', icon: CreditCard },
    { id: 5, title: 'Confirmation', icon: CheckCircle }
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate(`/service/${service.slug || service.id}`)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setBookingData(prev => ({ ...prev, [field]: value }))
  }

  // Intercept payment method changes so "card" shows a notice and isn't selectable yet
  const handlePaymentMethodChange = (value: string) => {
    // Always set the selected method. The mobile provider dropdown is shown only when paymentMethod === 'mobile'.
    setBookingData(prev => ({ ...prev, paymentMethod: value }))
    if (value === 'card') {
      // Show notice that card payments are not active yet
      setCardNoticeVisible(true)
      setTimeout(() => setCardNoticeVisible(false), 5000)
    } else {
      setCardNoticeVisible(false)
    }
  }

  // Calculate number of nights
  const checkIn = new Date(bookingData.checkInDate)
  const checkOut = new Date(bookingData.checkOutDate)
  const nights = bookingData.checkInDate && bookingData.checkOutDate
    ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const totalPrice = service.price * bookingData.rooms * nights

  const handleSaveToCart = () => {
    addToCart({
      serviceId: service.id,
      service,
      bookingData: {
        ...bookingData,
        date: bookingData.checkInDate, // Use check-in date as main date
        pickupLocation: '',
        dropoffLocation: '',
        returnTrip: false
      },
      category: 'hotels',
      totalPrice,
      currency: service.currency
    })
    setCartSaved(true)
  }

  const handleCompleteBooking = async () => {
    setIsSubmitting(true)
    try {
      const booking = await createBooking({
        service_id: service.id,
        vendor_id: service.vendor_id || service.vendors?.id || '',
        booking_date: new Date().toISOString(),
        service_date: bookingData.checkInDate,
        guests: bookingData.guests,
        total_amount: totalPrice,
        currency: 'UGX',
        status: 'pending',
        payment_status: 'pending',
        special_requests: bookingData.specialRequests,
        // Guest booking fields
        tourist_id: user?.id,
        guest_name: user ? undefined : bookingData.contactName,
        guest_email: user ? undefined : bookingData.contactEmail,
        guest_phone: user ? undefined : bookingData.contactPhone,
        // Hotel-specific fields
        start_time: service.check_in_time,
        end_time: service.check_out_time,
        end_date: bookingData.checkOutDate
      })

      setBookingId(booking.id)
      setCurrentStep(5) // Go to confirmation step
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to complete booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Check-in & Check-out Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingData.checkInDate}
                    onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingData.checkOutDate}
                    onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                    min={bookingData.checkInDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              {nights > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {nights} night{nights > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Guests
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={bookingData.guests}
                  onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
                >
                  {Array.from({ length: service.max_capacity || 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} guest{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rooms
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={bookingData.rooms}
                  onChange={(e) => handleInputChange('rooms', parseInt(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} room{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Hotel Policies</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Check-in: {service.check_in_time || '2:00 PM'}</p>
                <p>• Check-out: {service.check_out_time || '11:00 AM'}</p>
                <p>• Free cancellation up to 24 hours before check-in</p>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Room Type</h3>
            <div className="space-y-4">
              {service.room_types?.map((roomType, index) => (
                <label key={index} className="block">
                  <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    bookingData.roomType === roomType
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="roomType"
                      value={roomType}
                      checked={bookingData.roomType === roomType}
                      onChange={(e) => handleInputChange('roomType', e.target.value)}
                      className="mr-3"
                    />
                    <span className="font-medium">{roomType}</span>
                    <span className="text-gray-600 ml-2">
                      - {formatCurrency(service.price, service.currency)} per night
                    </span>
                  </div>
                </label>
              )) || (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="roomType"
                      value="Standard"
                      checked={bookingData.roomType === 'Standard'}
                      onChange={(e) => handleInputChange('roomType', e.target.value)}
                      className="mr-3"
                    />
                    <span className="font-medium">Standard Room</span>
                    <span className="text-gray-600 ml-2">
                      - {formatCurrency(service.price, service.currency)} per night
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Any special requests for your stay..."
                value={bookingData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Room Amenities</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {service.facilities?.slice(0, 6).map((facility, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    {facility}
                  </div>
                )) || (
                  <>
                    <div className="flex items-center">
                      <Wifi className="w-4 h-4 text-blue-500 mr-2" />
                      Free WiFi
                    </div>
                    <div className="flex items-center">
                      <Car className="w-4 h-4 text-blue-500 mr-2" />
                      Parking
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={bookingData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={bookingData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={bookingData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Hotel: {service.title}</span>
                <span className="font-medium">{formatCurrency(service.price, service.currency)} × {bookingData.rooms} × {nights} nights</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount</span>
                <span>{formatCurrency(totalPrice, service.currency)}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={bookingData.paymentMethod === 'card'}
                    onChange={() => handlePaymentMethodChange('card')}
                    className="mr-2"
                  />
                  Credit/Debit Card
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="mobile"
                    checked={bookingData.paymentMethod === 'mobile'}
                    onChange={() => handlePaymentMethodChange('mobile')}
                    className="mr-2"
                  />
                  Mobile Money
                </label>
                {cardNoticeVisible && (
                  <p className="text-sm text-red-600 mt-2">
                    Credit/Debit Card payments are not active yet. Please select other Methods.
                  </p>
                )}
              </div>
            </div>
            {bookingData.paymentMethod === 'mobile' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  value={bookingData.mobileProvider}
                  onChange={(e) => handleInputChange('mobileProvider', e.target.value)}
                >
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="Airtel">Airtel Money</option>
                </select>
              </div>
            )}
            {bookingData.paymentMethod === 'card' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600 mb-2">
                Your hotel booking has been successfully confirmed. You will receive a confirmation email shortly.
              </p>
              {bookingId && (
                <p className="text-sm text-blue-600 font-medium">
                  Booking Reference: {bookingId}
                </p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Hotel:</span>
                  <span className="font-medium">{service.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Room Type:</span>
                  <span className="font-medium">{bookingData.roomType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in:</span>
                  <span className="font-medium">{bookingData.checkInDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out:</span>
                  <span className="font-medium">{bookingData.checkOutDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rooms:</span>
                  <span className="font-medium">{bookingData.rooms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Paid:</span>
                  <span className="font-medium">{formatCurrency(totalPrice, service.currency)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate(`/category/${service.service_categories.name.toLowerCase().replace(/\s+/g, '-')}`)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Similar Services
              </button>
              <button
                onClick={() => navigate(`/service/${service.slug || service.id}/inquiry`)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Send Inquiry
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Show cart confirmation screen
  if (cartSaved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Saved to Cart!</h3>
            <p className="text-gray-600">
              Your hotel booking has been saved to cart. You can complete the booking later.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-left">
            <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Hotel:</span>
                <span className="font-medium">{service.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Room Type:</span>
                <span className="font-medium">{bookingData.roomType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in:</span>
                <span className="font-medium">{bookingData.checkInDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-out:</span>
                <span className="font-medium">{bookingData.checkOutDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Guests:</span>
                <span className="font-medium">{bookingData.guests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rooms:</span>
                <span className="font-medium">{bookingData.rooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{formatCurrency(totalPrice, service.currency)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(`/category/${service.service_categories.name.toLowerCase().replace(/\s+/g, '-')}`)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Similar Services
            </button>
            <button
              onClick={() => navigate(`/service/${service.slug || service.id}/inquiry`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Send Inquiry
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Service Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start space-x-4">
            <img
              src={service.images[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
              alt={service.title}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{service.title}</h2>
              <p className="text-gray-600 text-sm">{service.location}</p>
              <p className="text-gray-600 text-sm">{service.service_categories.name}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(totalPrice, service.currency)}
              </div>
              <div className="text-sm text-gray-500">
                {nights} night{nights > 1 ? 's' : ''}, {bookingData.rooms} room{bookingData.rooms > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>
            <div className="flex space-x-4">
              <button
                onClick={handleSaveToCart}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Save to Cart
              </button>
              <button
                onClick={currentStep === 4 ? handleCompleteBooking : handleNext}
                disabled={
                  isSubmitting ||
                  (currentStep === 1 && (!bookingData.checkInDate || !bookingData.checkOutDate)) ||
                  (currentStep === 3 && (!bookingData.contactName || !bookingData.contactEmail || !bookingData.contactPhone)) ||
                  (currentStep === 4 && bookingData.paymentMethod === 'card')
                }
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSubmitting ? 'Processing...' : (currentStep === 4 ? 'Complete Booking' : 'Next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}