import { useState, useEffect, useRef } from 'react'
import {
  calculatePaymentForAmount,
  customerTotalFromUnitPricingCalc,
  touristFeeTotalFromUnitCalc
} from '../lib/pricingService'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, CreditCard, CheckCircle } from 'lucide-react'
import { formatCurrencyWithConversion } from '../lib/utils'
import { COUNTRIES } from '../lib/countries'
import { useAuth } from '../contexts/AuthContext'
import { createBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'
import BookingReceipt from '../components/BookingReceipt'

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
  category_id?: string
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
  const location = useLocation()
  const { user, profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pollingMessage, setPollingMessage] = useState('')
  const [completedBooking, setCompletedBooking] = useState<any | null>(null)
  const backupPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finaliseInFlightRef = useRef(false)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  // Country search state
  const [countrySearch, setCountrySearch] = useState('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)

  const [bookingData, setBookingData] = useState({
    date: '',
    guests: 1,
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    countryCode: '+256', // Default to Uganda
    paymentMethod: 'mobile',
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

  // Prefill date and guests from ServiceDetail navigation state
  useEffect(() => {
    if (!location.state) return
    const { selectedDate, guests } = location.state as { selectedDate?: string; guests?: number }
    setBookingData(prev => ({
      ...prev,
      ...(selectedDate ? { date: selectedDate } : {}),
      ...(guests ? { guests } : {}),
    }))
  }, [location.state])

  const contactReady = Boolean(bookingData.contactName?.trim() && bookingData.contactEmail?.trim())
  const loggedInReady = Boolean(user && contactReady)

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
    { id: 1, title: 'Select Date & Guests', icon: Calendar },
    { id: 2, title: 'Your Details', icon: Users },
    { id: 3, title: 'Payment', icon: CreditCard },
    { id: 4, title: 'Processing', icon: CheckCircle },
    { id: 5, title: 'Confirmation', icon: CheckCircle }
  ]

  const handleNext = () => {
    if (currentStep === 1 && loggedInReady) {
      setCurrentStep(3)
      return
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep === 3 && loggedInReady) {
      setCurrentStep(1)
      return
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate(`/service/${service.slug || service.id}`)
    }
  }

  const resolveGuestContact = () => ({
    guest_name: bookingData.contactName?.trim() || profile?.full_name || undefined,
    guest_email: bookingData.contactEmail?.trim() || profile?.email || undefined,
    guest_phone: bookingData.contactPhone
      ? `${bookingData.countryCode}${bookingData.contactPhone}`
      : phoneNumber
        ? (phoneNumber.startsWith('+') ? phoneNumber : `+256${phoneNumber.replace(/^\+256/, '').replace(/^0/, '')}`)
        : undefined,
  })

  const handleInputChange = (field: string, value: string | number) => {
    setBookingData(prev => ({ ...prev, [field]: value }))
  }

  const [paymentError, setPaymentError] = useState<string | null>(null)
  const handlePaymentMethodChange = (value: string) => {
    setBookingData(prev => ({ ...prev, paymentMethod: value }))
  }

  const totalPrice = service.price * bookingData.guests
  const [pricingCalc, setPricingCalc] = useState<any | null>(null)

  // Calculate platform/service fee per participant using pricing rules
  useEffect(() => {
    let cancelled = false
    const fetchCalc = async () => {
      try {
        const calc = await calculatePaymentForAmount(service.id, Number(service.price || 0))
        if (cancelled) return
        setPricingCalc(calc)
      } catch (err) {
        console.error('Failed to fetch pricing calc for activity:', err)
        setPricingCalc(null)
      }
    }
    fetchCalc()
    return () => { cancelled = true }
  }, [service.id, service.price])

  const platformFeePer =
    pricingCalc && typeof pricingCalc.platform_fee === 'number'
      ? Number(pricingCalc.platform_fee)
      : 0

  /** What the customer pays (aligns with tier/override fee_payer). */
  const customerPaysTotal = customerTotalFromUnitPricingCalc(
    pricingCalc,
    bookingData.guests,
    totalPrice
  )

  const touristFeeTotal = touristFeeTotalFromUnitCalc(
    pricingCalc,
    bookingData.guests,
    platformFeePer
  )

  const grandTotal = customerPaysTotal

  const handleCompleteBooking = async () => {
    if (isSubmitting) return

    // If mobile money selected, process payment via MarzPay first
    if (bookingData.paymentMethod === 'mobile') {
      const rawPhone = phoneNumber.trim().replace(/^\+256/, '')
      const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`
      if (!phone || phone.length < 12) {
        setPaymentError('Please enter a valid mobile money phone number (e.g. 0712345678).')
        return
      }
      if (!bookingData.mobileProvider) {
        setPaymentError('Please select a mobile money provider (MTN or Airtel).')
        return
      }
      setPaymentError(null)

      setIsSubmitting(true)
      setPollingMessage('Creating booking…')

      // SO4: Create booking in pending state BEFORE charging the user.
      // This ensures the booking exists when the webhook fires, and eliminates
      // the race where payment succeeds but booking creation fails afterwards.
      let pendingBooking: any = null
      try {
        const contact = resolveGuestContact()
        const platformFeeTotal = pricingCalc && typeof pricingCalc.platform_fee === 'number'
          ? Math.round(pricingCalc.platform_fee * bookingData.guests)
          : 0
        pendingBooking = await createBooking({
          service_id: service.id,
          vendor_id: service.vendor_id || service.vendors?.id || '',
          booking_date: new Date().toISOString(),
          service_date: bookingData.date,
          guests: bookingData.guests,
          total_amount: customerPaysTotal,
          currency: service.currency,
          status: 'pending',
          payment_status: 'pending',
          special_requests: bookingData.specialRequests,
          tourist_id: user?.id,
          guest_name: user ? undefined : contact.guest_name,
          guest_email: user ? undefined : contact.guest_email,
          guest_phone: user ? undefined : contact.guest_phone,
          pricing_base_amount: totalPrice,
          platform_fee: platformFeeTotal,
        })
      } catch (bookingErr) {
        console.error('Failed to pre-create booking:', bookingErr)
        setPaymentError('Failed to create booking. Please try again.')
        setIsSubmitting(false)
        return
      }

      setPollingMessage('Initiating payment…')

      try {
        const { data: session } = await supabase.auth.getSession()

        const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            amount: Math.round(grandTotal),
            phone_number: phone,
            booking_id: pendingBooking.id,
            description: `${service.title} booking — ${bookingData.guests} guest${bookingData.guests > 1 ? 's' : ''}`,
            user_id: session?.session?.user?.id || undefined,
          }),
        })

        const result = await collectRes.json().catch(() => ({})) as {
          success?: boolean
          error?: string
          data?: { reference: string; status: string }
        }

        if (!collectRes.ok || !result?.success || !result?.data?.reference) {
          throw new Error(result?.error || 'Payment initiation failed')
        }

        const ref = result.data.reference
        setPollingMessage('Confirm the payment on your phone. Waiting for confirmation…')

        // Poll payment status
        const checkStatus = async (): Promise<'completed' | 'failed' | null> => {
          try {
            const res = await fetch(
              `${supabaseUrl}/functions/v1/marzpay-payment-status?reference=${encodeURIComponent(ref)}`,
              { headers: { Authorization: `Bearer ${supabaseAnonKey}` } }
            )
            const data = await res.json().catch(() => ({})) as { status?: string }
            if (data?.status === 'completed') return 'completed'
            if (data?.status === 'failed') return 'failed'
            return null
          } catch {
            return null
          }
        }

        // Realtime listener
        const channel = supabase
          .channel(`payment_act_${ref}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: `reference=eq.${ref}` },
            async (payload) => {
              const row = payload.new as { status: string }
              if (row.status === 'completed') {
                channel.unsubscribe()
                if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
                await finaliseBooking('paid', pendingBooking)
              } else if (row.status === 'failed') {
                channel.unsubscribe()
                if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
                supabase.from('bookings').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', pendingBooking.id).then(() => {})
                setPollingMessage('')
                setIsSubmitting(false)
                setPaymentError('Payment was not completed or was declined. Please try again.')
              }
            })
          .subscribe()

        const immediate = await checkStatus()
        if (immediate === 'completed') {
          channel.unsubscribe()
          await finaliseBooking('paid', pendingBooking)
          return
        } else if (immediate === 'failed') {
          channel.unsubscribe()
          supabase.from('bookings').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', pendingBooking.id).then(() => {})
          setPollingMessage('')
          setIsSubmitting(false)
          setPaymentError('Payment was not completed or was declined. Please try again.')
          return
        }

        backupPollRef.current = setInterval(async () => {
          const status = await checkStatus()
          if (status === 'completed') {
            channel.unsubscribe()
            if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
            await finaliseBooking('paid', pendingBooking)
          } else if (status === 'failed') {
            channel.unsubscribe()
            if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
            supabase.from('bookings').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', pendingBooking.id).then(() => {})
            setPollingMessage('')
            setIsSubmitting(false)
            setPaymentError('Payment was not completed or was declined. Please try again.')
          }
        }, 4000)
        setTimeout(() => {
          if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
        }, 120000)

      } catch (err) {
        console.error('Payment error:', err)
        if (pendingBooking?.id) {
          supabase.from('bookings').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', pendingBooking.id).then(() => {})
        }
        setPollingMessage('')
        setIsSubmitting(false)
        setPaymentError((err as Error).message || 'Payment failed. Please try again.')
      }
      return
    }

    // Non-mobile-money: create booking directly
    setIsSubmitting(true)
    await finaliseBooking('pending')
  }

  // SO4: existingBooking is pre-created (pending) before payment; skip DB insert for mobile-money path.
  const finaliseBooking = async (paymentStatus: 'paid' | 'pending', existingBooking?: any) => {
    if (finaliseInFlightRef.current) return
    finaliseInFlightRef.current = true
    try {
      let booking = existingBooking
      if (!booking) {
        const platformFeeTotal = pricingCalc && typeof pricingCalc.platform_fee === 'number'
          ? Math.round(pricingCalc.platform_fee * bookingData.guests)
          : 0
        const contact = resolveGuestContact()
        booking = await createBooking({
          service_id: service.id,
          vendor_id: service.vendor_id || service.vendors?.id || '',
          booking_date: new Date().toISOString(),
          service_date: bookingData.date,
          guests: bookingData.guests,
          total_amount: customerPaysTotal,
          currency: service.currency,
          status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
          payment_status: paymentStatus,
          special_requests: bookingData.specialRequests,
          tourist_id: user?.id,
          guest_name: user ? undefined : contact.guest_name,
          guest_email: user ? undefined : contact.guest_email,
          guest_phone: user ? undefined : contact.guest_phone,
          pricing_base_amount: totalPrice,
          platform_fee: platformFeeTotal,
        })
      }
      // Optimistic display: show receipt as confirmed — webhook confirms the DB record asynchronously.
      setCompletedBooking(
        existingBooking
          ? { ...existingBooking, status: 'confirmed', payment_status: 'paid' }
          : booking
      )
      setPollingMessage('')
      setCurrentStep(5)
    } catch (error) {
      finaliseInFlightRef.current = false
      console.error('Error finalising booking:', error)
      setPaymentError('Failed to complete booking. Please try again.')
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
            {loggedInReady && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Signed in as {bookingData.contactEmail}. Your saved details will be used — tap Next to continue to payment.
              </p>
            )}
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
                  Phone Number (Optional)
                </label>
                <div className="flex">
                  <div className="relative country-dropdown">
                    <button
                      type="button"
                      className="px-3 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-gray-50 border-r-0 flex items-center justify-between min-w-[120px]"
                      onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                      style={{ width: '140px' }}
                    >
                      <span className="truncate">
                        {COUNTRIES.find(c => c.code === bookingData.countryCode)?.flag || '🌍'} {bookingData.countryCode}
                      </span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {countryDropdownOpen && (
                      <div className="absolute top-full left-0 z-50 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            placeholder="Search countries..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredCountries.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                              onClick={() => {
                                handleInputChange('countryCode', country.code)
                                setCountrySearch('')
                                setCountryDropdownOpen(false)
                              }}
                            >
                              <span>{country.flag}</span>
                              <span className="text-sm">{country.name}</span>
                              <span className="text-sm text-gray-500 ml-auto">{country.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    value={bookingData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder="700 000 000"
                  />
                </div>
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
              <div className="space-y-2">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Subtotal</span>
                  <span>{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-700">
                  <span>{touristFeeTotal > 0 ? 'Includes booking fee' : 'Fees'}</span>
                  <span>{formatCurrencyWithConversion(touristFeeTotal, service.currency)}</span>
                </div>

                <div className="flex justify-between items-center text-lg font-semibold mt-1 pt-2 border-t border-gray-200">
                  <span>Total Amount</span>
                  <span>{formatCurrencyWithConversion(grandTotal, service.currency)}</span>
                </div>
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
                    value="mobile"
                    checked={bookingData.paymentMethod === 'mobile'}
                    onChange={() => handlePaymentMethodChange('mobile')}
                    className="mr-2"
                  />
                  Mobile Money
                </label>
              </div>
            </div>
            {bookingData.paymentMethod === 'mobile' && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.trimStart()
                      setPhoneNumber(val)
                      const digits = val.replace(/\D/g, '')
                      const local = digits.startsWith('256') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits
                      if (local.length >= 2) {
                        const p = local.slice(0, 2)
                        if (['76', '77', '78', '39', '46', '31'].includes(p)) handleInputChange('mobileProvider', 'MTN')
                        else if (['70', '74', '75', '20', '50'].includes(p)) handleInputChange('mobileProvider', 'Airtel')
                      }
                    }}
                    placeholder="0712345678 or +256712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('mobileProvider', 'MTN')}
                      className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${bookingData.mobileProvider === 'MTN' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><rect width="18" height="14" rx="2" fill="#FFD200"/><text x="9" y="10" fill="#000" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">MTN</text></svg>
                      <span className="text-sm font-medium">MTN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('mobileProvider', 'Airtel')}
                      className={`flex-1 py-2 rounded border flex items-center justify-center gap-2 ${bookingData.mobileProvider === 'Airtel' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><rect width="18" height="14" rx="2" fill="#E60000"/><text x="9" y="10" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">A</text></svg>
                      <span className="text-sm font-medium">Airtel</span>
                    </button>
                  </div>
                </div>
                {pollingMessage && (
                  <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">{pollingMessage}</p>
                )}
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
        if (!completedBooking) {
          return (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading your confirmation…</p>
            </div>
          )
        }
        return (
          <BookingReceipt
            booking={{
              ...completedBooking,
              service: { ...service, category_id: service.category_id } as any,
              is_guest_booking: !user,
            }}
            showActions={true}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="text-sm sm:text-base">Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pb-28 sm:pb-8">
        {/* Service Summary */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:space-x-4 space-y-3 sm:space-y-0">
            <img
              loading="lazy"
              decoding="async"
              src={service.images[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'}
              alt={service.title}
              className="w-full sm:w-20 md:w-24 h-40 sm:h-20 md:h-24 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">{service.title}</h2>
              <p className="text-gray-600 text-sm sm:text-base">{service.location}</p>
              <p className="text-gray-600 text-sm">{service.service_categories.name}</p>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <div className="text-lg sm:text-xl font-bold text-gray-900">
                {formatCurrencyWithConversion(totalPrice, service.currency)}
              </div>
              <div className="text-sm text-gray-500">for {bookingData.guests} participant{bookingData.guests > 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Step progress */}
        {currentStep < 5 && (
          <div className="flex items-center gap-2 mb-4 px-1 overflow-x-auto">
            {[
              { n: 1, label: 'Date' },
              { n: 2, label: 'Details' },
              { n: 3, label: 'Pay' },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  currentStep > n ? 'bg-blue-600 text-white' :
                  currentStep === n ? 'border-2 border-blue-600 text-blue-600 bg-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > n ? '✓' : n}
                </div>
                <span className={`text-sm ${currentStep === n ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>{label}</span>
                {n < 3 && <span className="text-gray-300 mx-1">›</span>}
              </div>
            ))}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
          {renderStepContent()}
        </div>

        {/* Navigation — sticky on mobile */}
        {currentStep < 5 && (
          <div className="fixed sm:relative bottom-0 left-0 right-0 z-30 sm:z-auto mt-4 sm:mt-6 border-t sm:border-0 bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none px-3 sm:px-0 py-3 sm:py-0 space-y-3">
            {paymentError && (
              <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {paymentError}
              </div>
            )}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:gap-4">
              <button
                onClick={handleBack}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={currentStep === 3 ? handleCompleteBooking : handleNext}
                disabled={
                  isSubmitting ||
                  (currentStep === 1 && !bookingData.date) ||
                  (currentStep === 2 && !loggedInReady && (!bookingData.contactName || !bookingData.contactEmail)) ||
                  (currentStep === 3 && bookingData.paymentMethod === 'mobile' && (!phoneNumber.trim() || !bookingData.mobileProvider))
                }
                className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                {isSubmitting
                  ? (pollingMessage ? 'Waiting for payment…' : 'Processing...')
                  : currentStep === 3
                    ? 'Pay with Mobile Money'
                    : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}