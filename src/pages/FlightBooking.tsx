import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { calculatePaymentForAmount } from '../lib/pricingService'
import { formatCurrencyWithConversion } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { createBooking } from '../lib/database'
import { supabase } from '../lib/supabaseClient'
import { cancelBookingOnPaymentFailure } from '../services/BookingService'
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
  images: string[]; location: string; max_capacity: number;
  vendor_id?: string; vendors?: { id?: string; business_name: string; business_phone: string; business_email: string } | null;
  service_categories: { name: string }
}

const FLIGHT_CLASSES = ['Economy', 'Business', 'First Class / VIP Charter']
const TRIP_TYPES = ['One-way', 'Round-trip']

export default function FlightBooking({ service }: { service: ServiceDetail }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pollingMessage, setPollingMessage] = useState('')
  const [completedBooking, setCompletedBooking] = useState<any | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formBanner, setFormBanner] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const backupPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finaliseInFlightRef = useRef(false)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  const [pricingCalc, setPricingCalc] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    tripType: 'One-way', departureDate: '', returnDate: '', departureFrom: '',
    destination: '', passengers: 1, flightClass: 'Economy', cargoNotes: '',
    specialRequests: '', contactName: '', contactEmail: '', contactPhone: '',
    mobileProvider: '',
  })

  useEffect(() => {
    if (!user || !profile) return
    setFormData(p => ({ ...p, contactName: profile.full_name || '', contactEmail: profile.email || '' }))
  }, [user, profile])

  useEffect(() => {
    const state = location.state as { departureDate?: string; passengers?: number } | null
    if (!state) return
    setFormData(p => ({
      ...p,
      departureDate: state.departureDate || p.departureDate,
      passengers: state.passengers ?? p.passengers,
    }))
  }, [location.state])

  useEffect(() => {
    let cancelled = false
    calculatePaymentForAmount(service.id, Number(service.price || 0)).then(c => { if (!cancelled) setPricingCalc(c) }).catch(() => {})
    return () => { cancelled = true }
  }, [service.id, service.price])

  const baseTotal = service.price * formData.passengers
  const grandTotal = pricingCalc
    ? (Number(pricingCalc.total_customer_payment || service.price) * formData.passengers)
    : baseTotal

  const set = (field: string, value: any) => {
    setFieldErrors(prev => clearFieldError(prev, field))
    setFormBanner(null)
    setFormData(p => ({ ...p, [field]: value }))
  }

  const validateStep = (step: number): boolean => {
    const errs: FieldErrors = {}
    if (step === 1) {
      if (!formData.departureFrom.trim()) errs.departureFrom = 'Departure location is required.'
      if (!formData.destination.trim()) errs.destination = 'Destination is required.'
      if (!formData.departureDate) errs.departureDate = 'Departure date is required.'
      if (formData.tripType === 'Round-trip' && !formData.returnDate) errs.returnDate = 'Return date is required.'
      if (!user) {
        if (!formData.contactName.trim()) errs.contactName = 'Full name is required.'
        if (!formData.contactEmail.trim()) errs.contactEmail = 'Email is required.'
        else if (!isValidEmail(formData.contactEmail)) errs.contactEmail = 'Enter a valid email address.'
      }
    }
    if (step === 2) {
      if (!phoneNumber.trim()) errs.phone = 'Mobile money number is required.'
      else if (!isValidUgMobileMoneyPhone(phoneNumber)) errs.phone = 'Enter a valid number (e.g. 0712345678).'
      if (!formData.mobileProvider) errs.mobileProvider = 'Select MTN or Airtel.'
    }
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const detectProvider = (val: string) => {
    const d = val.replace(/\D/g, '').replace(/^256/, '').replace(/^0/, '')
    const p = d.slice(0, 2)
    if (['76','77','78','39','46','31'].includes(p)) set('mobileProvider', 'MTN')
    else if (['70','74','75','20','50'].includes(p)) set('mobileProvider', 'Airtel')
  }

  const handleCompleteBooking = async () => {
    if (isSubmitting) return
    if (!validateStep(2)) return
    const rawPhone = phoneNumber.trim().replace(/^\+256/, '')
    const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`
    if (!phone || phone.length < 12) { setPaymentError('Please enter a valid mobile money number.'); return }
    if (!formData.mobileProvider) { setPaymentError('Please select MTN or Airtel.'); return }
    setPaymentError(null)
    setIsSubmitting(true)
    setPollingMessage('Creating booking…')

    const specialRequests = [
      `From: ${formData.departureFrom}`,
      `To: ${formData.destination}`,
      `Class: ${formData.flightClass}`,
      formData.tripType === 'Round-trip' && formData.returnDate ? `Return: ${formData.returnDate}` : '',
      formData.cargoNotes ? `Cargo/Baggage: ${formData.cargoNotes}` : '',
      formData.specialRequests || '',
    ].filter(Boolean).join('\n')

    let pendingBooking: any = null
    try {
      pendingBooking = await createBooking({
        service_id: service.id, vendor_id: service.vendor_id || service.vendors?.id || '',
        booking_date: new Date().toISOString(), service_date: formData.departureDate,
        guests: formData.passengers, total_amount: grandTotal, currency: service.currency,
        status: 'pending', payment_status: 'pending',
        special_requests: specialRequests,
        tourist_id: user?.id,
        guest_name: user ? undefined : formData.contactName || undefined,
        guest_email: user ? undefined : formData.contactEmail || undefined,
        guest_phone: user ? undefined : phone,
        pickup_location: formData.departureFrom,
        dropoff_location: formData.destination,
        end_date: formData.tripType === 'Round-trip' ? formData.returnDate : undefined,
        pricing_base_amount: baseTotal,
        platform_fee: pricingCalc ? Math.round(pricingCalc.platform_fee * formData.passengers) : 0,
      } as any)
    } catch (e) { setPaymentError('Failed to create booking. Please try again.'); setIsSubmitting(false); return }

    setPollingMessage('Initiating payment…')
    try {
      const { data: session } = await supabase.auth.getSession()
      const collectRes = await fetch(`${supabaseUrl}/functions/v1/marzpay-collect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ amount: Math.round(grandTotal), phone_number: phone, booking_id: pendingBooking.id, description: `${service.title} — ${formData.departureFrom} to ${formData.destination}`, user_id: session?.session?.user?.id }),
      })
      const result = await collectRes.json().catch(() => ({})) as { success?: boolean; error?: string; data?: { reference: string } }
      if (!collectRes.ok || !result?.success || !result?.data?.reference) throw new Error(result?.error || 'Payment initiation failed')
      const ref = result.data.reference
      setPollingMessage('Check your phone for the USSD prompt…')

      const checkStatus = async () => {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/marzpay-payment-status?reference=${encodeURIComponent(ref)}`, { headers: { Authorization: `Bearer ${supabaseAnonKey}` } })
          const d = await res.json().catch(() => ({})) as { status?: string }
          return d?.status === 'completed' ? 'completed' : d?.status === 'failed' ? 'failed' : null
        } catch { return null }
      }

      const onSuccess = () => {
        if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
        if (finaliseInFlightRef.current) return
        finaliseInFlightRef.current = true
        setCompletedBooking({ ...pendingBooking, status: 'confirmed', payment_status: 'paid' })
        setPollingMessage('')
        setCurrentStep(3)
        setIsSubmitting(false)
      }
      const onFail = () => {
        if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null }
        cancelBookingOnPaymentFailure(pendingBooking.id).catch(console.error)
        setPollingMessage(''); setIsSubmitting(false)
        setPaymentError('Payment was not completed or was declined. Please try again.')
      }

      const channel = supabase.channel(`payment_flt_${ref}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: `reference=eq.${ref}` }, (payload) => {
          const row = payload.new as { status: string }
          if (row.status === 'completed') { channel.unsubscribe(); onSuccess() }
          else if (row.status === 'failed') { channel.unsubscribe(); onFail() }
        }).subscribe()

      const immediate = await checkStatus()
      if (immediate === 'completed') { channel.unsubscribe(); onSuccess(); return }
      if (immediate === 'failed') { channel.unsubscribe(); onFail(); return }

      backupPollRef.current = setInterval(async () => {
        const s = await checkStatus()
        if (s === 'completed') { channel.unsubscribe(); onSuccess() }
        else if (s === 'failed') { channel.unsubscribe(); onFail() }
      }, 4000)
      setTimeout(() => { if (backupPollRef.current) { clearInterval(backupPollRef.current); backupPollRef.current = null } }, 120000)
    } catch (err) {
      cancelBookingOnPaymentFailure(pendingBooking.id).catch(console.error)
      setPollingMessage(''); setIsSubmitting(false)
      setPaymentError((err as Error).message || 'Payment failed. Please try again.')
    }
  }

  if (currentStep === 3 && completedBooking) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BookingReceipt booking={completedBooking} />
          <button onClick={() => navigate('/')} className="mt-6 w-full py-3 bg-gray-900 text-white rounded-lg font-medium">Back to Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => currentStep > 1 ? setCurrentStep(s => s - 1) : navigate(`/service/${service.slug || service.id}`)} className="p-2 border border-gray-300 rounded hover:bg-gray-50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{service.title}</h1>
            <p className="text-sm text-gray-500">{service.location}</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-3 mb-6">
          {['Flight Details', 'Payment'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep > i + 1 ? 'bg-green-600 text-white' : currentStep === i + 1 ? 'border-2 border-blue-600 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                {currentStep > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${currentStep === i + 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{label}</span>
              {i < 1 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">

          {/* Step 1 — Flight Details */}
          {currentStep === 1 && (
            <>
              <BookingFormBanner message={formBanner} />
              <h2 className="text-lg font-semibold">Flight Details</h2>

              {/* Trip type */}
              <div className="flex gap-3">
                {TRIP_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => set('tripType', t)} className={`flex-1 py-2.5 rounded-lg border font-medium text-sm transition ${formData.tripType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>{t}</button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
                  <input type="text" placeholder="e.g. Entebbe International" className={fieldInputClass(Boolean(fieldErrors.departureFrom))}
                    value={formData.departureFrom} onChange={e => set('departureFrom', e.target.value)} aria-invalid={Boolean(fieldErrors.departureFrom)} />
                  <FieldError message={fieldErrors.departureFrom} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                  <input type="text" placeholder="e.g. Kidepo Valley Airstrip" className={fieldInputClass(Boolean(fieldErrors.destination))}
                    value={formData.destination} onChange={e => set('destination', e.target.value)} aria-invalid={Boolean(fieldErrors.destination)} />
                  <FieldError message={fieldErrors.destination} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date *</label>
                  <input type="date" className={fieldInputClass(Boolean(fieldErrors.departureDate))}
                    value={formData.departureDate} onChange={e => set('departureDate', e.target.value)} min={new Date().toISOString().split('T')[0]} aria-invalid={Boolean(fieldErrors.departureDate)} />
                  <FieldError message={fieldErrors.departureDate} />
                </div>
                {formData.tripType === 'Round-trip' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Date *</label>
                    <input type="date" className={fieldInputClass(Boolean(fieldErrors.returnDate))}
                      value={formData.returnDate} onChange={e => set('returnDate', e.target.value)} min={formData.departureDate || new Date().toISOString().split('T')[0]} aria-invalid={Boolean(fieldErrors.returnDate)} />
                    <FieldError message={fieldErrors.returnDate} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passengers *</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => set('passengers', Math.max(1, formData.passengers - 1))} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50">−</button>
                    <span className="text-xl font-semibold w-8 text-center">{formData.passengers}</span>
                    <button type="button" onClick={() => set('passengers', Math.min(service.max_capacity || 20, formData.passengers + 1))} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base bg-white" value={formData.flightClass} onChange={e => set('flightClass', e.target.value)}>
                    {FLIGHT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Baggage Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" placeholder="e.g. Camera equipment, oversized luggage…" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
                  value={formData.cargoNotes} onChange={e => set('cargoNotes', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={2} placeholder="Wheelchair access, dietary preferences, meeting point…" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm resize-none"
                  value={formData.specialRequests} onChange={e => set('specialRequests', e.target.value)} />
              </div>

              {/* Contact (non-logged-in) */}
              {!user && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Contact Details</p>
                  <div>
                    <input type="text" placeholder="Full name *" className={fieldInputClass(Boolean(fieldErrors.contactName))} value={formData.contactName} onChange={e => set('contactName', e.target.value)} aria-invalid={Boolean(fieldErrors.contactName)} />
                    <FieldError message={fieldErrors.contactName} />
                  </div>
                  <div>
                    <input type="email" placeholder="Email *" className={fieldInputClass(Boolean(fieldErrors.contactEmail))} value={formData.contactEmail} onChange={e => set('contactEmail', e.target.value)} aria-invalid={Boolean(fieldErrors.contactEmail)} />
                    <FieldError message={fieldErrors.contactEmail} />
                  </div>
                </div>
              )}

              {/* Price summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600"><span>{formatCurrencyWithConversion(service.price, service.currency)} × {formData.passengers} passenger{formData.passengers !== 1 ? 's' : ''}</span><span>{formatCurrencyWithConversion(grandTotal, service.currency)}</span></div>
                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200"><span>Total</span><span>{formatCurrencyWithConversion(grandTotal, service.currency)}</span></div>
              </div>

              <button type="button" onClick={() => { if (validateStep(1)) setCurrentStep(2) }}
                className="w-full py-3 rounded-lg font-semibold text-base transition bg-blue-600 text-white hover:bg-blue-700">
                Continue to Payment
              </button>
            </>
          )}

          {/* Step 2 — Payment */}
          {currentStep === 2 && (
            <>
              <BookingFormBanner message={formBanner || paymentError} />
              <h2 className="text-lg font-semibold">Payment</h2>

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between text-gray-600"><span>{formData.departureFrom} → {formData.destination}</span></div>
                <div className="flex justify-between text-gray-600"><span>{formData.departureDate}{formData.tripType === 'Round-trip' && formData.returnDate ? ` · Return ${formData.returnDate}` : ''}</span></div>
                <div className="flex justify-between text-gray-600"><span>{formData.passengers} passenger{formData.passengers !== 1 ? 's' : ''} · {formData.flightClass}</span></div>
                <div className="flex justify-between font-semibold pt-2 border-t border-gray-200 mt-2"><span>Total</span><span>{formatCurrencyWithConversion(grandTotal, service.currency)}</span></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Provider</label>
                <div className="flex gap-3 mb-3">
                  {['MTN','Airtel'].map(p => (
                    <button key={p} type="button" onClick={() => set('mobileProvider', p)} className={`flex-1 py-2.5 rounded-lg border font-medium text-sm ${formData.mobileProvider === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>{p}</button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money Number *</label>
                {formData.mobileProvider && <p className="text-xs text-gray-500 mb-1">Provider: <span className="font-medium">{formData.mobileProvider}</span></p>}
                <input type="tel" placeholder="0712345678" className={fieldInputClass(Boolean(fieldErrors.phone))}
                  value={phoneNumber} onChange={e => { setPhoneNumber(e.target.value); setFieldErrors(p => clearFieldError(p, 'phone')); detectProvider(e.target.value) }} aria-invalid={Boolean(fieldErrors.phone)} />
                <FieldError message={fieldErrors.phone} />
                <FieldError message={fieldErrors.mobileProvider} />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 border rounded px-3 py-2">
                <span className="font-medium text-gray-600">Secure payment via MarzPay.</span> Contact <a href="mailto:safaris.dirttrails@gmail.com" className="underline">safaris.dirttrails@gmail.com</a> for cancellations or changes.
              </div>

              <button type="button" disabled={isSubmitting} onClick={handleCompleteBooking}
                className={`w-full py-3 rounded-lg font-semibold text-base transition ${isSubmitting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {isSubmitting ? (pollingMessage || 'Processing…') : `Pay ${formatCurrencyWithConversion(grandTotal, service.currency)} with Mobile Money`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
