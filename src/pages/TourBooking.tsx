import { useState, useEffect, useRef } from 'react'
import { calculatePaymentForAmount, customerTotalFromUnitPricingCalc, touristFeeTotalFromUnitCalc } from '../lib/pricingService'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, CreditCard } from 'lucide-react'
import { formatCurrencyWithConversion } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { createBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'
import { cancelBookingOnPaymentFailure } from '../services/BookingService'
import { watchMarzpayPayment, type MarzpayWatchHandles } from '../hooks/watchMarzpayPayment'
import BookingReceipt from '../components/BookingReceipt'
import { BookingFormBanner, FieldError } from '../components/booking/BookingFormFeedback'
import {
  type FieldErrors,
  applyFieldErrors,
  clearFieldError,
  fieldInputClass,
  isValidEmail,
  isValidUgMobileMoneyPhone,
} from '../lib/bookingFormValidation'

interface ServiceDetail {
  id: string; slug?: string; title: string; description: string; price: number; currency: string;
  images: string[]; location: string; duration_hours: number; max_capacity: number;
  vendor_id?: string; vendors?: { id?: string; business_name: string; business_phone: string; business_email: string } | null;
  service_categories: { name: string }
}

export default function TourBooking({ service }: { service: ServiceDetail }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [pollingMessage, setPollingMessage] = useState('')
  const [completedBooking, setCompletedBooking] = useState<any | null>(null)
  const paymentWatchRef = useRef<MarzpayWatchHandles | null>(null)
  const finaliseInFlightRef = useRef(false)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  const [formData, setFormData] = useState({
    tourDate: '', travelers: 1, pickupLocation: '', specialRequests: '',
    contactName: '', contactEmail: '', contactPhone: '',
    mobileProvider: '', paymentMethod: 'mobile',
  })
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formBanner, setFormBanner] = useState<string | null>(null)
  const [pricingCalc, setPricingCalc] = useState<any | null>(null)

  useEffect(() => {
    if (!user || !profile) return
    setFormData(p => ({ ...p, contactName: profile.full_name || '', contactEmail: profile.email || '' }))
  }, [user, profile])

  useEffect(() => {
    const { selectedDate, guests } = (location.state as any) || {}
    if (selectedDate || guests) setFormData(p => ({ ...p, ...(selectedDate ? { tourDate: selectedDate } : {}), ...(guests ? { travelers: guests } : {}) }))
  }, [location.state])

  useEffect(() => {
    let cancelled = false
    calculatePaymentForAmount(service.id, Number(service.price || 0)).then(c => { if (!cancelled) setPricingCalc(c) }).catch(() => {})
    return () => { cancelled = true }
  }, [service.id, service.price])

  const totalPrice = service.price * formData.travelers
  const customerPaysTotal = customerTotalFromUnitPricingCalc(pricingCalc, formData.travelers, totalPrice)
  const touristFeeTotal = touristFeeTotalFromUnitCalc(pricingCalc, formData.travelers, 0)
  const loggedInReady = Boolean(user && profile?.full_name && profile?.email)

  const set = (field: string, value: any) => {
    setFieldErrors(prev => clearFieldError(prev, field))
    setFormBanner(null)
    setFormData(p => ({ ...p, [field]: value }))
  }

  const validateStep = (step: number): boolean => {
    const errs: FieldErrors = {}
    if (step === 1 && !formData.tourDate) errs.tourDate = 'Tour date is required.'
    if (step === 2 && !loggedInReady) {
      if (!formData.contactName.trim()) errs.contactName = 'Full name is required.'
      if (!formData.contactEmail.trim()) errs.contactEmail = 'Email is required.'
      else if (!isValidEmail(formData.contactEmail)) errs.contactEmail = 'Enter a valid email address.'
    }
    if (step === 3 && formData.paymentMethod === 'mobile') {
      if (!phoneNumber.trim()) errs.phone = 'Mobile money number is required.'
      else if (!isValidUgMobileMoneyPhone(phoneNumber)) errs.phone = 'Enter a valid number (e.g. 0712345678).'
      if (!formData.mobileProvider) errs.mobileProvider = 'Select MTN or Airtel.'
    }
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return
    if (currentStep === 1 && loggedInReady) { setCurrentStep(3); return }
    setCurrentStep(s => Math.min(s + 1, 5))
  }
  const handleBack = () => {
    if (currentStep === 3 && loggedInReady) { setCurrentStep(1); return }
    if (currentStep > 1) setCurrentStep(s => s - 1)
    else navigate(`/service/${service.slug || service.id}`)
  }

  const detectProvider = (val: string) => {
    const d = val.replace(/\D/g, '').replace(/^256/, '').replace(/^0/, '')
    const p = d.slice(0, 2)
    if (['76','77','78','39','46','31'].includes(p)) set('mobileProvider', 'MTN')
    else if (['70','74','75','20','50'].includes(p)) set('mobileProvider', 'Airtel')
  }

  const handleCompleteBooking = async () => {
    if (isSubmitting) return
    if (formData.paymentMethod === 'mobile') {
      if (!validateStep(3)) return
      const rawPhone = phoneNumber.trim().replace(/^\+256/, '')
      const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`
      setPaymentError(null)
      setIsSubmitting(true)
      setPollingMessage('Creating booking…')

      let pendingBooking: any = null
      try {
        pendingBooking = await createBooking({
          service_id: service.id, vendor_id: service.vendor_id || service.vendors?.id || '',
          booking_date: new Date().toISOString(), service_date: formData.tourDate,
          guests: formData.travelers, total_amount: customerPaysTotal, currency: service.currency,
          status: 'pending', payment_status: 'pending',
          special_requests: [formData.pickupLocation ? `Pickup: ${formData.pickupLocation}` : '', formData.specialRequests].filter(Boolean).join('\n') || undefined,
          tourist_id: user?.id,
          guest_name: user ? undefined : formData.contactName || undefined,
          guest_email: user ? undefined : formData.contactEmail || undefined,
          guest_phone: user ? undefined : (phone || undefined),
          pricing_base_amount: totalPrice,
          platform_fee: pricingCalc ? Math.round(pricingCalc.platform_fee * formData.travelers) : 0,
        })
      } catch (e) { setPaymentError('Failed to create booking. Please try again.'); setIsSubmitting(false); return }

      setPollingMessage('Initiating payment…')
      try {
        const { data: session } = await supabase.auth.getSession()
        const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
          body: JSON.stringify({ amount: Math.round(customerPaysTotal), phone_number: phone, booking_id: pendingBooking.id, description: `${service.title} tour — ${formData.travelers} traveler${formData.travelers > 1 ? 's' : ''}`, user_id: session?.session?.user?.id }),
        })
        const result = await collectRes.json().catch(() => ({})) as { success?: boolean; error?: string; data?: { reference: string } }
        if (!collectRes.ok || !result?.success || !result?.data?.reference) throw new Error(result?.error || 'Payment initiation failed')
        const ref = result.data.reference
        setPollingMessage('Check your phone for the USSD prompt…')

        const onSuccess = () => {
          paymentWatchRef.current?.cleanup()
          finaliseBooking(pendingBooking)
        }
        const onFail = () => {
          paymentWatchRef.current?.cleanup()
          cancelBookingOnPaymentFailure(pendingBooking.id).catch(console.error)
          setPollingMessage(''); setIsSubmitting(false)
          setPaymentError('Payment was not completed or was declined. Please try again.')
        }

        paymentWatchRef.current?.cleanup()
        paymentWatchRef.current = watchMarzpayPayment(ref, {
          channelPrefix: 'payment_tour',
          onCompleted: onSuccess,
          onFailed: onFail,
        })
      } catch (err) {
        cancelBookingOnPaymentFailure(pendingBooking.id).catch(console.error)
        setPollingMessage(''); setIsSubmitting(false)
        setPaymentError((err as Error).message || 'Payment failed. Please try again.')
      }
      return
    }
    setIsSubmitting(true)
    await finaliseBooking(null)
  }

  const finaliseBooking = async (existingBooking: any) => {
    if (finaliseInFlightRef.current) return
    finaliseInFlightRef.current = true
    try {
      let booking = existingBooking
      if (!booking) {
        booking = await createBooking({
          service_id: service.id, vendor_id: service.vendor_id || service.vendors?.id || '',
          booking_date: new Date().toISOString(), service_date: formData.tourDate,
          guests: formData.travelers, total_amount: customerPaysTotal, currency: service.currency,
          status: 'confirmed', payment_status: 'pending',
          special_requests: [formData.pickupLocation ? `Pickup: ${formData.pickupLocation}` : '', formData.specialRequests].filter(Boolean).join('\n') || undefined,
          tourist_id: user?.id,
          guest_name: user ? undefined : formData.contactName || undefined,
          guest_email: user ? undefined : formData.contactEmail || undefined,
        })
      }
      setCompletedBooking(existingBooking ? { ...existingBooking, status: 'confirmed', payment_status: 'paid' } : booking)
      setPollingMessage('')
      setCurrentStep(5)
    } catch (err) {
      finaliseInFlightRef.current = false
      setPaymentError('Failed to complete booking. Please try again.')
    } finally { setIsSubmitting(false) }
  }

  if (currentStep === 5 && completedBooking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BookingReceipt booking={completedBooking} />
          <button onClick={() => navigate('/')} className="mt-6 w-full py-3 bg-gray-900 text-white rounded-lg font-medium">Back to Home</button>
        </div>
      </div>
    )
  }

  const steps = ['Tour Details', 'Your Details', 'Payment', 'Processing', 'Confirmation']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleBack} className="p-2 border border-gray-300 rounded hover:bg-gray-50"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold">{service.title}</h1>
            <p className="text-sm text-gray-500">{service.location}</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {[1,2,3].map(n => (
            <div key={n} className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep > n ? 'bg-green-600 text-white' : currentStep === n ? 'border-2 border-blue-600 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                {currentStep > n ? '✓' : n}
              </div>
              <span className={`text-sm hidden sm:block ${currentStep === n ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{steps[n-1]}</span>
              {n < 3 && <div className="w-8 h-px bg-gray-200 flex-shrink-0" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">

          {/* Step 1 — Tour Details */}
          {currentStep === 1 && (
            <>
              <BookingFormBanner message={formBanner} />
              <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" />Tour Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tour Date *</label>
                  <input type="date" className={fieldInputClass(Boolean(fieldErrors.tourDate))}
                    value={formData.tourDate} onChange={e => set('tourDate', e.target.value)} min={new Date().toISOString().split('T')[0]} aria-invalid={Boolean(fieldErrors.tourDate)} />
                  <FieldError message={fieldErrors.tourDate} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Travelers *</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => set('travelers', Math.max(1, formData.travelers - 1))} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50">−</button>
                    <span className="text-xl font-semibold w-8 text-center">{formData.travelers}</span>
                    <button type="button" onClick={() => set('travelers', Math.min(service.max_capacity || 50, formData.travelers + 1))} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50">+</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. Kampala city centre, specific hotel name…" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
                  value={formData.pickupLocation} onChange={e => set('pickupLocation', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={3} placeholder="Dietary requirements, accessibility needs, anything we should know…" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm resize-none"
                  value={formData.specialRequests} onChange={e => set('specialRequests', e.target.value)} />
              </div>

              {/* Pricing summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formatCurrencyWithConversion(service.price, service.currency)} × {formData.travelers} traveler{formData.travelers > 1 ? 's' : ''}</span>
                  <span>{formatCurrencyWithConversion(totalPrice, service.currency)}</span>
                </div>
                {touristFeeTotal > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Booking fee</span><span>{formatCurrencyWithConversion(touristFeeTotal, service.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                  <span>Total</span><span>{formatCurrencyWithConversion(customerPaysTotal, service.currency)}</span>
                </div>
              </div>

              <button type="button" onClick={handleNext} className="w-full py-3 rounded-lg font-semibold text-base transition bg-blue-600 text-white hover:bg-blue-700">
                Continue
              </button>
            </>
          )}

          {/* Step 2 — Contact Details */}
          {currentStep === 2 && (
            <>
              <BookingFormBanner message={formBanner} />
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />Your Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" className={fieldInputClass(Boolean(fieldErrors.contactName))} value={formData.contactName} onChange={e => set('contactName', e.target.value)} autoComplete="name" aria-invalid={Boolean(fieldErrors.contactName)} />
                  <FieldError message={fieldErrors.contactName} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" className={fieldInputClass(Boolean(fieldErrors.contactEmail))} value={formData.contactEmail} onChange={e => set('contactEmail', e.target.value)} autoComplete="email" aria-invalid={Boolean(fieldErrors.contactEmail)} />
                  <FieldError message={fieldErrors.contactEmail} />
                </div>
              </div>
              <button type="button" onClick={handleNext} className="w-full py-3 rounded-lg font-semibold text-base transition bg-blue-600 text-white hover:bg-blue-700">
                Continue to Payment
              </button>
            </>
          )}

          {/* Step 3 — Payment */}
          {currentStep === 3 && (
            <>
              <BookingFormBanner message={formBanner || paymentError} />
              <h2 className="text-lg font-semibold flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-600" />Payment</h2>
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-600"><span>{formData.tourDate} · {formData.travelers} traveler{formData.travelers !== 1 ? 's' : ''}</span></div>
                <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrencyWithConversion(customerPaysTotal, service.currency)}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
                <div className="flex gap-3 mb-3">
                  {['MTN','Airtel'].map(p => (
                    <button key={p} type="button" onClick={() => set('mobileProvider', p)} className={`flex-1 py-2.5 rounded-lg border font-medium text-sm ${formData.mobileProvider === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>{p}</button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number *</label>
                {formData.mobileProvider && <p className="text-xs text-gray-500 mb-1">Provider: <span className="font-medium">{formData.mobileProvider}</span> (auto-detected)</p>}
                <input type="tel" placeholder="0712345678" className={fieldInputClass(Boolean(fieldErrors.phone))}
                  value={phoneNumber} onChange={e => { setPhoneNumber(e.target.value); setFieldErrors(p => clearFieldError(p, 'phone')); detectProvider(e.target.value) }} autoComplete="tel" aria-invalid={Boolean(fieldErrors.phone)} />
                <FieldError message={fieldErrors.phone} />
                <FieldError message={fieldErrors.mobileProvider} />
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 border rounded px-3 py-2">
                <span className="font-medium text-gray-600">Secure payment via MarzPay.</span> Free cancellation up to 24 hours before your tour — contact <a href="mailto:safaris.dirttrails@gmail.com" className="underline">safaris.dirttrails@gmail.com</a>.
              </div>
              <button type="button" disabled={isSubmitting} onClick={handleCompleteBooking}
                className={`w-full py-3 rounded-lg font-semibold text-base transition ${isSubmitting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {isSubmitting ? (pollingMessage || 'Processing…') : `Pay ${formatCurrencyWithConversion(customerPaysTotal, service.currency)} with Mobile Money`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
