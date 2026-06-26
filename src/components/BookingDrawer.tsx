import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createBooking } from '../lib/database'
import { getOptionalUserId } from '../services/AuthService'
import { cancelBookingOnPaymentFailure } from '../services/BookingService'
import { watchMarzpayPayment, type MarzpayWatchHandles } from '../hooks/watchMarzpayPayment'
import {
  calculatePaymentForAmount,
  customerTotalFromUnitPricingCalc,
  touristFeeTotalFromUnitCalc,
} from '../lib/pricingService'
import { formatCurrencyWithConversion, normalizeServiceCurrency } from '../lib/utils'
import { BookingFormBanner, FieldError } from './booking/BookingFormFeedback'
import {
  type FieldErrors,
  applyFieldErrors,
  clearFieldError,
  fieldInputClass,
  isValidEmail,
  isValidUgMobileMoneyPhone,
} from '../lib/bookingFormValidation'
import { isRestaurantService } from '../lib/bookingCategories'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingDrawerProps {
  isOpen: boolean
  onClose: () => void
  service: any
  /** Pre-filled from ServiceDetail sidebar selections */
  prefill: {
    selectedDate?: string
    checkInDate?: string
    checkOutDate?: string
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    guests?: number
    transportZone?: 'within' | 'upcountry' | ''
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ─── Provider detection ───────────────────────────────────────────────────────

function detectMobileProvider(val: string): 'MTN' | 'Airtel' | '' {
  const d = val.replace(/\D/g, '').replace(/^256/, '').replace(/^0/, '')
  const p = d.slice(0, 2)
  if (['76', '77', '78', '39', '46', '31'].includes(p)) return 'MTN'
  if (['70', '74', '75', '20', '50'].includes(p)) return 'Airtel'
  return ''
}

function formatPhone(raw: string): string {
  const t = raw.trim().replace(/^\+256/, '')
  return t.startsWith('+') ? t : `+256${t.replace(/^0/, '')}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcNights(a: string, b: string) {
  if (!a || !b) return 1
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function calcDays(sd: string, st: string, ed: string, et: string) {
  if (!sd || !ed) return 1
  const diff = new Date(`${ed}T${et}`).getTime() - new Date(`${sd}T${st}`).getTime()
  return Math.max(1, Math.ceil(diff / 86400000))
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookingDrawer({ isOpen, onClose, service, prefill }: BookingDrawerProps) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [step, setStep] = useState<'summary' | 'contact' | 'payment' | 'done'>('summary')
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [provider, setProvider] = useState<'MTN' | 'Airtel' | ''>('')
  const [pollingMessage, setPollingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formBanner, setFormBanner] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [completedBooking, setCompletedBooking] = useState<any>(null)
  const [pricingCalc, setPricingCalc] = useState<any>(null)
  const paymentWatchRef = useRef<MarzpayWatchHandles | null>(null)
  const finaliseRef = useRef(false)

  const categoryName = (service?.service_categories?.name ?? '').toLowerCase()
  const isHotel = ['hotels', 'hotel', 'accommodation'].includes(categoryName)
  const isTransport = categoryName === 'transport'
  const isRestaurant = isRestaurantService(service)
  const isFlight = ['flights', 'flight'].includes(categoryName)
  const isTour = ['tours', 'tour'].includes(categoryName)

  // Category-specific extra fields collected in the summary step
  const [flightFrom, setFlightFrom] = useState('')
  const [flightTo, setFlightTo] = useState('')
  const [flightTripType, setFlightTripType] = useState<'One-way' | 'Round-trip'>('One-way')
  const [tourPickup, setTourPickup] = useState('')

  // Pre-fill contact from profile
  useEffect(() => {
    if (!user || !profile) return
    setContact(c => ({
      name: c.name || profile.full_name || '',
      email: c.email || profile.email || '',
      phone: c.phone || (profile as any).phone || '',
    }))
  }, [user, profile])

  // Reset to step 1 when drawer opens
  useEffect(() => {
    if (isOpen) {
      setStep('summary')
      setError(null)
      setFieldErrors({})
      setFormBanner(null)
      setPollingMessage('')
      setProcessing(false)
      finaliseRef.current = false
      setFlightFrom('')
      setFlightTo('')
      setFlightTripType('One-way')
      setTourPickup('')
    }
  }, [isOpen])

  // Load pricing
  useEffect(() => {
    if (!service?.id || !isOpen) return
    let cancelled = false
    calculatePaymentForAmount(service.id, Number(service.price || 0))
      .then(c => { if (!cancelled) setPricingCalc(c) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [service?.id, isOpen])

  // ─── Price calculation ───────────────────────────────────────────────────────

  const baseUnit = Number(
    isTransport
      ? prefill.transportZone === 'within'
        ? (service as any).price_within_town || service.price
        : prefill.transportZone === 'upcountry'
        ? (service as any).price_upcountry || service.price
        : service.price
      : service?.price || 0
  )

  const billableUnits = isTransport
    ? calcDays(prefill.startDate || '', prefill.startTime || '09:00', prefill.endDate || '', prefill.endTime || '17:00')
    : isHotel
    ? calcNights(prefill.checkInDate || '', prefill.checkOutDate || '')
    : (prefill.guests || 1)

  const baseTotal = baseUnit * billableUnits
  const customerTotal = isTransport
    ? customerTotalFromUnitPricingCalc(pricingCalc, billableUnits, baseTotal)
    : customerTotalFromUnitPricingCalc(pricingCalc, billableUnits, baseTotal)
  const touristFee = touristFeeTotalFromUnitCalc(pricingCalc, billableUnits, 0)

  // ─── Date display ─────────────────────────────────────────────────────────────

  const dateDisplay = isHotel
    ? `${prefill.checkInDate || '—'} → ${prefill.checkOutDate || '—'} · ${billableUnits} night${billableUnits !== 1 ? 's' : ''}`
    : isTransport
    ? `${prefill.startDate || '—'} → ${prefill.endDate || '—'} · ${billableUnits} day${billableUnits !== 1 ? 's' : ''}`
    : `${prefill.selectedDate || '—'} · ${prefill.guests || 1} guest${(prefill.guests || 1) !== 1 ? 's' : ''}`

  // ─── Booking creation ─────────────────────────────────────────────────────────

  const buildBookingPayload = (status: 'pending' | 'confirmed' | 'reserved') => {
    const guestContact = user
      ? { tourist_id: user.id }
      : { guest_name: contact.name || undefined, guest_email: contact.email || undefined, guest_phone: contact.phone ? formatPhone(contact.phone) : undefined }

    const base = {
      service_id: service.id,
      vendor_id: service.vendor_id || service.vendors?.id || '',
      booking_date: new Date().toISOString(),
      guests: isTransport ? 1 : (prefill.guests || 1),
      total_amount: Math.round(customerTotal),
      currency: normalizeServiceCurrency(service.currency),
      status,
      payment_status: status === 'confirmed' ? 'paid' : 'pending',
      pricing_base_amount: baseTotal,
      platform_fee: pricingCalc ? Math.round(pricingCalc.platform_fee * billableUnits) : 0,
      ...guestContact,
    }

    if (isHotel) return { ...base, service_date: prefill.checkInDate, end_date: prefill.checkOutDate }
    if (isTransport) return { ...base, service_date: prefill.startDate, end_date: prefill.endDate, start_time: prefill.startTime, end_time: prefill.endTime }
    if (isFlight) return {
      ...base, service_date: prefill.selectedDate,
      pickup_location: flightFrom || undefined,
      dropoff_location: flightTo || undefined,
      special_requests: [
        flightFrom ? `From: ${flightFrom}` : '',
        flightTo ? `To: ${flightTo}` : '',
        `Type: ${flightTripType}`,
      ].filter(Boolean).join('\n') || undefined,
    }
    if (isTour) return {
      ...base, service_date: prefill.selectedDate,
      special_requests: tourPickup ? `Pickup: ${tourPickup}` : undefined,
    }
    if (isRestaurant) {
      return {
        ...base,
        service_date: prefill.selectedDate,
        start_time: prefill.startTime || undefined,
        total_amount: 0,
        platform_fee: 0,
        status: 'reserved' as const,
        payment_status: 'not_required' as const,
      }
    }
    return { ...base, service_date: prefill.selectedDate }
  }

  // ─── Payment flow ─────────────────────────────────────────────────────────────

  const validateSummary = (): boolean => {
    const errs: FieldErrors = {}
    if (isRestaurant && !prefill.selectedDate) errs.date = 'Select a date on the listing before booking.'
    if (!isHotel && !isTransport && !isRestaurant && !prefill.selectedDate) errs.date = 'Select a date on the listing before booking.'
    if (isHotel && (!prefill.checkInDate || !prefill.checkOutDate)) errs.date = 'Select check-in and check-out dates on the listing.'
    if (isTransport && (!prefill.startDate || !prefill.endDate)) errs.date = 'Select pick-up and drop-off dates on the listing.'
    if (isTransport && prefill.startDate && prefill.endDate && !prefill.transportZone) errs.transportZone = 'Select Within Town or Upcountry on the listing.'
    if (isFlight) {
      if (!flightFrom.trim()) errs.flightFrom = 'Departure location is required.'
      if (!flightTo.trim()) errs.flightTo = 'Destination is required.'
    }
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const validateContact = (): boolean => {
    const errs: FieldErrors = {}
    if (!user) {
      if (!contact.name.trim()) errs.name = 'Full name is required.'
      if (!contact.email.trim()) errs.email = 'Email is required.'
      else if (!isValidEmail(contact.email)) errs.email = 'Enter a valid email address.'
    }
    if (!contact.phone.trim()) errs.phone = 'Mobile money number is required.'
    else if (!isValidUgMobileMoneyPhone(contact.phone)) errs.phone = 'Enter a valid number (e.g. 0712345678).'
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const validateRestaurantContact = (): boolean => {
    const errs: FieldErrors = {}
    if (!user) {
      if (!contact.name.trim()) errs.name = 'Full name is required.'
      if (!contact.email.trim()) errs.email = 'Email is required.'
      else if (!isValidEmail(contact.email)) errs.email = 'Enter a valid email address.'
      if (!contact.phone.trim()) errs.phone = 'Contact phone is required so the restaurant can reach you.'
    }
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const validatePayment = (): boolean => {
    const errs: FieldErrors = {}
    if (!provider) errs.mobileProvider = 'Select MTN or Airtel.'
    if (!contact.phone.trim()) errs.phone = 'Mobile money number is required.'
    else if (!isValidUgMobileMoneyPhone(contact.phone)) errs.phone = 'Enter a valid number (e.g. 0712345678).'
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const handlePay = useCallback(async () => {
    if (processing) return
    if (!validatePayment()) return
    const phone = formatPhone(contact.phone)
    setError(null)
    setProcessing(true)
    setPollingMessage('Creating booking…')

    let pending: any = null
    try {
      pending = await createBooking(buildBookingPayload('pending') as any)
    } catch (e) {
      setError('Failed to create booking. Please try again.')
      setProcessing(false)
      return
    }

    setPollingMessage('Initiating payment…')
    try {
      const userId = await getOptionalUserId()
      const res = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({
          amount: Math.round(customerTotal),
          phone_number: phone,
          booking_id: pending.id,
          description: `${service.title} booking`,
          user_id: userId,
        }),
      })
      const result = await res.json().catch(() => ({})) as { success?: boolean; error?: string; data?: { reference: string } }
      if (!res.ok || !result?.success || !result?.data?.reference) throw new Error(result?.error || 'Payment initiation failed')
      const ref = result.data.reference
      setPollingMessage('Check your phone for the USSD prompt…')

      const onSuccess = () => {
        if (finaliseRef.current) return
        finaliseRef.current = true
        paymentWatchRef.current?.cleanup()
        setCompletedBooking({ ...pending, status: 'confirmed', payment_status: 'paid' })
        setPollingMessage('')
        setProcessing(false)
        setStep('done')
      }

      const onFail = () => {
        paymentWatchRef.current?.cleanup()
        cancelBookingOnPaymentFailure(pending.id).catch(console.error)
        setPollingMessage('')
        setProcessing(false)
        setError('Payment was not completed. Please try again.')
      }

      paymentWatchRef.current?.cleanup()
      paymentWatchRef.current = watchMarzpayPayment(ref, {
        channelPrefix: 'drawer',
        onCompleted: onSuccess,
        onFailed: onFail,
      })
    } catch (err) {
      cancelBookingOnPaymentFailure(pending.id).catch(console.error)
      setProcessing(false)
      setPollingMessage('')
      setError((err as Error).message || 'Payment failed. Please try again.')
    }
  }, [processing, contact, provider, service, prefill, customerTotal, buildBookingPayload])

  // Restaurant reservations need no payment
  const handleRestaurantReserve = useCallback(async () => {
    if (processing) return
    if (!user && !validateRestaurantContact()) return
    if (user && !validateSummary()) return
    setProcessing(true)
    setError(null)
    try {
      const booking = await createBooking(buildBookingPayload('reserved') as any)
      setCompletedBooking(booking)
      setStep('done')
    } catch (e) {
      setError('Reservation failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }, [processing, buildBookingPayload])

  // ─── Panel visibility ─────────────────────────────────────────────────────────

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  // ─── Shared step nav ──────────────────────────────────────────────────────────

  const stepBack = () => {
    if (step === 'contact') setStep('summary')
    else if (step === 'payment') setStep(user ? 'summary' : 'contact')
    else onClose()
  }

  const goFromSummary = () => {
    if (!validateSummary()) return
    if (isRestaurant) {
      if (user) {
        void handleRestaurantReserve()
      } else {
        setStep('contact')
      }
      return
    }
    setStep(user ? 'payment' : 'contact')
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel: slides up on mobile, slides in from right on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Book this service"
        className={[
          'fixed z-50 bg-white shadow-2xl flex flex-col',
          // Mobile: bottom sheet, full width, max 92vh
          'bottom-0 left-0 right-0 rounded-t-2xl max-h-[92dvh]',
          // Desktop: right slide-over, fixed width
          'md:bottom-0 md:top-0 md:left-auto md:right-0 md:w-[440px] md:rounded-none md:max-h-full md:h-full',
          'overflow-hidden',
          'animate-in slide-in-from-bottom md:slide-in-from-right duration-300',
        ].join(' ')}
      >
        {/* ── Drag handle (mobile) ── */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            {step !== 'summary' && step !== 'done' && (
              <button onClick={stepBack} className="p-1 rounded hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-gray-900 text-base leading-tight">
                {step === 'summary' && 'Booking Summary'}
                {step === 'contact' && 'Your Details'}
                {step === 'payment' && (isRestaurant ? 'Confirm Reservation' : 'Payment')}
                {step === 'done' && (isRestaurant ? 'Reservation Confirmed!' : 'Booking Confirmed!')}
              </h2>
              <p className="text-xs text-gray-500 leading-tight truncate max-w-[240px]">{service?.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Step: Summary ── */}
          {step === 'summary' && (
            <div className="p-5 space-y-4">
              <BookingFormBanner message={formBanner} />
              {/* Service thumbnail */}
              <div className="flex items-center gap-3">
                {service.images?.[0] ? (
                  <img src={service.images[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 leading-tight line-clamp-2">{service.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{service.location}</p>
                </div>
              </div>

              {/* Booking details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium text-gray-700">Dates / Guests</span>
                  <span className="text-right">{dateDisplay}</span>
                </div>
                {isTransport && prefill.transportZone && (
                  <div className="flex justify-between text-gray-600">
                    <span>Zone</span>
                    <span className="capitalize">{prefill.transportZone === 'within' ? 'Within town' : 'Upcountry'}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-gray-600">
                  <span>{formatCurrencyWithConversion(baseUnit, service.currency)} × {billableUnits} {isHotel ? 'night' : isTransport ? 'day' : 'guest'}{billableUnits !== 1 ? 's' : ''}</span>
                  <span>{formatCurrencyWithConversion(baseTotal, service.currency)}</span>
                </div>
                {touristFee > 0 && (
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Booking fee</span>
                    <span>{formatCurrencyWithConversion(touristFee, service.currency)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold text-gray-900">
                  <span>{isRestaurant ? 'Payment' : 'Total'}</span>
                  <span>
                    {isRestaurant
                      ? 'At restaurant'
                      : formatCurrencyWithConversion(customerTotal, service.currency)}
                  </span>
                </div>
                {isRestaurant && (
                  <p className="text-xs text-green-700 font-medium">Free reservation — pay at the restaurant.</p>
                )}
              </div>

              {/* Missing dates / zone warnings */}
              {!isHotel && !isTransport && !prefill.selectedDate && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  Please select a date on the listing before booking.
                </div>
              )}
              {isHotel && (!prefill.checkInDate || !prefill.checkOutDate) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  Please select check-in and check-out dates before booking.
                </div>
              )}
              {isTransport && (!prefill.startDate || !prefill.endDate) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  Please select pick-up and drop-off dates before booking.
                </div>
              )}
              {/* Gap fix: transport zone warning */}
              {isTransport && prefill.startDate && prefill.endDate && !prefill.transportZone && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  Please select a service type (Within Town or Upcountry) on the listing before booking.
                </div>
              )}

              {/* Gap fix: flight-specific fields */}
              {isFlight && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Flight Details</p>
                  <div className="flex gap-2">
                    {(['One-way', 'Round-trip'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setFlightTripType(t)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${flightTripType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From *</label>
                    <input type="text" placeholder="e.g. Entebbe International" className={fieldInputClass(Boolean(fieldErrors.flightFrom), 'w-full px-3 py-2.5 border rounded-lg text-sm')}
                      value={flightFrom} onChange={e => { setFlightFrom(e.target.value); setFieldErrors(p => clearFieldError(p, 'flightFrom')); setFormBanner(null) }} aria-invalid={Boolean(fieldErrors.flightFrom)} />
                    <FieldError message={fieldErrors.flightFrom} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To *</label>
                    <input type="text" placeholder="e.g. Kidepo Valley Airstrip" className={fieldInputClass(Boolean(fieldErrors.flightTo), 'w-full px-3 py-2.5 border rounded-lg text-sm')}
                      value={flightTo} onChange={e => { setFlightTo(e.target.value); setFieldErrors(p => clearFieldError(p, 'flightTo')); setFormBanner(null) }} aria-invalid={Boolean(fieldErrors.flightTo)} />
                    <FieldError message={fieldErrors.flightTo} />
                  </div>
                </div>
              )}

              {/* Gap fix: tour pickup location */}
              {isTour && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Location <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" placeholder="e.g. Kampala city centre, hotel name…" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                    value={tourPickup} onChange={e => setTourPickup(e.target.value)} />
                </div>
              )}

              <div className="text-xs text-gray-500 bg-gray-50 border rounded-lg px-3 py-2">
                Pending bookings can be cancelled from your account. For confirmed bookings, contact us at <span className="font-medium text-gray-600">safaris.dirttrails@gmail.com</span>.
              </div>
            </div>
          )}

          {/* ── Step: Contact ── */}
          {step === 'contact' && (
            <div className="p-5 space-y-4">
              <BookingFormBanner message={formBanner} />
              {user && profile?.full_name ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                  Booking as <span className="font-medium">{profile.full_name}</span> ({profile.email})
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" className={fieldInputClass(Boolean(fieldErrors.name), 'w-full px-3 py-3 border rounded-xl text-base')} value={contact.name} onChange={e => { setContact(c => ({ ...c, name: e.target.value })); setFieldErrors(p => clearFieldError(p, 'name')); setFormBanner(null) }} autoComplete="name" aria-invalid={Boolean(fieldErrors.name)} />
                    <FieldError message={fieldErrors.name} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" className={fieldInputClass(Boolean(fieldErrors.email), 'w-full px-3 py-3 border rounded-xl text-base')} value={contact.email} onChange={e => { setContact(c => ({ ...c, email: e.target.value })); setFieldErrors(p => clearFieldError(p, 'email')); setFormBanner(null) }} autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} />
                    <FieldError message={fieldErrors.email} />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRestaurant ? 'Contact Phone *' : 'Mobile Money Number *'}
                </label>
                {!isRestaurant && provider && (
                  <p className="text-xs text-gray-500 mb-1">
                    Provider: <span className="font-medium">{provider}</span> (auto-detected)
                  </p>
                )}
                {isRestaurant && (
                  <p className="text-xs text-gray-500 mb-1">For the restaurant to confirm your table — not charged.</p>
                )}
                <input type="tel" placeholder="0712345678" className={fieldInputClass(Boolean(fieldErrors.phone), 'w-full px-3 py-3 border rounded-xl text-base')}
                  value={contact.phone}
                  onChange={e => {
                    setContact(c => ({ ...c, phone: e.target.value }))
                    setFieldErrors(p => clearFieldError(p, 'phone'))
                    setFormBanner(null)
                    if (!isRestaurant) {
                      const detected = detectMobileProvider(e.target.value)
                      if (detected) setProvider(detected)
                    }
                  }}
                  autoComplete="tel"
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                <FieldError message={fieldErrors.phone} />
              </div>
            </div>
          )}

          {/* ── Step: Payment (paid categories only) ── */}
          {step === 'payment' && !isRestaurant && (
            <div className="p-5 space-y-4">
              <BookingFormBanner message={formBanner || error} />
              {/* Order recap */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between text-gray-600"><span>{service.title}</span></div>
                <div className="flex justify-between text-gray-500 text-xs"><span>{dateDisplay}</span></div>
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t mt-2">
                  <span>Total</span>
                  <span>{formatCurrencyWithConversion(customerTotal, service.currency)}</span>
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
                <div className={`flex gap-3 ${fieldErrors.mobileProvider ? 'ring-1 ring-red-500 rounded-xl p-1' : ''}`}>
                  {(['MTN', 'Airtel'] as const).map(p => (
                    <button key={p} type="button" onClick={() => { setProvider(p); setFieldErrors(prev => clearFieldError(prev, 'mobileProvider')); setFormBanner(null) }} className={`flex-1 py-2.5 rounded-xl border font-medium text-sm ${provider === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>{p}</button>
                  ))}
                </div>
                <FieldError message={fieldErrors.mobileProvider} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number *</label>
                {provider && <p className="text-xs text-gray-500 mb-1">Provider: <span className="font-medium">{provider}</span></p>}
                <input type="tel" placeholder="0712345678" className={fieldInputClass(Boolean(fieldErrors.phone), 'w-full px-3 py-3 border rounded-xl text-base')}
                  value={contact.phone}
                  onChange={e => {
                    setContact(c => ({ ...c, phone: e.target.value }))
                    setFieldErrors(prev => clearFieldError(prev, 'phone'))
                    setFormBanner(null)
                    const detected = detectMobileProvider(e.target.value)
                    if (detected) setProvider(detected)
                  }}
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                <FieldError message={fieldErrors.phone} />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 border rounded-xl px-3 py-2">
                <span className="font-medium text-gray-600">Secure payment via MarzPay.</span> You will receive a USSD prompt on your phone.
              </div>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && completedBooking && (
            <div className="p-5">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {isRestaurant ? 'Reservation Confirmed!' : 'Payment Successful!'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isRestaurant
                    ? 'Your table has been reserved. See you soon!'
                    : 'Your booking is confirmed. A confirmation email is on its way.'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium text-right max-w-[60%] line-clamp-2">{service.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dates</span>
                  <span className="text-right">{dateDisplay}</span>
                </div>
                {!isRestaurant && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount paid</span>
                    <span className="font-semibold">{formatCurrencyWithConversion(customerTotal, service.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Booking ref</span>
                  <span className="font-mono text-xs">{completedBooking.id?.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <p className="text-xs text-center text-gray-500 mb-4">
                Questions? Contact us at{' '}
                <a href="mailto:safaris.dirttrails@gmail.com" className="underline">safaris.dirttrails@gmail.com</a>
              </p>
            </div>
          )}
        </div>

        {/* ── Footer (sticky action buttons) ── */}
        <div className="flex-shrink-0 border-t bg-white px-5 py-4 space-y-2">

          {step === 'summary' && (
            <>
              {isRestaurant ? (
                <button
                  type="button"
                  onClick={goFromSummary}
                  disabled={processing}
                  className={`w-full py-3 rounded-xl font-semibold text-base transition ${
                    processing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  {processing
                    ? 'Confirming…'
                    : user
                    ? 'Confirm Reservation'
                    : 'Reserve Table'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goFromSummary}
                  className="w-full py-3 rounded-xl font-semibold text-base transition bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Continue to {user ? 'Payment' : 'Your Details'}
                </button>
              )}
              <button onClick={onClose} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </>
          )}

          {step === 'contact' && (
            <button
              type="button"
              onClick={() => {
                if (isRestaurant) {
                  if (validateRestaurantContact()) void handleRestaurantReserve()
                } else if (validateContact()) {
                  setStep('payment')
                }
              }}
              disabled={processing}
              className={`w-full py-3 rounded-xl font-semibold text-base transition ${
                processing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {isRestaurant ? (processing ? 'Confirming…' : 'Confirm Reservation') : 'Continue to Payment'}
            </button>
          )}

          {step === 'payment' && !isRestaurant && (
            <>
              <button
                  type="button"
                  disabled={processing}
                  onClick={handlePay}
                  className={`w-full py-3 rounded-xl font-semibold text-base transition ${processing ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}
                >
                  {processing
                    ? (pollingMessage || 'Processing…')
                    : `Pay ${formatCurrencyWithConversion(customerTotal, service.currency)} with Mobile Money`}
                </button>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">{error}</div>}
            </>
          )}

          {step === 'done' && (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-50">Close</button>
              <button
                onClick={() => { onClose(); navigate('/') }}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
