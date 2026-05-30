import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createBooking } from '../lib/database'

interface ServiceDetail {
  id: string; slug?: string; title: string; description: string; price: number; currency: string;
  images: string[]; location: string; max_capacity: number;
  vendor_id?: string; vendors?: { id?: string; business_name: string; business_phone: string; business_email: string } | null;
  service_categories: { name: string }
}

const TIME_SLOTS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']
const OCCASIONS = ['', 'Birthday', 'Anniversary', 'Business Lunch / Dinner', 'Date Night', 'Family Gathering', 'Other']

export default function RestaurantBooking({ service }: { service: ServiceDetail }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    date: '', time: '', partySize: 2, occasion: '', dietaryNotes: '',
    contactName: '', contactEmail: '', contactPhone: '',
  })

  useEffect(() => {
    if (!user || !profile) return
    setFormData(p => ({ ...p, contactName: profile.full_name || '', contactEmail: profile.email || '' }))
  }, [user, profile])

  const set = (field: string, value: any) => setFormData(p => ({ ...p, [field]: value }))

  const step1Valid = Boolean(formData.date && formData.time)
  const step2Valid = Boolean(formData.contactName.trim() && formData.contactEmail.trim())

  const handleReserve = async () => {
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)
    try {
      const specialRequests = [
        formData.time ? `Time: ${formData.time}` : '',
        formData.occasion ? `Occasion: ${formData.occasion}` : '',
        formData.dietaryNotes ? `Dietary notes: ${formData.dietaryNotes}` : '',
      ].filter(Boolean).join('\n')

      const booking = await createBooking({
        service_id: service.id,
        vendor_id: service.vendor_id || service.vendors?.id || '',
        booking_date: new Date().toISOString(),
        service_date: formData.date,
        guests: formData.partySize,
        total_amount: 0,
        currency: service.currency || 'UGX',
        status: 'confirmed',
        payment_status: 'pending',
        special_requests: specialRequests || undefined,
        tourist_id: user?.id,
        guest_name: user ? undefined : formData.contactName || undefined,
        guest_email: user ? undefined : formData.contactEmail || undefined,
        guest_phone: user ? undefined : formData.contactPhone || undefined,
        start_time: formData.time,
      } as any)

      // Attempt to notify vendor via existing email edge function
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
        await fetch(`${supabaseUrl}/functions/v1/send-booking-emails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
          body: JSON.stringify({ booking_id: booking.id }),
        })
      } catch { /* email failure is non-fatal */ }

      setConfirmed(booking)
      setCurrentStep(3)
    } catch (err) {
      setError((err as Error).message || 'Reservation failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirmation screen
  if (currentStep === 3 && confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Reservation Confirmed</h2>
          <p className="text-gray-600 mb-6">Your table is booked. A confirmation has been sent to <span className="font-medium">{formData.contactEmail || profile?.email}</span>.</p>

          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Restaurant</span><span className="font-medium">{service.title}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Date</span><span className="font-medium">{new Date(formData.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Time</span><span className="font-medium">{formData.time}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Party size</span><span className="font-medium">{formData.partySize} guest{formData.partySize !== 1 ? 's' : ''}</span></div>
            {formData.occasion && <div className="flex justify-between text-sm"><span className="text-gray-500">Occasion</span><span className="font-medium">{formData.occasion}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-500">Booking ref</span><span className="font-mono text-xs">{confirmed.id?.slice(0, 8).toUpperCase()}</span></div>
          </div>

          <p className="text-xs text-gray-500 mb-6">To cancel or modify, contact <a href={`mailto:${service.vendors?.business_email || 'safaris.dirttrails@gmail.com'}`} className="underline">{service.vendors?.business_email || 'safaris.dirttrails@gmail.com'}</a> at least 2 hours before your reservation.</p>

          <button onClick={() => navigate('/')} className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium">Back to Home</button>
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

        {/* Step pills */}
        <div className="flex items-center gap-3 mb-6">
          {['Reservation Details', 'Your Details'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep > i + 1 ? 'bg-green-600 text-white' : currentStep === i + 1 ? 'border-2 border-blue-600 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                {currentStep > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${currentStep === i + 1 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{label}</span>
              {i < 1 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">

          {/* Step 1 — Reservation Details */}
          {currentStep === 1 && (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" />Reservation Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
                    value={formData.date} onChange={e => set('date', e.target.value)} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <select className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base bg-white"
                    value={formData.time} onChange={e => set('time', e.target.value)}>
                    <option value="">Select a time…</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Size *</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => set('partySize', Math.max(1, formData.partySize - 1))} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50">−</button>
                  <div className="text-center">
                    <span className="text-2xl font-semibold">{formData.partySize}</span>
                    <p className="text-xs text-gray-500">guest{formData.partySize !== 1 ? 's' : ''}</p>
                  </div>
                  <button type="button" onClick={() => set('partySize', Math.min(service.max_capacity || 20, formData.partySize + 1))} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-lg hover:bg-gray-50">+</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occasion <span className="text-gray-400 font-normal">(optional)</span></label>
                <select className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base bg-white" value={formData.occasion} onChange={e => set('occasion', e.target.value)}>
                  {OCCASIONS.map(o => <option key={o} value={o}>{o || 'None / General dining'}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Requirements <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea rows={2} placeholder="Vegetarian, halal, nut allergy, gluten-free…" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm resize-none"
                  value={formData.dietaryNotes} onChange={e => set('dietaryNotes', e.target.value)} />
              </div>

              <button disabled={!step1Valid} onClick={() => setCurrentStep(2)}
                className={`w-full py-3 rounded-lg font-semibold text-base transition ${!step1Valid ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                Continue
              </button>
            </>
          )}

          {/* Step 2 — Contact Details */}
          {currentStep === 2 && (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />Your Details</h2>
              <p className="text-sm text-gray-500">We'll send your booking confirmation to this email.</p>

              {user && profile?.full_name && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
                  Reserving as <span className="font-medium">{profile.full_name}</span> ({profile.email})
                </div>
              )}

              {!user && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base" value={formData.contactName} onChange={e => set('contactName', e.target.value)} autoComplete="name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base" value={formData.contactEmail} onChange={e => set('contactEmail', e.target.value)} autoComplete="email" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="tel" className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base" value={formData.contactPhone} onChange={e => set('contactPhone', e.target.value)} autoComplete="tel" />
                  </div>
                </div>
              )}

              {/* Booking summary */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1 border border-gray-200">
                <p className="font-medium text-gray-800 mb-2">Reservation Summary</p>
                <div className="flex justify-between text-gray-600"><span>Date</span><span>{formData.date}</span></div>
                <div className="flex justify-between text-gray-600"><span>Time</span><span>{formData.time}</span></div>
                <div className="flex justify-between text-gray-600"><span>Party size</span><span>{formData.partySize} guest{formData.partySize !== 1 ? 's' : ''}</span></div>
                {formData.occasion && <div className="flex justify-between text-gray-600"><span>Occasion</span><span>{formData.occasion}</span></div>}
                <div className="flex justify-between font-semibold text-gray-800 pt-2 border-t border-gray-200 mt-2"><span>Reservation fee</span><span className="text-green-700">Free</span></div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded">{error}</div>}

              <button disabled={isSubmitting || (!user && !step2Valid)} onClick={handleReserve}
                className={`w-full py-3 rounded-lg font-semibold text-base transition ${isSubmitting || (!user && !step2Valid) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {isSubmitting ? 'Confirming reservation…' : 'Confirm Reservation'}
              </button>
              <p className="text-xs text-center text-gray-500">No payment required — reservations are free. Pay at the restaurant.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
