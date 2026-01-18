import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Users, CreditCard, CheckCircle, Car } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { createBooking as createVendorBooking } from '../store/vendorStore'
import { createBooking as createDatabaseBooking } from '../lib/database'

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

interface TransportBookingProps {
  service: ServiceDetail
}

export default function TransportBooking({ service }: TransportBookingProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  console.log('TransportBooking - service:', service)
  console.log('TransportBooking - service.vendor_id:', service.vendor_id)
  
  // Get date parameters from URL
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  
  const { addToCart } = useCart()
  const { profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [cartSaved, setCartSaved] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState('')
  const [bookingData, setBookingData] = useState({
    date: startDate, // Use startDate as the main date field
    pickupLocation: service.pickup_locations?.[0] || '',
    dropoffLocation: service.dropoff_locations?.[0] || '',
    passengers: 1,
    returnTrip: false,
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentMethod: 'card',
    startDate: startDate,
    endDate: endDate,
    startTime: '09:00',
    endTime: '17:00',
    driverOption: service.driver_included ? 'with-driver' : 'self-drive'
  })

  useEffect(() => {
    if (service?.images && service.images.length > 0) {
      setSelectedImage(service.images[0])
    }
  }, [service])

  const nextImage = () => {
    if (service?.images && service.images.length > 0) {
      const nextIndex = (currentImageIndex + 1) % service.images.length
      setCurrentImageIndex(nextIndex)
      setSelectedImage(service.images[nextIndex])
    }
  }

  const prevImage = () => {
    if (service?.images && service.images.length > 0) {
      const prevIndex = currentImageIndex === 0 ? service.images.length - 1 : currentImageIndex - 1
      setCurrentImageIndex(prevIndex)
      setSelectedImage(service.images[prevIndex])
    }
  }

  const steps = [
    { id: 1, title: 'Trip Details', icon: Car },
    { id: 2, title: 'Your Details', icon: Users },
    { id: 3, title: 'Payment', icon: CreditCard },
    { id: 4, title: 'Confirmation', icon: CheckCircle }
  ]

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        // Validate trip details
        if (!bookingData.startDate || !bookingData.endDate) {
          alert('Please select both start and end dates.')
          return false
        }
        if (bookingData.driverOption === 'with-driver') {
          if (!bookingData.pickupLocation || !bookingData.dropoffLocation) {
            alert('Please enter both pickup and drop-off locations when booking with driver.')
            return false
          }
        }
        if (bookingData.passengers < 1 || bookingData.passengers > (service.vehicle_capacity || service.max_capacity)) {
          alert(`Number of passengers must be between 1 and ${service.vehicle_capacity || service.max_capacity}.`)
          return false
        }
        break
      case 2:
        // Validate contact details
        if (!bookingData.contactName.trim()) {
          alert('Please enter your full name.')
          return false
        }
        if (!bookingData.contactEmail.trim() || !bookingData.contactEmail.includes('@')) {
          alert('Please enter a valid email address.')
          return false
        }
        if (!bookingData.contactPhone.trim()) {
          alert('Please enter your phone number.')
          return false
        }
        break
      default:
        break
    }
    return true
  }

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // Validate current step before proceeding
      if (!validateCurrentStep()) {
        return
      }
      
      // If completing booking (step 3), create the actual booking
      if (currentStep === 3) {
        const bookingDataToSave = {
          service_id: service.id,
          vendor_id: service.vendor_id || 'vendor_demo',
          booking_date: new Date().toISOString(),
          service_date: bookingData.startDate,
          guests: bookingData.passengers,
          total_amount: totalPrice,
          currency: service.currency,
          status: 'confirmed' as const,
          special_requests: bookingData.specialRequests,
          // Add transport-specific data
          pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
          dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
          driver_option: bookingData.driverOption,
          return_trip: bookingData.returnTrip,
          start_time: bookingData.startTime,
          end_time: bookingData.endTime,
          end_date: bookingData.endDate
        }
        
        // Create the booking for the vendor (localStorage)
        createVendorBooking(service.vendor_id || 'vendor_demo', bookingDataToSave)
        
        // Also create the booking in the database for admin visibility
        try {
          const bookingDataToInsert = {
            service_id: service.id,
            tourist_id: profile?.id || 't_demo', // Use authenticated user's profile ID
            vendor_id: service.vendor_id || 'vendor_demo',
            booking_date: new Date().toISOString(),
            service_date: bookingData.startDate,
            guests: bookingData.passengers,
            total_amount: totalPrice,
            currency: service.currency,
            status: 'pending' as const,
            payment_status: 'pending' as const,
            special_requests: bookingData.specialRequests,
            // Transport-specific fields
            pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
            dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
            driver_option: bookingData.driverOption,
            return_trip: bookingData.returnTrip,
            start_time: bookingData.startTime,
            end_time: bookingData.endTime,
            end_date: bookingData.endDate
          }
          console.log('Creating database booking with vendor_id:', bookingDataToInsert.vendor_id)
          console.log('Service vendor_id:', service.vendor_id)
          const result = await createDatabaseBooking(bookingDataToInsert)
          console.log('Database booking created successfully:', result)
        } catch (error) {
          console.error('Failed to save booking to database:', error)
          // Continue with the process even if database save fails
        }
      }
      
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate(`/service/${service.id}`)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setBookingData(prev => ({ ...prev, [field]: value }))
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

  const totalPrice = (() => {
    const basePrice = service.price * calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
    const driverCost = (bookingData.driverOption === 'with-driver' && !service.driver_included) ? basePrice * 0.3 : 0 // 30% extra for driver only if not already included
    return basePrice + driverCost
  })()

  const basePrice = service.price * calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
  const driverCost = (bookingData.driverOption === 'with-driver' && !service.driver_included) ? basePrice * 0.3 : 0

  const handleSaveToCart = () => {
    addToCart({
      serviceId: service.id,
      service,
      bookingData: {
        ...bookingData,
        guests: bookingData.passengers, // Map passengers to guests
        checkInDate: bookingData.startDate,
        checkOutDate: bookingData.endDate,
        rooms: 1,
        roomType: '',
        date: bookingData.startDate // Keep date for compatibility
      },
      category: 'transport',
      totalPrice,
      currency: service.currency
    })
    setCartSaved(true)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transportation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pick-up Date & Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={bookingData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={bookingData.startTime || '09:00'}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drop-off Date & Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={bookingData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={bookingData.endTime || '17:00'}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Passengers
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingData.passengers}
                    onChange={(e) => handleInputChange('passengers', parseInt(e.target.value))}
                  >
                    {Array.from({ length: service.max_capacity || 10 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} passenger{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driver Option
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingData.driverOption || (service.driver_included ? 'with-driver' : 'self-drive')}
                    onChange={(e) => handleInputChange('driverOption', e.target.value)}
                  >
                    {!service.driver_included && (
                      <option value="self-drive">Self-drive</option>
                    )}
                    <option value="with-driver">
                      {service.driver_included ? 'With driver (included)' : 'With driver (+30% extra cost)'}
                    </option>
                  </select>
                  {service.driver_included === false && (
                    <p className="text-xs text-gray-500 mt-1">Self-drive available</p>
                  )}
                  {service.driver_included === true && (
                    <p className="text-xs text-amber-600 mt-1">Driver included in base price</p>
                  )}
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Fuel Policy</h4>
                    {service.fuel_included ? (
                      <p className="text-xs text-blue-700">Fuel is included in your rental - no extra charges for fuel.</p>
                    ) : (
                      <div className="text-xs text-blue-700">
                        {bookingData.driverOption === 'self-drive' ? (
                          <p>Fuel costs are your responsibility. You'll be charged for fuel used during your rental.</p>
                        ) : (
                          <p>Fuel costs are your responsibility. The driver will coordinate fuel stops during your trip.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {bookingData.driverOption === 'with-driver' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Location *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingData.pickupLocation}
                    onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                    placeholder="Enter pickup location"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drop-off Location *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingData.dropoffLocation}
                    onChange={(e) => handleInputChange('dropoffLocation', e.target.value)}
                    placeholder="Enter drop-off location"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={bookingData.returnTrip}
                  onChange={(e) => handleInputChange('returnTrip', e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">Return trip (+{formatCurrency(service.price, service.currency)})</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Any special requirements for your transportation..."
                value={bookingData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Vehicle Information</h4>
              <div className="text-sm text-blue-800">
                <p>• Vehicle: {service.vehicle_type || 'Standard vehicle'}</p>
                <p>• Capacity: {service.vehicle_capacity ? `Up to ${service.vehicle_capacity} passengers` : service.max_capacity ? `Up to ${service.max_capacity} passengers` : 'Capacity not specified'}</p>
                <p>• Daily rental service</p>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
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

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Transportation: {service.title} ({calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days)</span>
                <span className="font-medium">{formatCurrency(basePrice, service.currency)}</span>
              </div>
              {driverCost > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Driver service (30% extra)</span>
                  <span className="font-medium">{formatCurrency(driverCost, service.currency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total Amount</span>
                <span>{formatCurrency(totalPrice, service.currency)}</span>
              </div>
            </div>
            
            {/* Fuel Responsibility Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-900 mb-2">Fuel Policy</h4>
              {service.fuel_included ? (
                <p className="text-sm text-amber-800">
                  Fuel costs are included in your booking. No additional fuel charges will apply.
                </p>
              ) : (
                <div className="text-sm text-amber-800">
                  {bookingData.driverOption === 'self-drive' ? (
                    <div>
                      <p className="font-medium mb-1">Fuel costs are your responsibility</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>You'll be charged for fuel used during your rental</li>
                        <li>Fuel costs will be calculated at current market rates</li>
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium mb-1">Fuel costs are your responsibility</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>The driver will coordinate fuel stops during your trip</li>
                        <li>You'll be responsible for all fuel costs incurred</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
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
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="mr-2"
                  />
                  Mobile Money
                </label>
              </div>
            </div>
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

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600">
                Your transportation booking has been successfully confirmed. You will receive a confirmation email shortly.
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{service.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{bookingData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup:</span>
                  <span className="font-medium">{bookingData.pickupLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Drop-off:</span>
                  <span className="font-medium">{bookingData.dropoffLocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Passengers:</span>
                  <span className="font-medium">{bookingData.passengers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Trip:</span>
                  <span className="font-medium">{bookingData.returnTrip ? 'Yes' : 'No'}</span>
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
                onClick={() => navigate(`/service/${service.id}/inquiry`)}
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
              Your transportation booking has been saved to cart. You can complete the booking later.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-left">
            <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-medium">{service.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{bookingData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pickup:</span>
                <span className="font-medium">{bookingData.pickupLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Drop-off:</span>
                <span className="font-medium">{bookingData.dropoffLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Passengers:</span>
                <span className="font-medium">{bookingData.passengers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Return Trip:</span>
                <span className="font-medium">{bookingData.returnTrip ? 'Yes' : 'No'}</span>
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
              onClick={() => navigate(`/service/${service.id}/inquiry`)}
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
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Image with Navigation */}
            <div className="relative flex-shrink-0">
              <img
                src={selectedImage || service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
                alt={service.title}
                className="w-full max-w-xs md:max-w-sm lg:max-w-md h-64 md:h-80 object-cover rounded-lg shadow-lg border-2 border-gray-200"
              />
              {service.images && service.images.length > 1 && (
                <>
                  {/* Navigation Arrows */}
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>
                  {/* Image Counter */}
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
                    {currentImageIndex + 1} / {service.images.length}
                  </div>
                </>
              )}
            </div>
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
                {bookingData.returnTrip ? 'Return trip' : 'One way'}
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStep < 4 && (
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
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && (
                    !bookingData.startDate || 
                    !bookingData.endDate || 
                    (bookingData.driverOption === 'with-driver' && (!bookingData.pickupLocation || !bookingData.dropoffLocation))
                  )) ||
                  (currentStep === 2 && (!bookingData.contactName || !bookingData.contactEmail || !bookingData.contactPhone))
                }
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {currentStep === 3 ? 'Complete Booking' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}