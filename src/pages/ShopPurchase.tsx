import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
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
import { BookingFormBanner, FieldError } from '../components/booking/BookingFormFeedback'
import {
  type FieldErrors,
  applyFieldErrors,
  clearFieldError,
  fieldInputClass,
  isValidEmail,
  isValidUgMobileMoneyPhone,
} from '../lib/bookingFormValidation'
import {
  calcShopRentalDays,
  defaultShopCheckoutListingType,
  getShopUnitPrice,
  isShopDualListing,
  type ShopPurchasePrefill,
} from '../lib/shopListingMode'

interface ShopService {
  id: string
  slug?: string
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  location: string
  max_capacity: number
  vendor_id?: string
  buy_price?: number
  rental_price_per_day?: number
  listing_type?: string
  vendors?: { id?: string; business_name: string } | null
  service_categories: { name: string }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function detectProvider(val: string): 'MTN' | 'Airtel' | '' {
  const d = val.replace(/\D/g, '').replace(/^256/, '').replace(/^0/, '')
  const p = d.slice(0, 2)
  if (['76', '77', '78', '39', '46', '31'].includes(p)) return 'MTN'
  if (['70', '74', '75', '20', '50'].includes(p)) return 'Airtel'
  return ''
}

export default function ShopPurchase({ service }: { service: ShopService }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const prefill = (location.state as ShopPurchasePrefill | null) ?? {}

  const [checkoutMode, setCheckoutMode] = useState<'buy' | 'hire'>(
    prefill.listingType === 'hire' ? 'hire' : defaultShopCheckoutListingType(service)
  )
  const [quantity, setQuantity] = useState(Math.max(1, prefill.quantity ?? 1))
  const [startDate, setStartDate] = useState(prefill.startDate ?? '')
  const [endDate, setEndDate] = useState(prefill.endDate ?? '')
  const [deliveryNote, setDeliveryNote] = useState(prefill.deliveryNote ?? '')
  const [currentStep, setCurrentStep] = useState(1)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [mobileProvider, setMobileProvider] = useState<'MTN' | 'Airtel' | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pollingMessage, setPollingMessage] = useState('')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formBanner, setFormBanner] = useState<string | null>(null)
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  const [pricingCalc, setPricingCalc] = useState<any>(null)
  const paymentWatchRef = useRef<MarzpayWatchHandles | null>(null)
  const finaliseRef = useRef(false)

  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const isHire = checkoutMode === 'hire'
  const isDual = isShopDualListing(service)
  const rentalDays = calcShopRentalDays(startDate, endDate)
  const unitPrice = getShopUnitPrice(service, checkoutMode)
  const baseTotal = isHire ? unitPrice * rentalDays * quantity : unitPrice * quantity
  const customerTotal = customerTotalFromUnitPricingCalc(pricingCalc, quantity, baseTotal)
  const serviceFee = touristFeeTotalFromUnitCalc(pricingCalc, quantity, 0)
  const loggedInReady = Boolean(user && contact.name?.trim() && contact.email?.trim())

  useEffect(() => {
    if (!user || !profile) return
    setContact(c => ({
      name: c.name || profile.full_name || '',
      email: c.email || profile.email || '',
      phone: c.phone || (profile as any).phone || '',
    }))
  }, [user, profile])

  useEffect(() => {
    let cancelled = false
    calculatePaymentForAmount(service.id, unitPrice)
      .then(c => { if (!cancelled) setPricingCalc(c) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [service.id, unitPrice])

  const validateStep = (step: number): boolean => {
    const errs: FieldErrors = {}
    if (step === 1) {
      if (isHire) {
        if (!startDate.trim()) errs.startDate = 'Select a rental start date.'
        if (!endDate.trim()) errs.endDate = 'Select a rental end date.'
      }
      if (quantity < 1) errs.quantity = 'Quantity must be at least 1.'
    }
    if (step === 2 && !loggedInReady) {
      if (!contact.name.trim()) errs.contactName = 'Full name is required.'
      if (!contact.email.trim()) errs.contactEmail = 'Email is required.'
      else if (!isValidEmail(contact.email)) errs.contactEmail = 'Enter a valid email address.'
    }
    if (step === 3) {
      if (!mobileProvider) errs.mobileProvider = 'Select MTN or Airtel.'
      if (!phoneNumber.trim()) errs.phone = 'Mobile money number is required.'
      else if (!isValidUgMobileMoneyPhone(phoneNumber)) errs.phone = 'Enter a valid number (e.g. 0712345678).'
    }
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return
    if (currentStep === 1 && loggedInReady) {
      setCurrentStep(3)
      return
    }
    setCurrentStep(s => Math.min(s + 1, 4))
  }

  const handleBack = () => {
    if (currentStep === 3 && loggedInReady) {
      setCurrentStep(1)
      return
    }
    if (currentStep > 1) setCurrentStep(s => s - 1)
    else navigate(`/service/${service.slug || service.id}`)
  }

  const buildOrderPayload = () => {
    const guestContact = user
      ? { tourist_id: user.id }
      : {
          guest_name: contact.name || undefined,
          guest_email: contact.email || undefined,
          guest_phone: contact.phone || undefined,
        }

    const base = {
      service_id: service.id,
      vendor_id: service.vendor_id || service.vendors?.id || '',
      booking_date: new Date().toISOString(),
      guests: quantity,
      total_amount: Math.round(customerTotal),
      currency: normalizeServiceCurrency(service.currency),
      status: 'pending' as const,
      payment_status: 'pending' as const,
      pricing_base_amount: baseTotal,
      platform_fee: pricingCalc ? Math.round(pricingCalc.platform_fee * quantity) : 0,
      special_requests: [
        deliveryNote.trim() || '',
        isHire ? `Rental: ${startDate} to ${endDate}` : '',
      ].filter(Boolean).join('\n') || undefined,
      ...guestContact,
    }

    if (isHire) {
      return { ...base, service_date: startDate, end_date: endDate }
    }
    return { ...base, service_date: new Date().toISOString().split('T')[0] }
  }

  const handlePay = async () => {
    if (isSubmitting || !validateStep(3)) return
    const rawPhone = phoneNumber.trim().replace(/^\+256/, '')
    const phone = rawPhone.startsWith('+') ? rawPhone : `+256${rawPhone.replace(/^0/, '')}`
    setPaymentError(null)
    setIsSubmitting(true)
    setPollingMessage('Creating order…')

    let pending: any = null
    try {
      pending = await createBooking(buildOrderPayload() as any)
    } catch {
      setPaymentError('Failed to create order. Please try again.')
      setIsSubmitting(false)
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
          description: `${service.title} order — ${quantity} item${quantity > 1 ? 's' : ''}`,
          user_id: userId,
        }),
      })
      const result = await res.json().catch(() => ({})) as { success?: boolean; error?: string; data?: { reference: string } }
      if (!res.ok || !result?.success || !result?.data?.reference) {
        throw new Error(result?.error || 'Payment initiation failed')
      }

      setPollingMessage('Check your phone for the USSD prompt…')
      paymentWatchRef.current?.cleanup()
      paymentWatchRef.current = watchMarzpayPayment(result.data.reference, {
        channelPrefix: 'shop_purchase',
        onCompleted: () => {
          if (finaliseRef.current) return
          finaliseRef.current = true
          paymentWatchRef.current?.cleanup()
          setCompletedOrder({ ...pending, status: 'confirmed', payment_status: 'paid' })
          setPollingMessage('')
          setIsSubmitting(false)
          setCurrentStep(4)
        },
        onFailed: () => {
          paymentWatchRef.current?.cleanup()
          cancelBookingOnPaymentFailure(pending.id).catch(console.error)
          setPollingMessage('')
          setIsSubmitting(false)
          setPaymentError('Payment was not completed. Please try again.')
        },
      })
    } catch (err) {
      cancelBookingOnPaymentFailure(pending.id).catch(console.error)
      setPollingMessage('')
      setIsSubmitting(false)
      setPaymentError((err as Error).message || 'Payment failed. Please try again.')
    }
  }

  const orderSummaryLine = isHire
    ? `${formatCurrencyWithConversion(unitPrice, service.currency)}/day × ${rentalDays} day${rentalDays !== 1 ? 's' : ''} × ${quantity} item${quantity !== 1 ? 's' : ''}`
    : `${formatCurrencyWithConversion(unitPrice, service.currency)} × ${quantity} item${quantity !== 1 ? 's' : ''}`

  if (currentStep === 4 && completedOrder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Order confirmed</h1>
          <p className="text-gray-600 mb-6">The vendor will contact you about pickup or delivery.</p>
          <div className="bg-white rounded-xl border p-4 text-sm text-left space-y-2 mb-6">
            <div className="flex justify-between"><span className="text-gray-500">Item</span><span className="font-medium text-right max-w-[60%]">{service.title}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Quantity</span><span>{quantity}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total paid</span><span className="font-semibold">{formatCurrencyWithConversion(customerTotal, service.currency)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Order ref</span><span className="font-mono text-xs">{completedOrder.id?.slice(0, 8).toUpperCase()}</span></div>
          </div>
          <button type="button" onClick={() => navigate('/')} className="w-full py-3 rounded-xl bg-gray-900 text-white font-medium">Back to home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={handleBack} className="p-1 rounded hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{isHire ? 'Reserve equipment' : 'Place order'}</h1>
            <p className="text-xs text-gray-500 truncate max-w-[240px]">{service.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2 text-sm">
          {[
            { n: 1, label: isHire ? 'Rental' : 'Order' },
            { n: 2, label: 'Details' },
            { n: 3, label: 'Pay' },
          ].map(({ n, label }) => (
            <div key={n} className={`flex-1 text-center py-2 rounded-lg border ${currentStep === n ? 'border-emerald-600 text-emerald-700 bg-emerald-50 font-medium' : currentStep > n ? 'border-gray-200 text-gray-600' : 'border-gray-100 text-gray-400'}`}>
              {label}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-4 flex gap-3">
          {service.images?.[0] ? (
            <img src={service.images[0]} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 line-clamp-2">{service.title}</p>
            <p className="text-sm text-gray-500">{service.location}</p>
          </div>
        </div>

        {currentStep === 1 && (
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <BookingFormBanner message={formBanner} />
            {isDual && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setCheckoutMode('buy')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${checkoutMode === 'buy' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}>Buy</button>
                <button type="button" onClick={() => setCheckoutMode('hire')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${checkoutMode === 'hire' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200'}`}>Hire</button>
              </div>
            )}
            {isHire && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input type="date" className={fieldInputClass(Boolean(fieldErrors.startDate), 'w-full px-3 py-2 border rounded-lg')} value={startDate} min={new Date().toISOString().split('T')[0]} onChange={e => { setStartDate(e.target.value); setFieldErrors(p => clearFieldError(p, 'startDate')) }} />
                  <FieldError message={fieldErrors.startDate} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                  <input type="date" className={fieldInputClass(Boolean(fieldErrors.endDate), 'w-full px-3 py-2 border rounded-lg')} value={endDate} min={startDate || new Date().toISOString().split('T')[0]} onChange={e => { setEndDate(e.target.value); setFieldErrors(p => clearFieldError(p, 'endDate')) }} />
                  <FieldError message={fieldErrors.endDate} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-gray-100 font-semibold">−</button>
                <span className="flex-1 text-center font-medium">{quantity} item{quantity !== 1 ? 's' : ''}</span>
                <button type="button" onClick={() => setQuantity(q => Math.min(service.max_capacity || 100, q + 1))} className="w-10 h-10 rounded-lg bg-gray-100 font-semibold">+</button>
              </div>
            </div>
            {!isHire && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery note <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Pickup, delivery address, or instructions" />
              </div>
            )}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>{orderSummaryLine}</span><span>{formatCurrencyWithConversion(baseTotal, service.currency)}</span></div>
              {serviceFee > 0 && (
                <div className="flex justify-between text-gray-500"><span>Service fee</span><span>{formatCurrencyWithConversion(serviceFee, service.currency)}</span></div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 pt-1"><span>Total</span><span>{formatCurrencyWithConversion(customerTotal, service.currency)}</span></div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <BookingFormBanner message={formBanner} />
            {loggedInReady && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Signed in as {contact.email}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
              <input type="text" className={fieldInputClass(Boolean(fieldErrors.contactName), 'w-full px-3 py-3 border rounded-xl')} value={contact.name} onChange={e => { setContact(c => ({ ...c, name: e.target.value })); setFieldErrors(p => clearFieldError(p, 'contactName')) }} disabled={Boolean(user && profile?.full_name)} />
              <FieldError message={fieldErrors.contactName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" className={fieldInputClass(Boolean(fieldErrors.contactEmail), 'w-full px-3 py-3 border rounded-xl')} value={contact.email} onChange={e => { setContact(c => ({ ...c, email: e.target.value })); setFieldErrors(p => clearFieldError(p, 'contactEmail')) }} disabled={Boolean(user && profile?.email)} />
              <FieldError message={fieldErrors.contactEmail} />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="bg-white rounded-xl border p-4 space-y-4">
            <BookingFormBanner message={formBanner || paymentError} />
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between font-semibold"><span>Total due</span><span>{formatCurrencyWithConversion(customerTotal, service.currency)}</span></div>
              <p className="text-xs text-gray-500 mt-1">{quantity} item{quantity !== 1 ? 's' : ''}{isHire ? ` · ${rentalDays} day rental` : ''}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile money provider</label>
              <div className="flex gap-2">
                {(['MTN', 'Airtel'] as const).map(p => (
                  <button key={p} type="button" onClick={() => { setMobileProvider(p); setFieldErrors(prev => clearFieldError(prev, 'mobileProvider')) }} className={`flex-1 py-2.5 rounded-xl border font-medium text-sm ${mobileProvider === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>{p}</button>
                ))}
              </div>
              <FieldError message={fieldErrors.mobileProvider} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile money number *</label>
              <input type="tel" placeholder="0712345678" className={fieldInputClass(Boolean(fieldErrors.phone), 'w-full px-3 py-3 border rounded-xl')} value={phoneNumber} onChange={e => {
                setPhoneNumber(e.target.value)
                setFieldErrors(p => clearFieldError(p, 'phone'))
                const detected = detectProvider(e.target.value)
                if (detected) setMobileProvider(detected)
              }} />
              <FieldError message={fieldErrors.phone} />
            </div>
            <p className="text-xs text-gray-500">Secure payment via MarzPay. You will receive a USSD prompt on your phone.</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {currentStep < 3 ? (
            <button type="button" onClick={handleNext} className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800">
              Continue
            </button>
          ) : (
            <button type="button" onClick={handlePay} disabled={isSubmitting} className={`w-full py-3 rounded-xl font-semibold ${isSubmitting ? 'bg-gray-200 text-gray-400' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
              {isSubmitting ? (pollingMessage || 'Processing…') : `Pay ${formatCurrencyWithConversion(customerTotal, service.currency)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
