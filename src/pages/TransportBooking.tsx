import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Users, CreditCard, CheckCircle, Car, XCircle } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { createBooking as createVendorBooking } from '../store/vendorStore'
import { createBooking as createDatabaseBooking } from '../lib/database'
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
  const location = useLocation()
  
  console.log('TransportBooking - service:', service)
  console.log('TransportBooking - service.vendor_id:', service.vendor_id)
  
  const { addToCart } = useCart()
  const { user, profile } = useAuth()
  const { selectedCurrency } = usePreferences()

  // Currency conversion rates (simplified)
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    const rates: { [key: string]: { [key: string]: number } } = {
      'UGX': { 'USD': 0.00027, 'EUR': 0.00025, 'GBP': 0.00021, 'ZAR': 0.005, 'KES': 0.027, 'TZS': 0.62, 'BRL': 0.0013, 'MXN': 0.0054, 'EGP': 0.0084, 'MAD': 0.0025, 'TRY': 0.0089, 'THB': 0.0095, 'KRW': 0.35, 'RUB': 0.025 },
      'USD': { 'UGX': 3700, 'EUR': 0.92, 'GBP': 0.79, 'ZAR': 18.5, 'KES': 100, 'TZS': 2300, 'BRL': 4.8, 'MXN': 20, 'EGP': 31, 'MAD': 9.2, 'TRY': 33, 'THB': 35, 'KRW': 1300, 'RUB': 92 },
      'EUR': { 'UGX': 4000, 'USD': 1.09, 'GBP': 0.86, 'ZAR': 20.1, 'KES': 109, 'TZS': 2500, 'BRL': 5.2, 'MXN': 21.8, 'EGP': 33.8, 'MAD': 10, 'TRY': 36, 'THB': 38, 'KRW': 1410, 'RUB': 100 },
      'GBP': { 'UGX': 4700, 'USD': 1.27, 'EUR': 1.16, 'ZAR': 23.4, 'KES': 127, 'TZS': 2900, 'BRL': 6.1, 'MXN': 25.5, 'EGP': 39.5, 'MAD': 11.7, 'TRY': 42, 'THB': 44.5, 'KRW': 1650, 'RUB': 117 },
      'ZAR': { 'UGX': 200, 'USD': 0.054, 'EUR': 0.050, 'GBP': 0.043, 'KES': 5.4, 'TZS': 124, 'BRL': 0.26, 'MXN': 1.08, 'EGP': 1.68, 'MAD': 0.50, 'TRY': 1.79, 'THB': 1.89, 'KRW': 70, 'RUB': 5.0 },
      'KES': { 'UGX': 37, 'USD': 0.01, 'EUR': 0.0092, 'GBP': 0.0079, 'ZAR': 0.185, 'TZS': 23, 'BRL': 0.048, 'MXN': 0.20, 'EGP': 0.31, 'MAD': 0.092, 'TRY': 0.33, 'THB': 0.35, 'KRW': 13, 'RUB': 0.92 },
      'TZS': { 'UGX': 1.61, 'USD': 0.00043, 'EUR': 0.0004, 'GBP': 0.00034, 'ZAR': 0.008, 'KES': 0.043, 'BRL': 0.0021, 'MXN': 0.0087, 'EGP': 0.0135, 'MAD': 0.004, 'TRY': 0.0143, 'THB': 0.0152, 'KRW': 0.565, 'RUB': 0.04 },
      'BRL': { 'UGX': 770, 'USD': 0.208, 'EUR': 0.192, 'GBP': 0.164, 'ZAR': 3.85, 'KES': 20.8, 'TZS': 476, 'MXN': 4.17, 'EGP': 6.46, 'MAD': 1.92, 'TRY': 6.88, 'THB': 7.29, 'KRW': 271, 'RUB': 19.2 },
      'MXN': { 'UGX': 185, 'USD': 0.05, 'EUR': 0.046, 'GBP': 0.039, 'ZAR': 0.926, 'KES': 5.0, 'TZS': 115, 'BRL': 0.24, 'EGP': 1.55, 'MAD': 0.46, 'TRY': 1.65, 'THB': 1.75, 'KRW': 65, 'RUB': 4.6 },
      'EGP': { 'UGX': 119, 'USD': 0.032, 'EUR': 0.030, 'GBP': 0.025, 'ZAR': 0.595, 'KES': 3.22, 'TZS': 74, 'BRL': 0.155, 'MXN': 0.645, 'MAD': 0.296, 'TRY': 1.06, 'THB': 1.13, 'KRW': 42, 'RUB': 2.96 },
      'MAD': { 'UGX': 400, 'USD': 0.109, 'EUR': 0.10, 'GBP': 0.085, 'ZAR': 2.0, 'KES': 10.9, 'TZS': 250, 'BRL': 0.52, 'MXN': 2.17, 'EGP': 3.38, 'TRY': 3.59, 'THB': 3.81, 'KRW': 142, 'RUB': 10.0 },
      'TRY': { 'UGX': 112, 'USD': 0.030, 'EUR': 0.028, 'GBP': 0.024, 'ZAR': 0.559, 'KES': 3.03, 'TZS': 70, 'BRL': 0.145, 'MXN': 0.606, 'EGP': 0.94, 'MAD': 0.279, 'THB': 0.296, 'KRW': 11, 'RUB': 0.78 },
      'THB': { 'UGX': 105, 'USD': 0.028, 'EUR': 0.026, 'GBP': 0.022, 'ZAR': 0.529, 'KES': 2.86, 'TZS': 66, 'BRL': 0.137, 'MXN': 0.571, 'EGP': 0.885, 'MAD': 0.262, 'TRY': 3.38, 'KRW': 10.5, 'RUB': 0.74 },
      'KRW': { 'UGX': 2.85, 'USD': 0.00077, 'EUR': 0.00071, 'GBP': 0.00061, 'ZAR': 0.0143, 'KES': 0.077, 'TZS': 1.77, 'BRL': 0.0037, 'MXN': 0.0154, 'EGP': 0.0238, 'MAD': 0.007, 'TRY': 0.090, 'THB': 0.095, 'RUB': 0.0067 },
      'RUB': { 'UGX': 40, 'USD': 0.011, 'EUR': 0.01, 'GBP': 0.0085, 'ZAR': 0.20, 'KES': 1.09, 'TZS': 25, 'BRL': 0.052, 'MXN': 0.217, 'EGP': 0.337, 'MAD': 0.10, 'TRY': 1.28, 'THB': 1.35, 'KRW': 50 }
    };

    if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
      return amount * rates[fromCurrency][toCurrency];
    }
    return amount;
  }

  const formatAmount = (amount: number, currency: string): string => {
    const validCurrencies = ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF', 'ZAR', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'JPY', 'CNY', 'INR', 'BRL', 'MXN', 'ARS', 'CLP', 'PEN', 'COP', 'EGP', 'MAD', 'TRY', 'THB', 'KRW', 'RUB'];
    const safeCurrency = validCurrencies.includes(currency) ? currency : 'UGX';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0
    }).format(amount);
  }

  // Create a formatCurrency function that uses user preferences
  const formatCurrencyWithConversion = (amount: number, serviceCurrency: string) => {
    try {
      const userCurrency = selectedCurrency || 'UGX';
      if (userCurrency === serviceCurrency) {
        return formatAmount(amount, userCurrency);
      }
      const convertedAmount = convertCurrency(amount, serviceCurrency, userCurrency);
      return formatAmount(convertedAmount, userCurrency);
    } catch (error) {
      console.warn('Currency conversion failed, using original currency:', error);
      return formatAmount(amount, serviceCurrency);
    }
  }

  const [currentStep, setCurrentStep] = useState(1)
  // Removed unused cartSaved state
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [selectedImage, setSelectedImage] = useState('')
  const [bookingData, setBookingData] = useState({
    date: '', // No longer pre-filled from URL params
    pickupLocation: service.pickup_locations?.[0] || '',
    dropoffLocation: service.dropoff_locations?.[0] || '',
    passengers: 1,
    returnTrip: false,
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  paymentMethod: 'mobile',
    mobileProvider: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    driverOption: service.driver_included ? 'with-driver' : 'self-drive'
  })

  // UI state for card-not-active notice
  const [cardNoticeVisible, setCardNoticeVisible] = useState(false)

  // Pre-fill dates from navigation state if available
  useEffect(() => {
    if (location.state) {
      const { startDate, endDate, selectedDate } = location.state as any
      if (startDate && endDate) {
        setBookingData(prev => ({
          ...prev,
          startDate,
          endDate
        }))
      } else if (selectedDate) {
        setBookingData(prev => ({
          ...prev,
          date: selectedDate
        }))
      }
    }
  }, [location.state])

  useEffect(() => {
    if (service?.images && service.images.length > 0) {
      setSelectedImage(service.images[0])
    }
  }, [service])

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
        setBookingError(null)
        // Prepare booking data for localStorage (vendor panel)
        const bookingDataToSave = {
          service_id: service.id,
          vendor_id: service.vendor_id || 'vendor_demo',
          booking_date: new Date().toISOString(),
          service_date: bookingData.startDate,
          guests: bookingData.passengers,
          total_amount: totalPrice,
          currency: service.currency,
          status: 'confirmed' as const,
          payment_status: 'paid' as const, // keep vendor demo as paid
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
        // Save to vendor localStorage for demo panel
        createVendorBooking(service.vendor_id || 'vendor_demo', bookingDataToSave)

        // Prepare booking data for Supabase (admin/vendor visibility)
        console.log('TransportBooking: Creating booking with user:', user)
        console.log('TransportBooking: User ID:', user?.id)
        const bookingDataToInsert = {
          service_id: service.id,
          tourist_id: user?.id,
          vendor_id: service.vendor_id || 'vendor_demo',
          booking_date: new Date().toISOString(),
          service_date: bookingData.startDate,
          guests: bookingData.passengers,
          total_amount: totalPrice,
          currency: service.currency,
          status: 'confirmed' as const,
          payment_status: 'pending' as const, // always pending for admin
          special_requests: bookingData.specialRequests,
          // Guest booking fields
          guest_name: profile ? undefined : bookingData.contactName,
          guest_email: profile ? undefined : bookingData.contactEmail,
          guest_phone: profile ? undefined : bookingData.contactPhone,
          // Transport-specific fields
          pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
          dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
          driver_option: bookingData.driverOption,
          return_trip: bookingData.returnTrip,
          start_time: bookingData.startTime,
          end_time: bookingData.endTime,
          end_date: bookingData.endDate
        }
        try {
          const result = await createDatabaseBooking(bookingDataToInsert)
          if (result && result.id) {
            setBookingConfirmed(true)
            setCurrentStep(currentStep + 1)
          } else {
            setBookingError('Booking could not be confirmed. Please try again.')
          }
        } catch (error: any) {
          setBookingError(error?.message || 'Booking could not be confirmed. Please try again.')
        }
        return // Only advance step if booking is successful
      }
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

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setBookingData(prev => ({ ...prev, [field]: value }))
  }

  // Intercept payment method changes so "card" shows a notice and isn't selectable yet
  const handlePaymentMethodChange = (value: string) => {
    // Always set the selected method. The provider dropdown is shown only when paymentMethod === 'mobile'.
    setBookingData(prev => ({ ...prev, paymentMethod: value }))
    if (value === 'card') {
      // Show notice that card payments are not active yet
      setCardNoticeVisible(true)
      setTimeout(() => setCardNoticeVisible(false), 5000)
    } else {
      setCardNoticeVisible(false)
    }
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
  // setCartSaved removed (no longer needed)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transportation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Pick-up Date & Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      value={bookingData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      value={bookingData.startTime || '09:00'}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Drop-off Date & Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      value={bookingData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="time"
                      className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      value={bookingData.endTime || '17:00'}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Passengers
                  </label>
                  <select
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    value={bookingData.passengers}
                    onChange={(e) => handleInputChange('passengers', parseInt(e.target.value))}
                  >
                    {Array.from({ length: service.max_capacity || 10 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} passenger{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Driver Option
                  </label>
                  <select
                    className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
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
                  {service.driver_included === false && bookingData.driverOption === 'with-driver' && (
                    <p className="text-xs text-amber-600 mt-1">
                      Additional 30% charge for driver service
                    </p>
                  )}
                  {service.driver_included === false && bookingData.driverOption === 'self-drive' && (
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
                <span className="text-sm font-medium text-gray-700">Return trip (+{formatCurrencyWithConversion(service.price, service.currency)})</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  value={bookingData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  value={bookingData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
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
                <span className="font-medium">{formatCurrencyWithConversion(basePrice, service.currency)}</span>
              </div>
              {driverCost > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Driver service (30% extra)</span>
                  <span className="font-medium">{formatCurrencyWithConversion(driverCost, service.currency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total Amount</span>
                <span>{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={bookingData.mobileProvider}
                  onChange={(e) => handleInputChange('mobileProvider', e.target.value)}
                >
                  <option value="" disabled>Select Provider</option>
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
                  <span className="font-medium">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
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

  // Show booking confirmation screen only if booking is confirmed in Supabase
  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center space-y-6">
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
                <span className="font-medium">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
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

  // Show error if booking failed
  if (bookingError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Booking Failed</h3>
            <p className="text-gray-600">{bookingError}</p>
          </div>
          <button
            onClick={() => setCurrentStep(1)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
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

      {/* Progress Steps - Sticky */}
      <div className="bg-white shadow-sm sticky top-16 z-20 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between w-full flex-nowrap">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep

              return (
                <div key={step.id} className="flex items-center flex-none">
                  <div className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  </div>
                  <span className={`ml-0.5 md:ml-1 text-[10px] md:text-xs font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.id === 1 ? 'Trip' : step.id === 2 ? 'Details' : step.id === 3 ? 'Payment' : 'Confirmation'}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`${isCompleted ? 'bg-green-600' : 'bg-gray-200'} w-2 md:w-3 h-0.5 mx-0.5 md:mx-1`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* Service Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
            {/* Image with Navigation */}
            <div className="relative flex-shrink-0 w-full md:w-auto">
              <img
                src={selectedImage || service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
                alt={service.title}
                className="w-full md:max-w-xs lg:max-w-sm xl:max-w-md h-48 md:h-64 lg:h-80 object-cover rounded-lg shadow-lg border-2 border-gray-200"
              />
              {service.images && service.images.length > 1 && (
                <>
                  {/* Navigation Arrows - Larger touch targets on mobile */}
                  <button
                    onClick={prevImage}
                    className="absolute left-2 md:left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 md:p-2 rounded-full hover:bg-opacity-75 transition-all touch-manipulation"
                  >
                    <ArrowLeft className="h-5 w-5 md:h-4 md:w-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 md:right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 md:p-2 rounded-full hover:bg-opacity-75 transition-all touch-manipulation"
                  >
                    <ArrowLeft className="h-5 w-5 md:h-4 md:w-4 rotate-180" />
                  </button>
                  {/* Image Counter */}
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 md:px-2 md:py-1 rounded-full text-sm md:text-xs">
                    {currentImageIndex + 1} / {service.images.length}
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 w-full md:w-auto">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">{service.title}</h2>
              <p className="text-gray-600 text-sm mb-1">{service.location}</p>
              <p className="text-gray-600 text-sm mb-3">{service.service_categories.name}</p>
              
              {/* Mobile: Show key details */}
              <div className="block md:hidden space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">Duration:</span>
                  <span className="font-medium text-sm">{calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 text-sm">Passengers:</span>
                  <span className="font-medium text-sm">{bookingData.passengers}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Driver:</span>
                  <span className="font-medium text-sm">{bookingData.driverOption === 'with-driver' ? 'Included' : 'Self-drive'}</span>
                </div>
              </div>
            </div>
            <div className="text-right w-full md:w-auto md:text-right">
              <div className="text-xl md:text-lg font-bold text-gray-900 mb-1">
                {formatCurrencyWithConversion(totalPrice, service.currency)}
              </div>
              <div className="text-sm text-gray-500">
                {bookingData.returnTrip ? 'Return trip' : 'One way'}
              </div>
              
              {/* Desktop: Show additional details */}
              <div className="hidden md:block mt-2 space-y-1">
                <div className="text-xs text-gray-500">
                  {calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days
                </div>
                <div className="text-xs text-gray-500">
                  {bookingData.passengers} passengers
                </div>
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
          <div className="mt-6">
            {/* Mobile: Horizontal layout with smaller buttons */}
            <div className="flex md:hidden justify-between gap-2">
              <button
                onClick={handleBack}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={handleSaveToCart}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Save Cart
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
                  || (currentStep === 3 && bookingData.paymentMethod === 'card')
                }
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
              >
                {currentStep === 3 ? 'Complete' : 'Next'}
              </button>
            </div>

            {/* Desktop: Horizontal layout */}
            <div className="hidden md:flex justify-between">
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
                    || (currentStep === 3 && bookingData.paymentMethod === 'card')
                  }
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {currentStep === 3 ? 'Complete Booking' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}