import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CreditCard, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createBooking as createVendorBooking } from '../store/vendorStore'
import { createBooking as createDatabaseBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'
import { cancelBookingOnPaymentFailure } from '../services/BookingService'
import { watchMarzpayPayment, type MarzpayWatchHandles } from '../hooks/watchMarzpayPayment'
import {
  calculatePaymentForAmount,
  customerTotalFromAggregatePricingCalc,
  type PaymentCalculation
} from '../lib/pricingService'
import { COUNTRIES } from '../lib/countries'
import { formatCurrencyWithConversion } from '../lib/utils'
import { fetchVendorBlockedDates } from '../lib/blockedDates'
import { BookingFormBanner, FieldError } from '../components/booking/BookingFormFeedback'
import {
  type FieldErrors,
  applyFieldErrors,
  clearFieldError,
  fieldInputClass,
  isValidEmail,
  isValidUgMobileMoneyPhone,
} from '../lib/bookingFormValidation'
import { calculateDays } from '../lib/transportUtils'
import TransportImageGallery from '../components/TransportImageGallery'
import TransportBookingReceipt from '../components/TransportBookingReceipt'

interface ServiceDetail {
  id: string
  slug?: string
  vendor_id?: string
  category_id?: string
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
  // Optional transport/fuel metadata (may be present for transport services)
  avgSpeedKmph?: number
  fuel_km_per_liter?: number
  fuelKmPerL?: number
  fuel_consumption_per_100km?: number
  price_within_town?: number
  price_upcountry?: number
  vehicle_engine?: string
  vehicle_ccs?: number
  fuel_type?: string
  pickup_locations?: string[]
  dropoff_locations?: string[]
}

interface TransportBookingProps {
  service: ServiceDetail
}


export default function TransportBooking({ service }: TransportBookingProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const { user, profile } = useAuth()

  const getBookingDraftMessage = () => `Hi, I just completed a booking for ${service.title}${bookingData.startDate ? ` starting ${bookingData.startDate}` : ''}${bookingData.endDate ? ` ending ${bookingData.endDate}` : ''}${bookingData.passengers ? ` for ${bookingData.passengers} passenger${bookingData.passengers === 1 ? '' : 's'}` : ''}${bookingData.pickupLocation ? ` from ${bookingData.pickupLocation}` : ''}${bookingData.dropoffLocation ? ` to ${bookingData.dropoffLocation}` : ''}. My booking reference is ${bookingResult?.id || 'N/A'}. Please confirm the details and next steps.`

  const handleMessageProvider = () => {
    const draft = getBookingDraftMessage()
    if (!user) {
      navigate('/login', {
        state: {
          from: {
            pathname: '/messages',
            state: {
              draft,
              vendorId: service.vendor_id,
            },
          },
        },
      })
    } else {
      navigate('/messages', {
        state: {
          draft,
          vendorId: service.vendor_id,
        },
      })
    }
  }

  const messageProviderLabel = user ? 'Message Provider' : 'Chat with provider'




  const [currentStep, setCurrentStep] = useState(1)
  // Removed unused cartSaved state
  const [bookingConfirmed, setBookingConfirmed] = useState(false)
  const [bookingResult, setBookingResult] = useState<any | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pollingMessage, setPollingMessage] = useState('')
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)
  const [isReceiptFinalizing, setIsReceiptFinalizing] = useState(false)
  const paymentWatchRef = useRef<MarzpayWatchHandles | null>(null)
  const finaliseInFlightRef = useRef(false)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
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
    countryCode: '+256', // Default to Uganda
  paymentMethod: 'mobile',
    mobileProvider: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    driverOption: service.driver_included ? 'with-driver' : 'self-drive'
  })

  // Pricing calculation for transport (platform fee / splits)
  const [pricingCalc, setPricingCalc] = useState<PaymentCalculation | null>(null)

  // Blocked dates (single-booking categories)
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const blocked = await fetchVendorBlockedDates(supabase, service.vendor_id)
        if (!mounted) return
        setBlockedDates(blocked)
      } catch (err) {
        console.error('Error loading blocked dates for transport booking:', err)
      }
    })()
    return () => { mounted = false }
  }, [service.vendor_id])

  // Country search state
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

  // Pre-fill dates from navigation state if available
  useEffect(() => {
    if (location.state) {
      const { startDate, endDate, selectedDate, startTime, endTime, transportZone: incomingZone } =
        location.state as any
      if (startDate && endDate) {
        setBookingData(prev => ({
          ...prev,
          startDate,
          endDate,
          ...(startTime ? { startTime } : {}),
          ...(endTime ? { endTime } : {}),
        }))
        if (incomingZone) setTransportZone(incomingZone)
      } else if (selectedDate) {
        setBookingData(prev => ({
          ...prev,
          date: selectedDate
        }))
      }
    }
  }, [location.state])

  function getTransportUnitPrice(): number | null {
    const rawWithin = (service as any).price_within_town
    const rawUp = (service as any).price_upcountry
    const within = rawWithin !== undefined && rawWithin !== null ? Number(rawWithin) : undefined
    const up = rawUp !== undefined && rawUp !== null ? Number(rawUp) : undefined
    const fallback = service.price !== undefined && service.price !== null ? Number(service.price) : null
    if (service.service_categories?.name?.toLowerCase() !== 'transport') return fallback
    if (transportZone === 'within') return !isNaN(within as number) ? (within as number) : fallback
    if (transportZone === 'upcountry') return !isNaN(up as number) ? (up as number) : fallback
    // No selection: if only one exists, return that, otherwise fallback to service.price
    if (!isNaN(within as number) && (isNaN(up as number) || up === undefined)) return within as number
    if (!isNaN(up as number) && (isNaN(within as number) || within === undefined)) return up as number
    return fallback
  }

  const [transportZone, setTransportZone] = useState<'within' | 'upcountry' | ''>('')

  // Auto-default transport zone when only one transport price exists
  useEffect(() => {
    try {
      const hasWithin = typeof (service as any).price_within_town === 'number' && (service as any).price_within_town !== null
      const hasUp = typeof (service as any).price_upcountry === 'number' && (service as any).price_upcountry !== null
      if (service.service_categories?.name?.toLowerCase() === 'transport') {
        if (hasWithin && !hasUp) setTransportZone('within')
        else if (!hasWithin && hasUp) setTransportZone('upcountry')
      }
    } catch (e) {
      // ignore
    }
  }, [service])

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

  // Auto-populate contact information for logged-in users
  useEffect(() => {
    // Prevent repeated attempts if we've already fetched or handled missing table
    const fetchedRef = { current: false }

    const fetchTouristData = async () => {
      if (!user) return
      if ((fetchedRef as any).current) return

      try {
        // Get tourist profile data
        const { data: touristData, error } = await supabase
          .from('tourists')
          .select('first_name, last_name, phone')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          // Handle table-missing or other PostgREST responses gracefully
          console.error('Error fetching tourist data (will fallback to profile):', error)
          // Mark as fetched to avoid repeated failing requests
          ;(fetchedRef as any).current = true
          setBookingData(prev => ({
            ...prev,
            contactName: profile?.full_name || prev.contactName,
            contactEmail: profile?.email || prev.contactEmail
          }))
        } else if (touristData) {
          // Auto-populate contact fields
          ;(fetchedRef as any).current = true
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
          ;(fetchedRef as any).current = true
          setBookingData(prev => ({
            ...prev,
            contactName: profile?.full_name || prev.contactName,
            contactEmail: profile?.email || prev.contactEmail
          }))
        }
      } catch (error: any) {
        // If the REST endpoint returns 406 or other errors, fallback to profile and mark fetched
        console.error('Error fetching tourist data (fallback):', error)
        ;(fetchedRef as any).current = true
        setBookingData(prev => ({
          ...prev,
          contactName: profile?.full_name || prev.contactName,
          contactEmail: profile?.email || prev.contactEmail
        }))
      }
    }

    fetchTouristData()
  }, [user, profile])

  const contactReady = Boolean(bookingData.contactName?.trim() && bookingData.contactEmail?.trim())
  const loggedInReady = Boolean(user && contactReady)

  const steps = [
    { id: 1, title: 'Details & Payment', icon: CreditCard },
    { id: 2, title: 'Confirmation', icon: CheckCircle }
  ]

  const validateCurrentStep = () => {
    setStepError(null)
    const errs: FieldErrors = {}
    if (currentStep === 1) {
      if (!bookingData.startDate) errs.startDate = 'Pick-up date is required.'
      if (!bookingData.endDate) errs.endDate = 'Drop-off date is required.'
      const start = bookingData.startDate
      if (start && blockedDates.has(start)) {
        const unavailableMsg = 'Selected start date is unavailable (already booked).'
        errs.startDate = unavailableMsg
      }
      if (!transportZone) errs.transportZone = 'Select Within Town or Upcountry.'
      if (bookingData.driverOption === 'with-driver') {
        if (!bookingData.pickupLocation?.trim()) errs.pickupLocation = 'Pickup location is required.'
        if (!bookingData.dropoffLocation?.trim()) errs.dropoffLocation = 'Drop-off location is required.'
      }
      const maxCapacity = (service.vehicle_capacity ?? service.max_capacity) ?? null
      if (bookingData.passengers < 1 || (maxCapacity !== null && bookingData.passengers > maxCapacity)) {
        errs.passengers = `Passengers must be between 1 and ${maxCapacity ?? 'unlimited'}.`
      }
      if (!loggedInReady) {
        if (!bookingData.contactName.trim()) errs.contactName = 'Full name is required.'
        if (!bookingData.contactEmail.trim()) errs.contactEmail = 'Email is required.'
        else if (!isValidEmail(bookingData.contactEmail)) errs.contactEmail = 'Enter a valid email address.'
      }
      if (bookingData.paymentMethod === 'mobile') {
        if (!phoneNumber.trim()) errs.phone = 'Mobile money number is required.'
        else if (!isValidUgMobileMoneyPhone(phoneNumber)) errs.phone = 'Enter a valid number (e.g. 0712345678).'
        if (!bookingData.mobileProvider) errs.mobileProvider = 'Select MTN or Airtel.'
      }
    }
    if (!applyFieldErrors(errs, setFieldErrors, (msg) => setStepError(msg))) return false
    return true
  }

  const handleNext = async () => {
    if (currentStep < steps.length) {
      // Validate current step before proceeding
      if (!validateCurrentStep()) {
        return
      }

      // If completing booking (step 1), handle payment then create booking
      if (currentStep === 1) {
        setBookingError(null)
        setStepError(null)

        if (bookingData.paymentMethod === 'mobile') {
          const rawPhone = phoneNumber.trim().replace(/^\+256/, '')
          const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`
          if (!phone || phone.length < 12) {
            setStepError('Please enter a valid mobile money phone number (e.g. 0712345678).')
            return
          }
          if (!bookingData.mobileProvider) {
            setStepError('Please select a mobile money provider (MTN or Airtel).')
            return
          }

          setIsPaymentProcessing(true)
          setIsReceiptFinalizing(false)
          setPollingMessage('Initiating payment…')

          // SO4: Create booking in pending state BEFORE charging the user.
          let pendingTransportBooking: any = null
          try {
            pendingTransportBooking = await createDatabaseBooking({
              service_id: service.id,
              tourist_id: user?.id,
              vendor_id: service.vendor_id || 'vendor_demo',
              booking_date: new Date().toISOString(),
              service_date: bookingData.startDate,
              guests: bookingData.passengers,
              total_amount: transportCustomerPaysTotal,
              pricing_base_amount: totalPrice,
              currency: service.currency,
              status: 'pending',
              payment_status: 'pending',
              special_requests: bookingData.specialRequests || undefined,
              guest_name: user ? undefined : bookingData.contactName,
              guest_email: user ? undefined : bookingData.contactEmail,
              guest_phone: user ? undefined : (bookingData.contactPhone ? `${bookingData.countryCode}${bookingData.contactPhone}` : undefined),
              pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
              dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
              driver_option: bookingData.driverOption,
              return_trip: bookingData.returnTrip,
              start_time: bookingData.startTime,
              end_time: bookingData.endTime,
              end_date: bookingData.endDate,
            } as any)
          } catch (bookingErr) {
            console.error('Failed to pre-create transport booking:', bookingErr)
            setStepError('Failed to create booking. Please try again.')
            setPollingMessage('')
            setIsPaymentProcessing(false)
            return
          }

          try {
            const { data: session } = await supabase.auth.getSession()

            const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                amount: Math.round(transportCustomerPaysTotal),
                phone_number: phone,
                booking_id: pendingTransportBooking.id,
                description: `${service.title} transport booking`,
                user_id: session?.session?.user?.id || undefined,
              }),
            })

            let resultBody: any = {}
            try {
              const text = await collectRes.text()
              try { resultBody = JSON.parse(text) } catch { resultBody = { raw: text } }
            } catch (e) {
              resultBody = { error: 'Failed to read response body' }
            }

            if (!collectRes.ok) {
              const msg = resultBody?.error || resultBody?.message || resultBody?.raw || JSON.stringify(resultBody)
              console.error('marzpay-collect failed', collectRes.status, msg)
              setStepError(`Payment initiation failed: ${msg}`)
              setPollingMessage('')
              setIsPaymentProcessing(false)
              return
            }

            const ref = resultBody?.data?.reference || resultBody?.reference || (resultBody?.data && resultBody.data.reference)
            if (!ref) {
              const msg = resultBody?.error || resultBody?.message || 'No payment reference returned'
              console.error('marzpay-collect missing reference', msg, resultBody)
              setStepError(`Payment initiation failed: ${msg}`)
              setPollingMessage('')
              setIsPaymentProcessing(false)
              return
            }
            setPollingMessage('Confirm the payment on your phone. Waiting for confirmation…')

            const onSuccess = () => {
              paymentWatchRef.current?.cleanup()
              setIsReceiptFinalizing(true)
              setPollingMessage('Payment confirmed! Loading your receipt…')
              void createTransportBooking('paid', ref, pendingTransportBooking).catch((e) => {
                console.warn('Background booking finalization failed:', e)
              })
            }
            const onFail = () => {
              paymentWatchRef.current?.cleanup()
              setPollingMessage('')
              setIsPaymentProcessing(false)
              setIsReceiptFinalizing(false)
              setStepError('Payment was not completed or was declined. Please try again.')
            }

            paymentWatchRef.current?.cleanup()
            paymentWatchRef.current = watchMarzpayPayment(ref, {
              channelPrefix: 'payment_trp',
              onCompleted: onSuccess,
              onFailed: onFail,
              pollIntervalMs: 1500,
              burstChecks: { count: 6, intervalMs: 800 },
            })

          } catch (err: any) {
            console.error('Payment error:', err)
            if (pendingTransportBooking?.id) {
              cancelBookingOnPaymentFailure(pendingTransportBooking.id).catch(console.error)
            }
            setPollingMessage('')
            setIsPaymentProcessing(false)
            setIsReceiptFinalizing(false)
            setStepError(err?.message || 'Payment failed. Please try again.')
          }
          return
        }

        // Non-mobile-money: create booking directly
        await createTransportBooking('pending', undefined, undefined)
        return
      }
      setCurrentStep(currentStep + 1)
    }
  }

  // SO4: existingBooking is pre-created before payment; skip DB insert for mobile-money path.
  // The manual webhook self-call is removed — the real webhook (with secret) handles confirmation.
  const createTransportBooking = async (
    paymentStatus: 'paid' | 'pending',
    paymentReference?: string,
    existingBooking?: any
  ) => {
    if (finaliseInFlightRef.current) return
    finaliseInFlightRef.current = true
    try {
      // Vendor localStorage for demo panel
      createVendorBooking(service.vendor_id || 'vendor_demo', {
        service_id: service.id,
        vendor_id: service.vendor_id || 'vendor_demo',
        booking_date: new Date().toISOString(),
        service_date: bookingData.startDate,
        guests: bookingData.passengers,
        total_amount: transportCustomerPaysTotal,
        currency: service.currency,
        status: 'confirmed' as const,
        special_requests: bookingData.specialRequests || undefined,
        pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
        dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
        driver_option: bookingData.driverOption,
        return_trip: bookingData.returnTrip,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        end_date: bookingData.endDate,
      } as any)

      // Use the pre-created pending booking if provided; otherwise create now (non-mobile path).
      let result = existingBooking
      if (!result) {
        result = await createDatabaseBooking({
          service_id: service.id,
          tourist_id: user?.id,
          vendor_id: service.vendor_id || 'vendor_demo',
          booking_date: new Date().toISOString(),
          service_date: bookingData.startDate,
          guests: bookingData.passengers,
          total_amount: transportCustomerPaysTotal,
          pricing_base_amount: totalPrice,
          currency: service.currency,
          status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
          payment_status: paymentStatus as any,
          payment_reference: paymentReference || undefined,
          special_requests: bookingData.specialRequests || undefined,
          guest_name: user ? undefined : bookingData.contactName,
          guest_email: user ? undefined : bookingData.contactEmail,
          guest_phone: user ? undefined : (bookingData.contactPhone ? `${bookingData.countryCode}${bookingData.contactPhone}` : undefined),
          pickup_location: bookingData.driverOption === 'with-driver' ? bookingData.pickupLocation : undefined,
          dropoff_location: bookingData.driverOption === 'with-driver' ? bookingData.dropoffLocation : undefined,
          driver_option: bookingData.driverOption,
          return_trip: bookingData.returnTrip,
          start_time: bookingData.startTime,
          end_time: bookingData.endTime,
          end_date: bookingData.endDate,
        } as any)
      }

      if (result && result.id) {
        // Show receipt optimistically as confirmed — webhook updates DB status asynchronously.
        setBookingResult({ ...result, status: 'confirmed', payment_status: 'paid' })
        setBookingConfirmed(true)
        setPollingMessage('')
        setIsPaymentProcessing(false)
        setIsReceiptFinalizing(false)
        setCurrentStep(2)
      } else {
        setBookingError('Booking could not be confirmed. Please try again.')
        setIsPaymentProcessing(false)
        setIsReceiptFinalizing(false)
      }
    } catch (error: any) {
      finaliseInFlightRef.current = false
      setBookingError(error?.message || 'Booking could not be confirmed. Please try again.')
      setIsPaymentProcessing(false)
      setIsReceiptFinalizing(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate(`/service/${service.slug || service.id}`)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean | undefined) => {
    setFieldErrors(prev => clearFieldError(prev, field))
    setStepError(null)
    setBookingData(prev => ({ ...prev, [field]: value }))

    if (field === 'startDate' && value && blockedDates.has(value as string)) {
      setFieldErrors(prev => ({
        ...prev,
        startDate: 'Selected start date is unavailable for booking (another transport/accommodation is already booked).',
      }))
    }
  }

  const [unitPrice, setUnitPrice] = useState<number | null>(() => getTransportUnitPrice())
  useEffect(() => {
    setUnitPrice(getTransportUnitPrice())
  }, [transportZone, service])

  const basePrice = (unitPrice || service.price || 0) * calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)
  const driverCost = (bookingData.driverOption === 'with-driver' && !service.driver_included) ? basePrice * 0.3 : 0
  /** Trip subtotal before vendor-tier platform fee (base × days + optional driver uplift). */
  const totalPrice = basePrice + driverCost

  // Recalculate platform fee and split when price/selection changes
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!service?.id) return
      try {
        const calc = await calculatePaymentForAmount(service.id, totalPrice)
        if (!mounted) return
        setPricingCalc(calc.success ? calc : null)
      } catch (err) {
        console.error('Error fetching transport pricing calculation:', err)
        if (mounted) setPricingCalc(null)
      }
    })()
    return () => { mounted = false }
  }, [service?.id, bookingData.startDate, bookingData.endDate, bookingData.startTime, bookingData.endTime, bookingData.driverOption, bookingData.passengers, totalPrice])

  const transportCustomerPaysTotal = customerTotalFromAggregatePricingCalc(pricingCalc, totalPrice)

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 sm:space-y-6">
            <BookingFormBanner message={stepError} />
            {/* Trip Dates Section */}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Trip Dates & Times</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pick-up Date & Time <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className={fieldInputClass(Boolean(fieldErrors.startDate), 'w-full px-2 py-2 border rounded text-xs sm:text-sm')}
                      value={bookingData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      aria-invalid={Boolean(fieldErrors.startDate)}
                    />
                    <input
                      type="time"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-xs sm:text-sm"
                      value={bookingData.startTime || '09:00'}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                    />
                  </div>
                  <FieldError message={fieldErrors.startDate} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Drop-off Date & Time <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className={fieldInputClass(Boolean(fieldErrors.endDate), 'w-full px-2 py-2 border rounded text-xs sm:text-sm')}
                      value={bookingData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                      aria-invalid={Boolean(fieldErrors.endDate)}
                    />
                    <input
                      type="time"
                      className="w-full px-2 py-2 border border-gray-300 rounded text-xs sm:text-sm"
                      value={bookingData.endTime || '17:00'}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>
                  <FieldError message={fieldErrors.endDate} />
                </div>
              </div>
            </div>

            {/* Passengers & Driver Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Passengers *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs sm:text-sm"
                  value={bookingData.passengers}
                  onChange={(e) => handleInputChange('passengers', parseInt(e.target.value))}
                >
                  {Array.from({ length: service.max_capacity || 10 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} {num > 1 ? 'passengers' : 'passenger'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Driver Option *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  value={bookingData.driverOption || (service.driver_included ? 'with-driver' : 'self-drive')}
                  onChange={(e) => handleInputChange('driverOption', e.target.value)}
                >
                  {!service.driver_included && <option value="self-drive">Self-drive</option>}
                  <option value="with-driver">
                    {service.driver_included ? 'With driver (included)' : 'With driver (+30%)'}
                  </option>
                </select>
                {service.driver_included === false && bookingData.driverOption === 'with-driver' && (
                  <p className="text-xs text-amber-600 mt-1">+30% additional cost</p>
                )}
              </div>
            </div>

            {/* Locations & Options Section */}
            {bookingData.driverOption === 'with-driver' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Pickup & Drop-off Locations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Pickup location *"
                      className={fieldInputClass(Boolean(fieldErrors.pickupLocation), 'w-full px-3 py-2 border rounded-lg text-sm')}
                      value={bookingData.pickupLocation}
                      onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.pickupLocation)}
                    />
                    <FieldError message={fieldErrors.pickupLocation} />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Drop-off location *"
                      className={fieldInputClass(Boolean(fieldErrors.dropoffLocation), 'w-full px-3 py-2 border rounded-lg text-sm')}
                      value={bookingData.dropoffLocation}
                      onChange={(e) => handleInputChange('dropoffLocation', e.target.value)}
                      aria-invalid={Boolean(fieldErrors.dropoffLocation)}
                    />
                    <FieldError message={fieldErrors.dropoffLocation} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                rows={2}
                placeholder="Any special requirements, route notes, or stop-over requests..."
                value={bookingData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
              />
            </div>

            {/* Contact Information Section */}
            <div className="border-t pt-4 sm:pt-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Your Contact Information</h3>
              {loggedInReady && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                  Signed in as {bookingData.contactEmail}. Your saved details will be used.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {!loggedInReady && (
                  <>
                <div>
                  <input
                    type="text"
                    placeholder="Full name *"
                    className={fieldInputClass(Boolean(fieldErrors.contactName), 'w-full px-3 py-2 border rounded-lg text-xs sm:text-sm')}
                    value={bookingData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.contactName)}
                  />
                  <FieldError message={fieldErrors.contactName} />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email address *"
                    className={fieldInputClass(Boolean(fieldErrors.contactEmail), 'w-full px-3 py-2 border rounded-lg text-sm')}
                    value={bookingData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.contactEmail)}
                  />
                  <FieldError message={fieldErrors.contactEmail} />
                </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone (Optional)</label>
                  <div className="flex gap-2">
                    <div className="relative country-dropdown w-32">
                      <button
                        type="button"
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm flex items-center justify-between"
                        onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                      >
                        <span className="truncate text-xs">
                          {COUNTRIES.find(c => c.code === bookingData.countryCode)?.flag || '🌍'} {bookingData.countryCode}
                        </span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {countryDropdownOpen && (
                        <div className="absolute top-full left-0 z-50 w-56 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          <div className="p-2 border-b">
                            <input
                              type="text"
                              placeholder="Search..."
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {filteredCountries.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                className="w-full px-2 py-1 text-left hover:bg-gray-100 flex items-center gap-2 text-xs"
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
                      placeholder="Phone number"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      value={bookingData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="border-t pt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Details</h3>
              
              {/* Price Breakdown (includes platform fee + splits) */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">{service.title}</span>
                    <span className="font-medium">{formatCurrencyWithConversion(basePrice, service.currency)}</span>
                  </div>
                  {driverCost > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Driver service (30%)</span>
                      <span className="font-medium">{formatCurrencyWithConversion(driverCost, service.currency)}</span>
                    </div>
                  )}

                  {pricingCalc ? (
                    <>
                      {Number(pricingCalc.tourist_fee || 0) > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Includes booking fee</span>
                          <span className="font-medium">{formatCurrencyWithConversion(pricingCalc.tourist_fee, service.currency)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                        <span>Total</span>
                        <span>{formatCurrencyWithConversion(transportCustomerPaysTotal, service.currency)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-gray-500">Service fee calculation unavailable — using default totals.</div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                        <span>Total</span>
                        <span>{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Payment Method — Mobile Money only */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method *</label>
                <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">Mobile Money</span>
                  <p className="text-xs text-gray-600 mt-1">MTN Mobile Money or Airtel Money</p>
                </div>
              </div>

              {/* Mobile Money Phone + Provider */}
              {bookingData.paymentMethod === 'mobile' && (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number *</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      className={fieldInputClass(Boolean(fieldErrors.phone), 'w-full px-3 py-2 border rounded-lg text-sm')}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      onChange={(e) => {
                        const val = e.target.value.trimStart()
                        setPhoneNumber(val)
                        setFieldErrors(prev => clearFieldError(prev, 'phone'))
                        setStepError(null)
                        const digits = val.replace(/\D/g, '')
                        const local = digits.startsWith('256') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits
                        if (local.length >= 2) {
                          const p = local.slice(0, 2)
                          if (['76', '77', '78', '39', '46', '31'].includes(p)) handleInputChange('mobileProvider', 'MTN')
                          else if (['70', '74', '75', '20', '50'].includes(p)) handleInputChange('mobileProvider', 'Airtel')
                        }
                      }}
                      placeholder="0712345678 or +256712345678"
                    />
                    <FieldError message={fieldErrors.phone} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider *</label>
                    <div className={`flex gap-2 ${fieldErrors.mobileProvider ? 'ring-1 ring-red-500 rounded-lg p-1' : ''}`}>
                      <button
                        type="button"
                        onClick={() => handleInputChange('mobileProvider', 'MTN')}
                        className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${bookingData.mobileProvider === 'MTN' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}
                      >
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><rect width="18" height="14" rx="2" fill="#FFD200"/><text x="9" y="10" fill="#000" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">MTN</text></svg>
                        <span className="text-sm font-medium">MTN</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('mobileProvider', 'Airtel')}
                        className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${bookingData.mobileProvider === 'Airtel' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}
                      >
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><rect width="18" height="14" rx="2" fill="#E60000"/><text x="9" y="10" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">A</text></svg>
                        <span className="text-sm font-medium">Airtel</span>
                      </button>
                    </div>
                    <FieldError message={fieldErrors.mobileProvider} />
                  </div>
                  {pollingMessage && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">{pollingMessage}</p>
                  )}
                  {isPaymentProcessing && isReceiptFinalizing && !bookingConfirmed && (
                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                      <div className="flex items-start gap-2">
                        <svg className="mt-0.5 h-4 w-4 animate-spin text-emerald-700" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-emerald-800">Payment received</p>
                          <p className="text-xs text-emerald-700">Preparing your booking receipt now. This usually takes a few seconds.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
      <TransportBookingReceipt
        service={service}
        bookingData={bookingData}
        bookingResult={bookingResult}
        totalPrice={totalPrice}
        pricingCalc={pricingCalc}
        transportCustomerPaysTotal={transportCustomerPaysTotal}
        onMessageProvider={handleMessageProvider}
        messageProviderLabel={messageProviderLabel}
        onNavigateHome={() => navigate('/')}
      />
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
            onClick={() => { setBookingError(null); setCurrentStep(1) }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Filter countries based on search
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  )

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

      {/* Progress Steps removed as requested */}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pt-28 sm:pt-32 pb-28 sm:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 -mt-32">
          {/* Images on top for web: use order classes */}
          <div className="order-1 lg:order-1 lg:col-span-7">
            {/* Professional image gallery with sliding effect */}
            <TransportImageGallery images={service.images} title={service.title} />
          </div>
          {/* Details below images for web, but stacked for mobile */}
          <div className="order-2 lg:order-2 lg:col-span-7 space-y-6 pt-2 sm:pt-4">
            {/* Service Info Header */}
            <div className="mb-4 pb-4 border-b border-gray-100">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1">
                {service.title} <span className="text-gray-600 font-normal text-base">in {service.location}</span>
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm mb-2">{service.service_categories.name}</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl font-bold text-gray-900">
                    {formatCurrencyWithConversion(transportCustomerPaysTotal, service.currency)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {service.service_categories?.name?.toLowerCase() === 'transport'
                      ? `per day${bookingData.startDate && bookingData.endDate ? ` • ${calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days` : ''}`
                      : `One way${bookingData.startDate && bookingData.endDate ? ` • ${calculateDays(bookingData.startDate, bookingData.startTime, bookingData.endDate, bookingData.endTime)} days` : ''}`}
                  </div>
                </div>
              </div>
            </div>
            {/* Transport zone selector (move above Trip Dates & Times) */}
            {service.service_categories?.name?.toLowerCase() === 'transport' && ((service as any).price_within_town || (service as any).price_upcountry) && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <label className="block text-sm font-semibold text-emerald-900 mb-2">Service Area *</label>
                <div className="flex items-center gap-4 text-sm mb-2">
                  {(service as any).price_within_town !== undefined && (
                    <label className="inline-flex items-center">
                      <input type="radio" name="transportZoneTop" value="within" checked={transportZone === 'within'} onChange={() => { setTransportZone('within'); setFieldErrors(p => clearFieldError(p, 'transportZone')); setStepError(null) }} className="mr-2" />
                      <span>Within Town {typeof (service as any).price_within_town === 'number' ? `· ${formatCurrencyWithConversion((service as any).price_within_town, service.currency)}` : ''}</span>
                    </label>
                  )}
                  {(service as any).price_upcountry !== undefined && (
                    <label className="inline-flex items-center">
                      <input type="radio" name="transportZoneTop" value="upcountry" checked={transportZone === 'upcountry'} onChange={() => { setTransportZone('upcountry'); setFieldErrors(p => clearFieldError(p, 'transportZone')); setStepError(null) }} className="mr-2" />
                      <span>Upcountry {typeof (service as any).price_upcountry === 'number' ? `· ${formatCurrencyWithConversion((service as any).price_upcountry, service.currency)}` : ''}</span>
                    </label>
                  )}
                </div>
                <p className="text-xs text-emerald-700">Select whether this trip is within town or upcountry to see the correct price.</p>
                <FieldError message={fieldErrors.transportZone} />
              </div>
            )}
            {/* Step progress */}
            {currentStep < 2 && (
              <div className="flex items-center gap-2 mb-4 px-1 overflow-x-auto">
                {[
                  { n: 1, label: 'Details' },
                  { n: 2, label: 'Pay' },
                ].map(({ n, label }) => (
                  <div key={n} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                      currentStep > n ? 'bg-emerald-600 text-white' :
                      currentStep === n ? 'border-2 border-emerald-600 text-emerald-600 bg-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {currentStep > n ? '✓' : n}
                    </div>
                    <span className={`text-sm ${currentStep === n ? 'text-emerald-600 font-medium' : 'text-gray-500'}`}>{label}</span>
                    {n < 2 && <span className="text-gray-300 mx-1">›</span>}
                  </div>
                ))}
              </div>
            )}
            {/* Step Content */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
              {renderStepContent()}
            </div>
            {/* Navigation — sticky on mobile */}
            {currentStep < 2 && (
              <div className="fixed sm:relative bottom-0 left-0 right-0 z-30 sm:z-auto mt-6 border-t sm:border-0 bg-white/95 sm:bg-transparent backdrop-blur-sm px-4 sm:px-0 py-3 sm:py-0">
                {(stepError) && (
                  <div className="w-full mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {stepError}
                  </div>
                )}
                <button
                  onClick={handleNext}
                  disabled={isPaymentProcessing || bookingData.paymentMethod === 'card'}
                  className="w-full sm:w-auto sm:ml-auto sm:flex px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-semibold shadow"
                >
                  {isPaymentProcessing
                    ? (isReceiptFinalizing ? 'Preparing receipt…' : (pollingMessage ? 'Waiting for payment…' : 'Processing...'))
                    : 'Pay with Mobile Money'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}