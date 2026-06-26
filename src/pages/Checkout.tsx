import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useOrderQuery, useOrderQueryClient, orderQueryKey } from '../hooks/useOrderQuery'
import { useOrderPaymentFlow } from '../hooks/useOrderPaymentFlow'
import { PageSkeleton } from '../components/SkeletonLoader'
import { calculatePaymentForAmount } from '../lib/pricingService'
import { formatCurrencyWithConversion } from '../lib/utils'
import { BookingFormBanner, FieldError } from '../components/booking/BookingFormFeedback'
import {
  type FieldErrors,
  applyFieldErrors,
  clearFieldError,
  fieldInputClass,
  isValidEmail,
  isValidUgMobileMoneyPhone,
} from '../lib/bookingFormValidation'

function detectMobileProvider(digits: string): 'MTN' | 'Airtel' | '' {
  const local = digits.startsWith('256') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits
  if (local.length < 2) return ''
  const p = local.slice(0, 2)
  if (['76', '77', '78', '39', '46', '31'].includes(p)) return 'MTN'
  if (['70', '74', '75', '20', '50'].includes(p)) return 'Airtel'
  return ''
}

function formatPhone(raw: string): string {
  const trimmed = raw.trim().replace(/^\+256/, '')
  return trimmed.startsWith('+') ? trimmed : `+256${trimmed.replace(/^0/, '')}`
}

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const queryClient = useOrderQueryClient()
  const { data, isLoading, error } = useOrderQuery(orderId)
  const order = data?.order ?? null
  const items = data?.items ?? []
  const allTicketTypes = data?.allTicketTypes ?? []
  const [buyer, setBuyer] = useState({ fullName: '', email: '', phone: '' })
  const [mobileProvider, setMobileProvider] = useState('')
  const [showAllTickets, setShowAllTickets] = useState(false)
  const [ticketCalculations, setTicketCalculations] = useState<Record<string, any>>({})
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formBanner, setFormBanner] = useState<string | null>(null)
  const { profile } = useAuth()
  const {
    processing,
    paymentError,
    setPaymentError,
    pollingMessage,
    paymentSuccess,
    setPaymentSuccess,
    payOrder,
  } = useOrderPaymentFlow(orderId)

  useEffect(() => {
    if (!data?.order || !profile) return
    const profilePhone = String((profile as any).phone || '')
    setBuyer(b => ({
      fullName: b.fullName || profile.full_name || '',
      email: b.email || profile.email || '',
      phone: b.phone || profilePhone,
    }))
    if (profilePhone) {
      const provider = detectMobileProvider(profilePhone.replace(/\D/g, ''))
      if (provider) setMobileProvider(provider)
    }
  }, [data?.order, profile])

  useEffect(() => {
    if (!order?._service?.id) return
    const uniqueTicketTypeIds = Array.from(new Set(items.map((it: any) => it.ticket_type_id)))
    let cancelled = false

    const fetchCalculations = async () => {
      const entries = await Promise.all(
        uniqueTicketTypeIds.map(async (ttId) => {
          const tt = allTicketTypes.find((t: any) => t.id === ttId)
          if (!tt) return [ttId, null] as const
          try {
            const calc = await calculatePaymentForAmount(order._service.id, Number(tt.price || 0))
            return [ttId, calc] as const
          } catch (err) {
            console.error('Failed to calculate ticket pricing for', ttId, err)
            return [ttId, null] as const
          }
        })
      )
      if (!cancelled) setTicketCalculations(Object.fromEntries(entries.filter(([, v]) => v != null)))
    }

    fetchCalculations()
    return () => { cancelled = true }
  }, [items, allTicketTypes, order?._service?.id])

  const ticketPricingReady =
    items.length === 0 ||
    items.every(
      (it: any) =>
        Number(it.quantity ?? 0) === 0 ||
        (ticketCalculations[it.ticket_type_id] && ticketCalculations[it.ticket_type_id].success !== false)
    )

  const hasTickets = items.some((it: any) => Number(it.quantity ?? 0) > 0)

  const validateCheckout = (): boolean => {
    const errs: FieldErrors = {}
    if (!buyer.fullName.trim()) errs.fullName = 'Full name is required.'
    if (!buyer.email.trim()) errs.email = 'Email is required.'
    else if (!isValidEmail(buyer.email)) errs.email = 'Enter a valid email address.'
    if (!buyer.phone.trim()) errs.phone = 'Mobile money number is required.'
    else if (!isValidUgMobileMoneyPhone(buyer.phone)) errs.phone = 'Enter a valid number (e.g. 0712345678).'
    if (!mobileProvider) errs.mobileProvider = 'Select MTN or Airtel (use a recognized number prefix).'
    if (!hasTickets) errs.tickets = 'Select at least one ticket.'
    if (!ticketPricingReady) errs.tickets = 'Total is still calculating — try again in a moment.'
    return applyFieldErrors(errs, setFieldErrors, setFormBanner)
  }

  const updateTicketQuantity = async (ticketTypeId: string, newQuantity: number) => {
    if (newQuantity < 0 || !orderId) return
    try {
      const existingItem = items.find(item => item.ticket_type_id === ticketTypeId)
      if (existingItem) {
        if (newQuantity === 0) {
          const { error: delErr } = await supabase.from('order_items').delete().eq('id', existingItem.id)
          if (delErr) throw delErr
        } else {
          const { error: updErr } = await supabase.from('order_items').update({ quantity: newQuantity }).eq('id', existingItem.id)
          if (updErr) throw updErr
        }
      } else if (newQuantity > 0) {
        const { error: insErr } = await supabase
          .from('order_items')
          .insert({
            order_id: orderId,
            ticket_type_id: ticketTypeId,
            quantity: newQuantity,
            unit_price: allTicketTypes.find(tt => tt.id === ticketTypeId)?.price || 0,
          })
        if (insErr) throw insErr
      }
      await queryClient.invalidateQueries({ queryKey: orderQueryKey(orderId) })
    } catch (err) {
      console.error('Failed to update ticket quantity:', err)
      setCheckoutError('Failed to update ticket quantity. Please try again.')
    }
  }

  const effectiveServiceFees = items.reduce((sum: number, it: any) => {
    const qty = Number(it.quantity ?? 0)
    if (qty === 0) return sum
    const calc = ticketCalculations[it.ticket_type_id]
    if (!calc || calc.success === false) return sum
    return sum + Number(calc.tourist_fee || 0) * qty
  }, 0)

  const totalAmount = ticketPricingReady
    ? items.reduce((sum: number, it: any) => {
        const qty = Number(it.quantity ?? 0)
        if (qty === 0) return sum
        const calc = ticketCalculations[it.ticket_type_id]
        if (calc && calc.success !== false && typeof calc.total_customer_payment === 'number') {
          return sum + Number(calc.total_customer_payment) * qty
        }
        return sum + Number(it.unit_price ?? it.price ?? 0) * qty
      }, 0)
    : items.reduce((s: number, it: any) => s + Number(it.unit_price ?? 0) * Number(it.quantity ?? 0), 0)

  const handlePay = async () => {
    if (!orderId || !order || processing) return
    if (!validateCheckout()) return
    setCheckoutError(null)
    setPaymentError(null)
    const phone = formatPhone(buyer.phone)
    await payOrder({
      order,
      items,
      ticketCalculations,
      totalAmount,
      ticketPricingReady,
      phone,
      guestEmail: buyer.email.trim(),
      guestName: buyer.fullName.trim(),
    })
  }

  const handlePhoneChange = (val: string) => {
    setBuyer(s => ({ ...s, phone: val }))
    setFieldErrors(p => clearFieldError(p, 'phone'))
    setFormBanner(null)
    const provider = detectMobileProvider(val.replace(/\D/g, ''))
    if (provider) {
      setMobileProvider(provider)
      setFieldErrors(p => clearFieldError(p, 'mobileProvider'))
    }
  }

  const setBuyerField = (field: 'fullName' | 'email', value: string) => {
    setBuyer(s => ({ ...s, [field]: value }))
    setFieldErrors(p => clearFieldError(p, field === 'fullName' ? 'fullName' : 'email'))
    setFormBanner(null)
  }

  if (isLoading) return <PageSkeleton type="checkout" />
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order not found</h2>
          <p className="text-gray-500 text-sm mb-6">This checkout link may have expired.</p>
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-600 underline">Go back</button>
        </div>
      </div>
    )
  }

  const displayError = checkoutError || paymentError

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 md:p-6">
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment successful</h2>
            <p className="text-sm text-gray-700 mb-4">
              Your tickets are on the way to {buyer.email}. Tap below to view your receipt.
            </p>
            <button
              type="button"
              onClick={() => { setPaymentSuccess(false); navigate(`/tickets/${orderId}`) }}
              className="w-full py-2.5 bg-emerald-700 text-white rounded-lg font-medium"
            >
              View tickets
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl bg-white rounded-none md:rounded-lg shadow-lg overflow-hidden flex flex-col min-h-screen md:min-h-0">
        <div className="px-4 md:px-6 py-4 border-b flex-shrink-0">
          <button type="button" onClick={() => navigate(-1)} className="p-2 mb-2 border border-gray-300 rounded hover:bg-gray-50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-xl md:text-2xl font-semibold">Checkout</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-semibold">✓</div>
              <span className="text-sm font-medium text-gray-700">Tickets</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border-2 border-blue-600 bg-white text-blue-600 flex items-center justify-center text-sm font-semibold">2</div>
              <span className="text-sm font-medium text-blue-600">Pay</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-28 md:pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-4 md:px-6 py-4 md:py-6">
            <div className="md:col-span-1">
              <div className="bg-white p-4 rounded border border-gray-200">
                <h3 className="font-semibold text-lg">Your details</h3>
                <p className="text-xs text-gray-500 mt-1">One step — pay with mobile money on this page.</p>
                <BookingFormBanner message={formBanner} />
                <div className="grid gap-3 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                    <input className={fieldInputClass(Boolean(fieldErrors.fullName))} value={buyer.fullName} onChange={(e) => setBuyerField('fullName', e.target.value)} autoComplete="name" aria-invalid={Boolean(fieldErrors.fullName)} />
                    <FieldError message={fieldErrors.fullName} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" className={fieldInputClass(Boolean(fieldErrors.email))} value={buyer.email} onChange={(e) => setBuyerField('email', e.target.value)} autoComplete="email" aria-invalid={Boolean(fieldErrors.email)} />
                    <FieldError message={fieldErrors.email} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile money number *</label>
                    {mobileProvider && (
                      <p className="text-xs text-gray-500 mb-1">Provider: <span className="font-medium">{mobileProvider}</span> (auto-detected)</p>
                    )}
                    <input type="tel" className={fieldInputClass(Boolean(fieldErrors.phone))} value={buyer.phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="0712345678" autoComplete="tel" aria-invalid={Boolean(fieldErrors.phone)} />
                    <FieldError message={fieldErrors.phone} />
                    <FieldError message={fieldErrors.mobileProvider} />
                  </div>
                  <FieldError message={fieldErrors.tickets} />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="bg-white p-4 rounded border border-gray-200">
                <h3 className="font-semibold text-lg mb-3">Order summary</h3>
                <div className="flex items-center gap-3 mb-4">
                  {order._service?.images?.[0] ? (
                    <img src={order._service.images[0]} alt="" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded" />
                  )}
                  <div>
                    <div className="font-medium">{order._service?.title || 'Event'}</div>
                    <div className="text-sm text-gray-600">Order #{order.reference || order.id.slice(0, 8)}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Tickets</span>
                  <button type="button" onClick={() => setShowAllTickets(s => !s)} className="text-sm text-blue-600 underline">{showAllTickets ? 'Done' : 'Edit'}</button>
                </div>
                <div className="space-y-2 mb-4">
                  {allTicketTypes
                    .filter(tt => showAllTickets || items.some(it => it.ticket_type_id === tt.id && it.quantity > 0))
                    .map((ticketType: any) => {
                      const existingItem = items.find(it => it.ticket_type_id === ticketType.id)
                      const quantity = existingItem?.quantity || 0
                      return (
                        <div key={ticketType.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded text-sm">
                          <div>
                            <div>{ticketType.title}</div>
                            <div className="text-xs text-gray-500">{formatCurrencyWithConversion(ticketType.price, order.currency)}</div>
                          </div>
                          {showAllTickets ? (
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => updateTicketQuantity(ticketType.id, quantity - 1)} disabled={quantity <= 0} className="w-7 h-7 rounded-full bg-gray-200 disabled:opacity-50">-</button>
                              <span>{quantity}</span>
                              <button type="button" onClick={() => updateTicketQuantity(ticketType.id, quantity + 1)} className="w-7 h-7 rounded-full bg-gray-200">+</button>
                            </div>
                          ) : (
                            <span>× {quantity}</span>
                          )}
                          <span className="font-medium">{formatCurrencyWithConversion(ticketType.price * quantity, order.currency)}</span>
                        </div>
                      )
                    })}
                </div>

                {!ticketPricingReady && <p className="text-xs text-amber-700 mb-2">Calculating total…</p>}
                {effectiveServiceFees > 0 && (
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Includes booking fee</span>
                    <span>{formatCurrencyWithConversion(effectiveServiceFees, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-3">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-extrabold">{formatCurrencyWithConversion(totalAmount, order.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed md:sticky bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur-sm px-4 md:px-6 py-3 flex flex-col gap-2">
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 border rounded px-3 py-2 max-w-6xl mx-auto w-full">
            <span><span className="font-medium text-gray-600">Secure checkout via MarzPay.</span> Pending bookings can be cancelled from your account dashboard.</span>
          </div>
          {displayError && (
            <div className="max-w-6xl mx-auto w-full rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{displayError}</div>
          )}
          <button
            type="button"
            disabled={processing}
            onClick={handlePay}
            className={`max-w-6xl mx-auto w-full py-3 rounded-lg font-semibold text-base text-white transition-opacity ${processing ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-700 hover:opacity-90'}`}
          >
            {processing ? (pollingMessage || 'Processing payment…') : `Pay ${formatCurrencyWithConversion(totalAmount, order.currency)} with Mobile Money`}
          </button>
        </div>
      </div>
    </div>
  )
}
