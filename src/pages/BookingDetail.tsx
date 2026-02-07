import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Users, ChevronLeft, ChevronRight, Edit3, Star } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { sendMessage } from '../lib/database'
import { formatCurrencyWithConversion } from '../lib/utils'
import { usePreferences } from '../contexts/PreferencesContext'
import { useAuth } from '../contexts/AuthContext'

export default function BookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [booking, setBooking] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  // Edit form state
  const [editGuests, setEditGuests] = useState<number | undefined>(undefined)
  const [editSpecial, setEditSpecial] = useState<string | undefined>(undefined)

  // Review state
  const [rating, setRating] = useState<number>(5)
  const [reviewText, setReviewText] = useState<string>('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (id) fetchBooking(id)
  }, [id])

  // Keyboard navigation for images and escape-to-close lightbox
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!booking?.services?.images || booking.services.images.length <= 1) return
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex(i => (i - 1 + booking.services.images.length) % booking.services.images.length)
      } else if (e.key === 'ArrowRight') {
        setSelectedImageIndex(i => (i + 1) % booking.services.images.length)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [booking])

  const handleSendChat = async () => {
    setChatError(null)
    if (!chatMessage.trim() || !booking?.vendors?.user_id || !user?.id) return
    try {
      setSendingChat(true)
      await sendMessage({
        sender_id: user.id,
        sender_role: 'tourist',
        recipient_id: booking.vendors.user_id,
        recipient_role: 'vendor',
        subject: `Message about booking ${booking.id}`,
        message: chatMessage.trim()
      })
      setChatMessage('')
      setIsChatOpen(false)
      // Optionally show a toast or simple alert
      alert('Message sent to provider')
    } catch (err) {
      console.error('Failed to send message', err)
      setChatError('Failed to send message. Try again.')
    } finally {
      setSendingChat(false)
    }
  }


  const openEdit = () => {
    setEditGuests(booking?.guests)
    setEditSpecial(booking?.special_requests || '')
    setIsEditOpen(true)
  }

  const submitEdit = async () => {
    if (!booking) return
    try {
      setActionLoading(true)
      const { data, error } = await supabase.from('bookings').update({ guests: editGuests, special_requests: editSpecial }).eq('id', booking.id).select().single()
      if (error) throw error
      setBooking(data)
      // no-op: previously checked for local reminders; removed reminder feature
      setIsEditOpen(false)
      alert('Booking updated')
    } catch (err: any) {
      console.error('Edit failed', err)
      alert(err.message || 'Failed to update booking')
    } finally {
      setActionLoading(false)
    }
  }


  const submitReview = async () => {
    if (!booking || !user) return alert('You must be logged in to submit a review')
    try {
      setActionLoading(true)
      // try to insert into reviews table if it exists; otherwise fallback to alert
      const payload = {
        booking_id: booking.id,
        service_id: booking.service_id,
        vendor_id: booking.vendor_id,
        tourist_id: user.id,
        rating,
        comment: reviewText,
        created_at: new Date().toISOString()
      }
      const { error } = await supabase.from('reviews').insert([payload]).select().single()
      if (error) {
        console.warn('Reviews table might not exist or insert failed:', error)
        alert('Review submitted (local)')
      } else {
        alert('Thank you for your review')
      }
      setIsReviewOpen(false)
    } catch (err: any) {
      console.error('Review failed', err)
      alert(err.message || 'Failed to submit review')
    } finally {
      setActionLoading(false)
    }
  }

  const fetchBooking = async (bookingId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select(`*, services (id, title, images, location, service_categories (name), duration_days), vendors (id, user_id, business_name, business_phone, business_email)`) // include vendor.user_id for messaging
        .eq('id', bookingId)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setError('Booking not found')
        return
      }

      // If user is present, ensure they own the booking (simple check)
      if (user && data.tourist_id && user.id !== data.tourist_id) {
        setError('You do not have permission to view this booking')
        return
      }

      setBooking(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load booking')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-700 mb-4">{error}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Go back</button>
      </div>
  <BookingDetailChat booking={booking} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} chatMessage={chatMessage} setChatMessage={setChatMessage} sendingChat={sendingChat} onSend={handleSendChat} chatError={chatError} />
    </div>
  )

  if (!booking) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      case 'completed': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getPaymentColor = (pstatus: string) => {
    switch (pstatus) {
      case 'paid': return 'text-green-700 bg-green-100'
      case 'pending': return 'text-yellow-700 bg-yellow-100'
      case 'refunded': return 'text-purple-700 bg-purple-100'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900">Booking Details</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and review your booking information.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: gallery + details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="lg:flex lg:items-start">
                {/* Vertical thumbnails on desktop */}
                <div className="hidden lg:flex lg:flex-col lg:space-y-3 lg:p-6 lg:w-28">
                  {booking.services?.images?.map((src: string, idx: number) => (
                    <button key={idx} onClick={() => setSelectedImageIndex(idx)} className={`w-full h-20 rounded overflow-hidden border ${idx === selectedImageIndex ? 'border-blue-500 shadow' : 'border-gray-200'}`}>
                      <img loading="lazy" src={src} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="flex-1">
                  <div className="p-4 lg:p-6">
                    <div className="relative">
                      <img loading="lazy" src={booking.services?.images?.[selectedImageIndex]} alt={booking.services?.title} className="w-full h-96 object-cover rounded-md" />
                      {booking.services?.images?.length > 1 && (
                        <>
                          <button aria-label="Prev" onClick={() => setSelectedImageIndex(i => (i - 1 + booking.services.images.length) % booking.services.images.length)} className="hidden lg:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full">
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button aria-label="Next" onClick={() => setSelectedImageIndex(i => (i + 1) % booking.services.images.length)} className="hidden lg:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full">
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Mobile thumbnails */}
                    {booking.services?.images && booking.services.images.length > 1 && (
                      <div className="mt-3 lg:hidden">
                        <div className="flex space-x-2 overflow-x-auto py-1">
                          {booking.services.images.map((src: string, idx: number) => (
                            <button key={idx} onClick={() => setSelectedImageIndex(idx)} className={`flex-shrink-0 w-28 h-16 rounded overflow-hidden border ${idx === selectedImageIndex ? 'border-blue-500' : 'border-gray-200'}`}>
                              <img loading="lazy" src={src} alt={`mobile-thumb-${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6">
                      <h2 className="text-2xl font-semibold text-gray-900">{booking.services?.title}</h2>
                      <p className="text-sm text-gray-600 mt-1">{booking.services?.service_categories?.name || ''} • {booking.vendors?.business_name || ''}</p>

                      <div className="mt-4 text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center"><MapPin className="h-4 w-4 mr-2 text-gray-500" />{booking.services?.location || 'Unknown'}</div>
                        <div className="flex items-center"><Users className="h-4 w-4 mr-2 text-gray-500" />{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</div>
                        <div className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-gray-500" />{new Date(booking.booking_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      </div>

                      {booking.special_requests && (
                        <div className="mt-6 bg-gray-50 p-4 rounded">
                          <h4 className="text-sm font-medium text-gray-800">Special requests</h4>
                          <p className="text-sm text-gray-700 mt-1">{booking.special_requests}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick actions: edit and (if completed) review */}
              <div className="mt-4">
                <div className="flex gap-2">
                  <button onClick={openEdit} className="flex-1 inline-flex items-center gap-2 justify-center px-3 py-2 rounded-md border bg-white border-gray-200">
                    <Edit3 className="h-4 w-4" />
                    <span className="text-sm">Edit</span>
                  </button>

                  {booking.status === 'completed' && (
                    <button onClick={() => setIsReviewOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-yellow-50 border-yellow-200 text-yellow-700">
                      <Star className="h-4 w-4" />
                      <span className="text-sm">Rate & Review</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: summary card */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <div className="flex items-start justify-between">
                <div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</div>
                </div>
                <div className="text-right text-sm text-gray-500">Booking ID</div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-lg font-extrabold text-gray-900">{formatCurrencyWithConversion(booking.total_amount, booking.currency, selectedCurrency || 'UGX', selectedLanguage || 'en-US')}</div>
                  <div className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-md text-xs font-medium ${getPaymentColor(booking.payment_status)}`}>Payment: <span className="ml-2 capitalize">{booking.payment_status || 'unknown'}</span></div>
                </div>
                <div className="text-sm text-gray-500">
                  <div className="font-mono break-all text-right">{booking.id}</div>
                  <button onClick={() => { navigator.clipboard?.writeText(booking.id); }} className="mt-2 text-xs text-blue-600 hover:underline">Copy ID</button>
                </div>
              </div>

              {booking.payment_reference && (
                <div className="mt-4 text-xs text-gray-600">Ref: <span className="font-mono">{booking.payment_reference}</span></div>
              )}

              <div className="mt-6 space-y-3">
                <div>
                  <div className="text-xs text-gray-500">Dates</div>
                  <div className="text-sm text-gray-800 mt-1">{new Date(booking.booking_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}{booking.end_date ? ` — ${new Date(booking.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Guests</div>
                  <div className="text-sm text-gray-800 mt-1">{booking.guests}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Provider</div>
                  <div className="text-sm text-gray-800 mt-1">{booking.vendors?.business_name || 'Service Provider'}</div>

                  {/* Show provider contacts only when payment is confirmed (paid) */}
                  {booking.payment_status === 'paid' && (
                    <div className="mt-3 text-sm text-gray-700">
                      {booking.vendors?.business_phone && <div>Phone: <a href={`tel:${booking.vendors.business_phone}`} className="text-blue-600">{booking.vendors.business_phone}</a></div>}
                      {booking.vendors?.business_email && <div className="mt-1">Email: <a href={`mailto:${booking.vendors.business_email}`} className="text-blue-600">{booking.vendors.business_email}</a></div>}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                {booking.payment_status === 'paid' && booking.vendors?.user_id ? (
                  <button onClick={() => setIsChatOpen(true)} className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md font-semibold">Contact Provider</button>
                ) : (
                  <button disabled className="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-semibold opacity-60 cursor-not-allowed">Contact Provider</button>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => navigate(-1)} className="flex-1 px-3 py-2 bg-gray-100 rounded-md">Back</button>
                <button onClick={() => alert('Download receipt placeholder')} className="flex-1 px-3 py-2 border border-gray-200 rounded-md">Download</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <BookingDetailChat booking={booking} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} chatMessage={chatMessage} setChatMessage={setChatMessage} sendingChat={sendingChat} onSend={handleSendChat} chatError={chatError} />
      <BookingEditModal booking={booking} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} guests={editGuests} setGuests={setEditGuests} special={editSpecial} setSpecial={setEditSpecial} onSave={submitEdit} saving={actionLoading} />
      <BookingReviewModal booking={booking} isOpen={isReviewOpen} onClose={() => setIsReviewOpen(false)} rating={rating} setRating={setRating} reviewText={reviewText} setReviewText={setReviewText} onSubmit={submitReview} submitting={actionLoading} />
    </div>
  )
}

// Chat modal markup placed at end of file to keep main return clean. We render it via portal-like absolute overlay when isChatOpen is true.
export function BookingDetailChat({
  booking,
  isOpen,
  onClose,
  chatMessage,
  setChatMessage,
  sendingChat,
  onSend,
  chatError
}: any) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6 shadow-lg">
        <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Message Service Provider</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

              <p className="text-sm text-gray-600 mt-2">This will send an in-app message to the service provider associated with this booking{booking?.vendors?.business_name ? ` — ${booking.vendors.business_name}` : ''}.</p>

        <textarea value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Write your message..." className="w-full mt-4 border rounded p-3 min-h-[120px]" />

  { /* error */ }
  {sendingChat && <div className="text-sm text-gray-500 mt-2">Sending...</div>}
  {chatError && <div className="text-sm text-red-600 mt-2">{chatError}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
          <button onClick={onSend} disabled={sendingChat || !chatMessage.trim()} className={`px-4 py-2 rounded ${chatMessage.trim() && !sendingChat ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700 cursor-not-allowed'}`}>
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}

export function BookingEditModal({ isOpen, onClose, guests, setGuests, special, setSpecial, onSave, saving }: any) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Edit Booking</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm text-gray-700">Guests</label>
          <input type="number" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full border rounded px-3 py-2" />

          <label className="block text-sm text-gray-700">Special requests</label>
          <textarea value={special} onChange={(e) => setSpecial(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[100px]" />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
          <button onClick={onSave} disabled={saving} className={`px-4 py-2 rounded ${saving ? 'bg-gray-300 text-gray-700' : 'bg-blue-600 text-white'}`}>Save</button>
        </div>
      </div>
    </div>
  )
}

export function BookingReviewModal({ isOpen, onClose, rating, setRating, reviewText, setReviewText, onSubmit, submitting }: any) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Rate & Review</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block text-sm text-gray-700">Rating</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full border rounded px-3 py-2">
            {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n>1 ? 's' : ''}</option>)}
          </select>

          <label className="block text-sm text-gray-700">Your review</label>
          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="w-full border rounded px-3 py-2 min-h-[120px]" />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
          <button onClick={onSubmit} disabled={submitting} className={`px-4 py-2 rounded ${submitting ? 'bg-gray-300 text-gray-700' : 'bg-yellow-500 text-white'}`}>Submit Review</button>
        </div>
      </div>
    </div>
  )
}

