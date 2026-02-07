import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, CreditCard, CheckCircle } from 'lucide-react'
// using local formatCurrencyWithConversion helper (based on user preferences defined in this file)
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { createBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'

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
  vendor_id?: string
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
}

interface ActivityBookingProps {
  service: ServiceDetail
}

export default function ActivityBooking({ service }: ActivityBookingProps) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user, profile } = useAuth()
  const { selectedCurrency } = usePreferences()
  const [currentStep, setCurrentStep] = useState(1)
  const [cartSaved, setCartSaved] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
  const [bookingData, setBookingData] = useState({
    date: '',
    guests: 1,
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentMethod: 'card',
    mobileProvider: ''
  })

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
    { id: 1, title: 'Select Date & Guests', icon: Calendar },
    { id: 2, title: 'Your Details', icon: Users },
    { id: 3, title: 'Payment', icon: CreditCard },
    { id: 4, title: 'Processing', icon: CheckCircle },
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
  const [cardNoticeVisible, setCardNoticeVisible] = useState(false)
  const handlePaymentMethodChange = (value: string) => {
    // Always set selected payment method. The mobile provider dropdown appears only when paymentMethod === 'mobile'.
    setBookingData(prev => ({ ...prev, paymentMethod: value }))
    if (value === 'card') {
      setCardNoticeVisible(true)
      setTimeout(() => setCardNoticeVisible(false), 5000)
    } else {
      setCardNoticeVisible(false)
    }
  }

  const totalPrice = service.price * bookingData.guests

  const handleCompleteBooking = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const booking = await createBooking({
        service_id: service.id,
        vendor_id: service.vendor_id || service.vendors?.id || '',
        booking_date: new Date().toISOString(),
        service_date: bookingData.date,
        guests: bookingData.guests,
        total_amount: totalPrice,
        currency: service.currency,
        status: 'pending',
        payment_status: 'pending',
        special_requests: bookingData.specialRequests,
        // Guest booking fields
        tourist_id: user?.id,
        guest_name: user ? undefined : bookingData.contactName,
        guest_email: user ? undefined : bookingData.contactEmail,
        guest_phone: user ? undefined : bookingData.contactPhone
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

  const handleSaveToCart = () => {
    addToCart({
      serviceId: service.id,
      service,
      bookingData: {
        ...bookingData,
        checkInDate: '',
        checkOutDate: '',
        rooms: 1,
        roomType: '',
        pickupLocation: '',
        dropoffLocation: '',
        returnTrip: false
      },
      category: 'activities',
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Date & Number of Guests</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    value={bookingData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Participants
                  </label>
                  <select
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    value={bookingData.guests}
                    onChange={(e) => handleInputChange('guests', parseInt(e.target.value))}
                  >
                    {Array.from({ length: service.max_capacity || 10 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} participant{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Any special requirements or requests..."
                value={bookingData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
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
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  value={bookingData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
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
                <span className="text-gray-600">Activity: {service.title}</span>
                <span className="font-medium">{formatCurrencyWithConversion(service.price, service.currency)} × {bookingData.guests}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount</span>
                <span>{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
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
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
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
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
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
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-spin">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Your Booking</h3>
              <p className="text-gray-600">
                Please wait while we process your activity booking...
              </p>
            </div>
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
              <p className="text-gray-600">
                Your activity booking has been successfully confirmed. You will receive a confirmation email shortly.
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-medium">#{bookingId?.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Activity:</span>
                  <span className="font-medium">{service.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{bookingData.date || 'TBD'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Participants:</span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-medium">{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center">
              <button
                onClick={() => navigate(`/category/${service.service_categories.name.toLowerCase().replace(/\s+/g, '-')}`)}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Similar Services
              </button>
              <button
                onClick={() => navigate(`/service/${service.slug || service.id}/inquiry`)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Send Inquiry
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
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
              Your activity booking has been saved to cart. You can complete the booking later.
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-left">
            <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Activity:</span>
                <span className="font-medium">{service.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{bookingData.date || 'TBD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Participants:</span>
                <span className="font-medium">{bookingData.guests}</span>
              </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = step.id < currentStep

              return (
                <div key={step.id} className="flex items-center mb-4 sm:mb-0">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`ml-3 text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block w-12 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Service Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4 space-y-4 sm:space-y-0">
            <img
              src={service.images[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
              alt={service.title}
              className="w-full sm:w-20 h-48 sm:h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{service.title}</h2>
              <p className="text-gray-600 text-sm">{service.location}</p>
              <p className="text-gray-600 text-sm">{service.service_categories.name}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrencyWithConversion(totalPrice, service.currency)}
              </div>
              <div className="text-sm text-gray-500">for {bookingData.guests} participant{bookingData.guests > 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="mt-6 space-y-4 sm:space-y-0 sm:flex sm:justify-between">
            <button
              onClick={handleBack}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleSaveToCart}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors order-2 sm:order-1"
              >
                Save to Cart
              </button>
              <button
                onClick={currentStep === 3 ? handleCompleteBooking : handleNext}
                disabled={
                  isSubmitting ||
                  (currentStep === 1 && !bookingData.date) ||
                  (currentStep === 2 && (!bookingData.contactName || !bookingData.contactEmail || !bookingData.contactPhone))
                  || (currentStep === 3 && bookingData.paymentMethod === 'card')
                }
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors order-1 sm:order-2"
              >
                {isSubmitting ? 'Processing...' : currentStep === 3 ? 'Complete Booking' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}