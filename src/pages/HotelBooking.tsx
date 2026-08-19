import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Calendar, CheckCircle, Bed } from 'lucide-react'
import { useDisplayPrice } from '../hooks/useDisplayPrice'
import SettlementChargeNote from '../components/SettlementChargeNote'
import { fetchVendorBlockedDates } from '../lib/blockedDates'
import { BookingFormBanner, FieldError } from '../components/booking/BookingFormFeedback'
import {
  type FieldErrors,
  applyFieldErrors,
  clearFieldError,
  fieldInputClass,
  isValidEmail,
} from '../lib/bookingFormValidation'
import { COUNTRIES } from '../lib/countries'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { createBooking } from '../lib/database'
import {
  calculatePaymentForAmount,
  customerTotalFromUnitPricingCalc,
  touristFeeTotalFromUnitCalc,
  type PaymentCalculation
} from '../lib/pricingService'
import { supabase } from '../lib/supabaseClient'
import { cancelBookingOnPaymentFailure } from '../services/BookingService'
import { useMarzpayCollect } from '../hooks/useMarzpayCollect'
import MarzpayPaymentFields from '../components/payment/MarzpayPaymentFields'
import { getMarzpayMobileValidationErrors, isMobileUiMethod, type MarzpayPaymentFieldsValue } from '../lib/marzpayApi'

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
  const location = useLocation()
  const { user, profile } = useAuth()
  const { formatPrice } = useDisplayPrice()
  const { t } = usePreferences()
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentFields, setPaymentFields] = useState<MarzpayPaymentFieldsValue>({ method: 'mobile', phone: '', provider: '' })
  const finaliseInFlightRef = useRef(false)
  const pendingRef = useRef<any>(null)

  const {
    pay,
    processing: isSubmitting,
    pollingMessage,
    setPollingMessage,
    error: paymentError,
    setError: setPaymentError,
  } = useMarzpayCollect({
    channelPrefix: 'payment_htl',
    onCompleted: () => {
      if (finaliseInFlightRef.current || !pendingRef.current) return
      void finaliseHotelBooking('paid', pendingRef.current)
    },
    onFailed: () => {
      if (pendingRef.current?.id) cancelBookingOnPaymentFailure(pendingRef.current.id).catch(console.error)
    },
  })

  const [bookingData, setBookingData] = useState(() => {
    // Initialize with default dates (today and tomorrow)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return {
      checkInDate: today.toISOString().split('T')[0],
      checkOutDate: tomorrow.toISOString().split('T')[0],
      guests: 1,
      rooms: 1,
      roomType: service.room_types?.[0] || 'Standard',
      specialRequests: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      countryCode: '+256',
    }
  })
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())
  const [blockedError, setBlockedError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formBanner, setFormBanner] = useState<string | null>(null)

  // Country search state
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const [hotelPricingCalc, setHotelPricingCalc] = useState<PaymentCalculation | null>(null)

  // Pre-fill form data from navigation state
  useEffect(() => {
    if (location.state) {
      const { checkInDate, checkOutDate, guests, rooms } = location.state as any
      if (checkInDate || checkOutDate || guests || rooms) {
        setBookingData(prev => ({
          ...prev,
          checkInDate: checkInDate || prev.checkInDate,
          checkOutDate: checkOutDate || prev.checkOutDate,
          guests: guests || prev.guests,
          rooms: rooms || prev.rooms
        }))
      }
    }
  }, [location.state])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const blocked = await fetchVendorBlockedDates(supabase, service.vendor_id)
        if (!mounted) return
        setBlockedDates(blocked)
      } catch (err) {
        console.error('Error loading blocked dates for hotel booking:', err)
      }
    })()
    return () => { mounted = false }
  }, [service.vendor_id])
  

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

  // Filter countries based on search
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  )

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownOpen && !(event.target as Element).closest('.country-dropdown')) {
        setCountryDropdownOpen(false)
        setCountrySearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [countryDropdownOpen])

  const steps = [
    { id: 1, title: 'Select Dates & Rooms', icon: Calendar },
    { id: 2, title: 'Booking Details', icon: Bed },
    { id: 3, title: 'Confirmation', icon: CheckCircle }
  ]

  const contactReady = Boolean(bookingData.contactName?.trim() && bookingData.contactEmail?.trim())
  const loggedInReady = Boolean(user && contactReady)

  const validateStep = (step: number): boolean => {
    const errs: FieldErrors = {}
    if (step === 1) {
      if (!bookingData.checkInDate) errs.checkInDate = 'Check-in date is required.'
      if (!bookingData.checkOutDate) errs.checkOutDate = 'Check-out date is required.'
      else if (bookingData.checkInDate && bookingData.checkOutDate <= bookingData.checkInDate) {
        errs.checkOutDate = 'Check-out must be after check-in.'
      }
      if (blockedError) errs.checkInDate = blockedError
    }
    if (step === 2 && !loggedInReady) {
      if (!bookingData.contactName.trim()) errs.contactName = 'Full name is required.'
      if (!bookingData.contactEmail.trim()) errs.contactEmail = 'Email is required.'
      else if (!isValidEmail(bookingData.contactEmail)) errs.contactEmail = 'Enter a valid email address.'
    }
    if (step === 2 && isMobileUiMethod(paymentFields.method)) {
      Object.assign(errs, getMarzpayMobileValidationErrors(paymentFields))
    }
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setPaymentError(null)
      if (!validateStep(currentStep)) return
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
    setBlockedError(null)
    setFieldErrors(prev => clearFieldError(prev, field))
    setFormBanner(null)
    setBookingData(prev => ({ ...prev, [field]: value }))

    // Validate blocked dates immediately when checkInDate changes
    if (field === 'checkInDate' && value && blockedDates.has(value as string)) {
      setBlockedError('Selected check-in date is unavailable (another accommodation/transport booking exists).')
    }
  }

  // Handle input change
  const checkIn = new Date(bookingData.checkInDate)
  const checkOut = new Date(bookingData.checkOutDate)
  const nights = bookingData.checkInDate && bookingData.checkOutDate
    ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const totalPrice = service.price * bookingData.rooms * nights
  const hotelBillableUnits = Math.max(0, bookingData.rooms * nights)

  useEffect(() => {
    let cancelled = false
    if (!service?.id || hotelBillableUnits <= 0) {
      setHotelPricingCalc(null)
      return () => {
        cancelled = true
      }
    }
    ;(async () => {
      try {
        const calc = await calculatePaymentForAmount(service.id, Number(service.price || 0))
        if (cancelled) return
        setHotelPricingCalc(calc.success ? calc : null)
      } catch (e) {
        console.error('Hotel pricing calc failed:', e)
        if (!cancelled) setHotelPricingCalc(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [service.id, service.price, hotelBillableUnits])

  const customerPaysTotal = customerTotalFromUnitPricingCalc(
    hotelPricingCalc,
    hotelBillableUnits,
    totalPrice
  )
  const hotelTouristFeeTotal = touristFeeTotalFromUnitCalc(hotelPricingCalc, hotelBillableUnits, 0)
  const hotelGrandTotal = customerPaysTotal

  const handleCompleteBooking = async () => {
    if (isSubmitting) return

    if (paymentFields.method === 'mobile' || paymentFields.method === 'card') {
      if (!validateStep(2)) return
      setPaymentError(null)
      finaliseInFlightRef.current = false
      setPollingMessage('Creating booking…')

      let pendingBooking: any = null
      try {
        const roomNote = bookingData.roomType ? `Room: ${bookingData.roomType}` : ''
        const specialRequests = [roomNote, bookingData.specialRequests].filter(Boolean).join('\n')
        pendingBooking = await createBooking({
          service_id: service.id,
          vendor_id: service.vendor_id || service.vendors?.id || '',
          booking_date: new Date().toISOString(),
          service_date: bookingData.checkInDate,
          guests: bookingData.guests,
          total_amount: hotelGrandTotal,
          pricing_base_amount: totalPrice,
          currency: 'UGX',
          status: 'pending',
          payment_status: 'pending',
          special_requests: specialRequests || undefined,
          tourist_id: user?.id,
          guest_name: user ? undefined : bookingData.contactName,
          guest_email: user ? undefined : bookingData.contactEmail,
          guest_phone: user ? undefined : `${bookingData.countryCode}${bookingData.contactPhone}`,
          start_time: service.check_in_time,
          end_time: service.check_out_time,
          end_date: bookingData.checkOutDate,
        } as any)
      } catch (bookingErr) {
        console.error('Failed to pre-create hotel booking:', bookingErr)
        setPaymentError('Failed to create booking. Please try again.')
        return
      }

      pendingRef.current = pendingBooking
      try {
        await pay({
          amount: Math.round(hotelGrandTotal),
          method: paymentFields.method,
          phone: paymentFields.phone,
          booking_id: pendingBooking.id,
          description: `${service.title} hotel booking — ${nights} night${nights > 1 ? 's' : ''}`,
        })
      } catch {
        cancelBookingOnPaymentFailure(pendingBooking.id).catch(console.error)
      }
      return
    }

    await finaliseHotelBooking('pending')
  }

  // SO4: existingBooking is pre-created before payment; skip DB insert for mobile-money path.
  const finaliseHotelBooking = async (paymentStatus: 'paid' | 'pending', existingBooking?: any) => {
    if (finaliseInFlightRef.current) return
    finaliseInFlightRef.current = true
    try {
      if (!existingBooking) {
        const roomNote = bookingData.roomType ? `Room: ${bookingData.roomType}` : ''
        const specialRequests = [roomNote, bookingData.specialRequests].filter(Boolean).join('\n')
        await createBooking({
          service_id: service.id,
          vendor_id: service.vendor_id || service.vendors?.id || '',
          booking_date: new Date().toISOString(),
          service_date: bookingData.checkInDate,
          guests: bookingData.guests,
          total_amount: hotelGrandTotal,
          pricing_base_amount: totalPrice,
          currency: 'UGX',
          status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
          payment_status: paymentStatus,
          special_requests: specialRequests || undefined,
          tourist_id: user?.id,
          guest_name: user ? undefined : bookingData.contactName,
          guest_email: user ? undefined : bookingData.contactEmail,
          guest_phone: user ? undefined : `${bookingData.countryCode}${bookingData.contactPhone}`,
          start_time: service.check_in_time,
          end_time: service.check_out_time,
          end_date: bookingData.checkOutDate,
        } as any)
      }
      // Webhook confirms the booking in the DB; show receipt optimistically as confirmed.
      setPollingMessage('')
      setCurrentStep(3)
    } catch (error) {
      finaliseInFlightRef.current = false
      console.error('Error finalising hotel booking:', error)
      setPaymentError('Failed to complete booking. Please try again.')
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <BookingFormBanner message={formBanner} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Check-in & Check-out Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-in Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={fieldInputClass(Boolean(fieldErrors.checkInDate || blockedError), 'w-full px-3 py-2 border rounded-lg')}
                    value={bookingData.checkInDate}
                    onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    aria-invalid={Boolean(fieldErrors.checkInDate || blockedError)}
                  />
                  <FieldError message={fieldErrors.checkInDate || blockedError || undefined} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={fieldInputClass(Boolean(fieldErrors.checkOutDate), 'w-full px-3 py-2 border rounded-lg')}
                    value={bookingData.checkOutDate}
                    onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                    min={bookingData.checkInDate || new Date().toISOString().split('T')[0]}
                    aria-invalid={Boolean(fieldErrors.checkOutDate)}
                  />
                  <FieldError message={fieldErrors.checkOutDate} />
                </div>
              </div>
              {nights > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {nights} night{nights > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('guests')}</label>
                <input
                  type="number"
                  min={1}
                  max={service.max_capacity || 10}
                  value={bookingData.guests}
                  onChange={(e) => handleInputChange('guests', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('rooms')}</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={bookingData.rooms}
                  onChange={(e) => handleInputChange('rooms', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <BookingFormBanner message={formBanner} />
            {/* Room Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('room_selection')}</h3>
              <div className="space-y-3">
                {service.room_types?.map((roomType, index) => (
                  <label key={index} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors" style={{backgroundColor: bookingData.roomType === roomType ? '#EFF6FF' : 'transparent'}}>
                    <input
                      type="radio"
                      name="roomType"
                      value={roomType}
                      checked={bookingData.roomType === roomType}
                      onChange={(e) => handleInputChange('roomType', e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{roomType}</span>
                      <span className="text-gray-600 ml-2 text-sm font-light">
                        {formatPrice(service.price, service.currency)} {t('per_night')}
                      </span>
                    </div>
                  </label>
                )) || (
                  <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors" style={{backgroundColor: bookingData.roomType === 'Standard' ? '#EFF6FF' : 'transparent'}}>
                    <input
                      type="radio"
                      name="roomType"
                      value="Standard"
                      checked={bookingData.roomType === 'Standard'}
                      onChange={(e) => handleInputChange('roomType', e.target.value)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Standard Room</span>
                      <span className="text-gray-600 ml-2 text-sm font-light">
                        {formatPrice(service.price, service.currency)} {t('per_night')}
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Special Requests <span className="font-light text-gray-500">(Optional)</span>
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm font-light"
                rows={3}
                placeholder="e.g., high floor, late check-in, extra pillows..."
                value={bookingData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              />
            </div>

            {/* Your Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Information</h3>
              {loggedInReady && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                  Signed in as {bookingData.contactEmail}. Your saved details will be used.
                </p>
              )}
              <div className="space-y-4">
                {!loggedInReady && (
                  <>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={fieldInputClass(Boolean(fieldErrors.contactName), 'w-full px-4 py-2 border rounded-lg text-sm font-light')}
                    placeholder="John Doe"
                    value={bookingData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.contactName)}
                  />
                  <FieldError message={fieldErrors.contactName} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className={fieldInputClass(Boolean(fieldErrors.contactEmail), 'w-full px-4 py-2 border rounded-lg text-sm font-light')}
                    placeholder="john@example.com"
                    value={bookingData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.contactEmail)}
                  />
                  <FieldError message={fieldErrors.contactEmail} />
                </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Phone Number <span className="font-light text-gray-500">(Optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative country-dropdown" style={{width: '120px'}}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent bg-gray-50 text-sm font-light flex items-center justify-between"
                        onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                      >
                        <span>
                          {COUNTRIES.find(c => c.code === bookingData.countryCode)?.flag || '🌍'} {bookingData.countryCode}
                        </span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {countryDropdownOpen && (
                        <div className="absolute top-full left-0 z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg">
                          <div className="p-2 border-b">
                            <input
                              type="text"
                              placeholder="Search..."
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-light focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm font-light flex items-center space-x-2"
                                onClick={() => {
                                  handleInputChange('countryCode', country.code)
                                  setCountrySearch('')
                                  setCountryDropdownOpen(false)
                                }}
                              >
                                <span>{country.flag}</span>
                                <span className="flex-1">{country.name}</span>
                                <span className="text-gray-500">{country.code}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="tel"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm font-light"
                      placeholder="700 000 000"
                      value={bookingData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('payment_method')}</h3>
              <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-2">
                <div className="flex justify-between items-center text-sm text-gray-700 font-light">
                  <span>Room subtotal ({nights} night{nights !== 1 ? 's' : ''})</span>
                  <span>{formatPrice(totalPrice, service.currency)}</span>
                </div>
                {hotelTouristFeeTotal > 0 && (
                  <div className="flex justify-between items-center text-sm text-gray-700 font-light">
                    <span>Includes booking fee</span>
                    <span>{formatPrice(hotelTouristFeeTotal, service.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-100">
                  <span className="text-gray-800 font-medium">{t('total_due')}</span>
                  <span className="text-2xl font-semibold text-blue-600">{formatPrice(hotelGrandTotal, service.currency)}</span>
                </div>
              </div>
              <MarzpayPaymentFields
                name="hotelPaymentMethod"
                value={paymentFields}
                onChange={setPaymentFields}
                errors={fieldErrors}
                onClearError={(field) => setFieldErrors(p => clearFieldError(p, field))}
                className="mb-3"
                inputClassName="w-full px-4 py-2 border rounded-lg text-sm font-light"
              />
              {pollingMessage && (
                <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">{pollingMessage}</p>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Success Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Your accommodation booking has been successfully confirmed. You will receive a confirmation email shortly.
              </p>
            </div>

            {/* Service Details */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Service Details</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium text-right">{service.title}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-right">{service.location}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium text-right">{service.service_categories.name}</span>
                </div>
                {service.star_rating && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Star Rating:</span>
                    <span className="font-medium text-right">{'⭐'.repeat(service.star_rating)} ({service.star_rating}/5)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Service Provider */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Service Provider</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Provider:</span>
                  <span className="font-medium text-right">{service.vendors?.business_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-right break-all">{service.vendors?.business_email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium text-right">{service.vendors?.business_phone || 'N/A'}</span>
                </div>
                {service.vendors?.business_address && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium text-right">{service.vendors.business_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Accommodation Details */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Accommodation Details</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Check-in Date:</span>
                  <span className="font-medium text-right">{bookingData.checkInDate || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Check-out Date:</span>
                  <span className="font-medium text-right">{bookingData.checkOutDate || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-right">
                    {bookingData.checkInDate && bookingData.checkOutDate 
                      ? `${Math.ceil((new Date(bookingData.checkOutDate).getTime() - new Date(bookingData.checkInDate).getTime()) / (1000 * 60 * 60 * 24))} nights`
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Room Type:</span>
                  <span className="font-medium text-right">{bookingData.roomType || 'Standard'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Number of Rooms:</span>
                  <span className="font-medium text-right">{bookingData.rooms}</span>
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Guest Information</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Number of Guests:</span>
                  <span className="font-medium">{bookingData.guests}</span>
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Booking Information</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Special Requests:</span>
                  <span className="font-medium text-right max-w-xs">{bookingData.specialRequests || 'None'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium capitalize">{paymentFields.method === 'mobile' ? 'Mobile Money' : paymentFields.method}</span>
                </div>
                {paymentFields.method === 'mobile' && paymentFields.provider && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium">{paymentFields.provider}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Your Contact Information */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Your Contact Information</h4>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-right">{bookingData.contactName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-right break-all">{bookingData.contactEmail}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium text-right">{bookingData.countryCode} {bookingData.contactPhone}</span>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="pt-4 sm:pt-6 border-t border-gray-200">
              <div className="space-y-3 text-xs sm:text-sm mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rate per night:</span>
                  <span className="font-medium">{formatPrice(service.price, service.currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Number of nights:</span>
                  <span className="font-medium">
                    {Math.ceil((new Date(bookingData.checkOutDate).getTime() - new Date(bookingData.checkInDate).getTime()) / (1000 * 60 * 60 * 24))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-base sm:text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-lg sm:text-2xl font-bold text-blue-600">{formatPrice(hotelGrandTotal, service.currency)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 justify-center pt-6 sm:pt-8">
              <button
                onClick={() => navigate(`/category/${service.service_categories.name.toLowerCase().replace(/\s+/g, '-')}`)}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 sm:py-2 px-2 sm:px-6 rounded-lg transition-colors text-xs sm:text-sm"
              >
                Similar Hotels
              </button>
              <button
                onClick={() => navigate(`/service/${service.slug || service.id}/inquiry`)}
                className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-1.5 sm:py-2 px-2 sm:px-6 rounded-lg transition-colors text-xs sm:text-sm"
              >
                Message Provider
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 sm:flex-none bg-gray-600 hover:bg-gray-700 text-white font-medium py-1.5 sm:py-2 px-2 sm:px-6 rounded-lg transition-colors text-xs sm:text-sm"
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 sm:pb-8">
        {/* Service Summary Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-3">
            <img
              src={service.images[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
              alt={service.title}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-medium text-gray-900 truncate">{service.title}</h1>
              <p className="text-sm font-light text-gray-600">{service.location}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xl font-semibold text-blue-600">
                {formatPrice(totalPrice, service.currency)}
              </div>
              <div className="text-xs font-light text-gray-500">
                {nights} night{nights > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep < 3 && (
          <div className="fixed sm:relative bottom-0 left-0 right-0 z-30 sm:z-auto flex flex-col gap-3 mt-6 border-t sm:border-0 bg-white/95 sm:bg-transparent backdrop-blur-sm px-4 sm:px-0 py-3 sm:py-0">
            {paymentError && (
              <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {paymentError}
              </div>
            )}
            {currentStep === 2 && (
              <SettlementChargeNote amount={hotelGrandTotal} settlementCurrency={service.currency} />
            )}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                {t('back')}
              </button>
              <button
                onClick={currentStep === 2 ? handleCompleteBooking : handleNext}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isSubmitting
                  ? (pollingMessage || 'Processing...')
                  : currentStep === 2
                    ? paymentFields.method === 'card'
                      ? t('pay_with_card', { amount: formatPrice(hotelGrandTotal, service.currency) })
                      : t('pay_momo')
                    : t('next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}