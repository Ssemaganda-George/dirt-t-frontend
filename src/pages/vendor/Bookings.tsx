import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Booking, Service } from '../../types'
import { getServices as getServicesDb } from '../../lib/database'
import { getAllBookings, createBooking as createDbBooking, updateBooking } from '../../lib/database'
import { formatCurrencyWithConversion, formatDateTime, getVendorDisplayStatus } from '../../lib/utils'
import { usePreferences } from '../../contexts/PreferencesContext'
import { Search } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { supabase } from '../../lib/supabaseClient'
import BookingReceipt from '../../components/BookingReceipt'

export default function VendorBookings() {
  const { profile, vendor } = useAuth()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const { state: cartState } = useCart()
  const navigate = useNavigate()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [bookingToReject, setBookingToReject] = useState<Booking | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('')
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Fetch bookings from Supabase for this vendor
  const load = async () => {
    // Get all bookings, then filter by vendor_id
    const allBookings = await getAllBookings()
    const filteredBookings = allBookings.filter(b => b.vendor_id === vendorId)
    setBookings(filteredBookings)

    try {
      const svc = await getServicesDb(vendorId)
      setServices(svc)
    } catch (err) {
      console.error('Error loading services for vendor:', err)
      setServices([])
    }
  }

  useEffect(() => {
    if (!vendorId) return

    // Initial load
    load()

    // Subscribe to real-time changes for this vendor's bookings
    const bookingsSubscription = supabase
      .channel('vendor_bookings')
      .on('postgres_changes', {
        event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'bookings',
        filter: `vendor_id=eq.${vendorId}` // Only listen to bookings for this vendor
      }, (payload) => {
        console.log('Real-time booking change:', payload)

        if (payload.eventType === 'INSERT') {
          // New booking for this vendor
          setBookings(prev => [...prev, payload.new as Booking])
        } else if (payload.eventType === 'UPDATE') {
          // Booking updated
          setBookings(prev => prev.map(booking =>
            booking.id === payload.new.id ? payload.new as Booking : booking
          ))
        } else if (payload.eventType === 'DELETE') {
          // Booking deleted
          setBookings(prev => prev.filter(booking => booking.id !== payload.old.id))
        }
      })
      .subscribe()

    // Cleanup subscriptions on unmount or vendorId change
    return () => {
      bookingsSubscription.unsubscribe()
    }
  }, [vendorId])

  const handleStatusChange = async (bookingId: string, status: Booking['status']) => {
    try {
      const updatedBooking = await updateBooking(bookingId, { status })
      // Real-time subscription will update the UI automatically
      
      // Show review link notification when booking is completed
      if (status === 'completed') {
        // The review token was auto-generated in updateBooking
        // Show a notification to the vendor
        const guestEmail = updatedBooking.guest_email || (updatedBooking as any).profiles?.email
        if (guestEmail) {
          alert('Booking completed. Review request sent to guest.')
        } else {
          alert('Booking completed. No email found for review request.')
        }
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      // Revert local state on error
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: b.status } : b))
    }
  }

  const handleRejectBooking = async (bookingId: string, reason: string) => {
    try {
      await updateBooking(bookingId, { status: 'cancelled', rejection_reason: reason })
      // Real-time subscription will update the UI automatically
      setShowRejectionModal(false)
      setBookingToReject(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting booking:', error)
      // Revert local state on error
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: b.status } : b))
    }
  }

  const openRejectionModal = (booking: Booking) => {
    setBookingToReject(booking)
    setRejectionReason('')
    setShowRejectionModal(true)
  }

  // Filtered bookings
  const filteredBookings = bookings.filter(b => {
    const statusMatch = statusFilter === 'all' || b.status === statusFilter
    const serviceMatch = serviceFilter === 'all' || b.service_id === serviceFilter

    // Search filter
    const searchMatch = !searchQuery.trim() || (() => {
      const query = searchQuery.toLowerCase()
      return (
        // Search in service title
        b.service?.title?.toLowerCase().includes(query) ||
        b.services?.title?.toLowerCase().includes(query) ||
        // Search in service description
        b.service?.description?.toLowerCase().includes(query) ||
        // Search in customer name
        b.tourist_profile?.full_name?.toLowerCase().includes(query) ||
        b.profiles?.full_name?.toLowerCase().includes(query) ||
        b.guest_name?.toLowerCase().includes(query) ||
        // Search in customer email
        b.guest_email?.toLowerCase().includes(query) ||
        // Search in booking status
        b.status?.toLowerCase().includes(query) ||
        b.payment_status?.toLowerCase().includes(query) ||
        // Search in booking ID
        b.id?.toLowerCase().includes(query)
      )
    })()

    return statusMatch && serviceMatch && searchMatch
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your customer bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendor/availability')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Availability
          </button>
          <div className="flex items-center text-xs text-emerald-600">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></div>
            Live
          </div>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by service, customer, status, or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Services</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Mobile Card View */}
        <div className="block md:hidden divide-y divide-gray-100">
          {filteredBookings.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-900">No bookings yet</p>
              <p className="text-xs text-gray-500 mt-1">Bookings will appear here</p>
            </div>
          ) : (
            filteredBookings.map(b => (
              <div key={b.id} className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDateTime(b.booking_date)} · {b.guests} guest{b.guests > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrencyWithConversion(b.total_amount, b.currency, selectedCurrency, selectedLanguage)}
                    </p>
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                      getVendorDisplayStatus(b.status, b.payment_status) === 'confirmed' || getVendorDisplayStatus(b.status, b.payment_status) === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : getVendorDisplayStatus(b.status, b.payment_status) === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    }`}>
                      {getVendorDisplayStatus(b.status, b.payment_status)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-3">
                  {b.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                        onClick={() => handleStatusChange(b.id, 'confirmed')}
                      >Accept</button>
                      <button
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50"
                        onClick={() => openRejectionModal(b)}
                      >Reject</button>
                    </div>
                  )}
                  {b.status === 'confirmed' && b.payment_status === 'paid' && (
                    <button
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                      onClick={() => handleStatusChange(b.id, 'completed')}
                    >Mark Complete</button>
                  )}
                  <button
                    onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >View Details</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Service</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Booked</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Guests</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(b => (
                <tr
                  key={b.id}
                  className="group border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }}
                >
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatDateTime(b.booking_date)}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{b.guests}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrencyWithConversion(b.total_amount, b.currency, selectedCurrency, selectedLanguage)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                      getVendorDisplayStatus(b.status, b.payment_status) === 'confirmed' || getVendorDisplayStatus(b.status, b.payment_status) === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : getVendorDisplayStatus(b.status, b.payment_status) === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    }`}>
                      {getVendorDisplayStatus(b.status, b.payment_status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {b.status === 'pending' && (
                        <>
                          <button
                            className="text-xs font-medium text-gray-900 hover:underline"
                            onClick={e => { e.stopPropagation(); handleStatusChange(b.id, 'confirmed') }}
                          >Accept</button>
                          <button
                            className="text-xs font-medium text-red-600 hover:underline"
                            onClick={e => { e.stopPropagation(); openRejectionModal(b) }}
                          >Reject</button>
                        </>
                      )}
                      {b.status === 'confirmed' && b.payment_status === 'paid' && (
                        <button
                          className="text-xs font-medium text-gray-900 hover:underline"
                          onClick={e => { e.stopPropagation(); handleStatusChange(b.id, 'completed') }}
                        >Complete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-gray-900">No bookings yet</p>
                    <p className="text-xs text-gray-500 mt-1">Bookings will appear here</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saved Cart Items */}
      {cartState.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Saved Cart Items ({cartState.items.length})</h3>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Service</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Saved</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {cartState.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{item.service.title}</p>
                      <p className="text-xs text-gray-500">{item.service.vendors.business_name}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 capitalize">{item.category}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrencyWithConversion(item.totalPrice, item.currency, selectedCurrency, selectedLanguage)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{formatDateTime(item.savedAt)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <BookingForm
          services={services}
          onClose={() => setShowForm(false)}
          onSubmit={async (payload) => {
            // Create booking in Supabase
            const created = await createDbBooking({ ...payload, vendor_id: vendorId } as any)
            setBookings(prev => [created, ...prev])
            setShowForm(false)
          }}
        />
      )}



      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
              <h3 className="text-base font-semibold text-gray-900">Booking Receipt</h3>
              <button
                onClick={() => setShowBookingDetails(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >✕</button>
            </div>
            <div className="p-4">
              <BookingReceipt
                booking={selectedBooking}
                onClose={() => setShowBookingDetails(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectionModal && bookingToReject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Reject Booking</h3>
              <button 
                onClick={() => { setShowRejectionModal(false); setBookingToReject(null); setRejectionReason('') }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-500">Provide a reason for rejecting this booking. This will be sent to the customer.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Not available on that date, Fully booked..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowRejectionModal(false); setBookingToReject(null); setRejectionReason('') }}
                  className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >Cancel</button>
                <button
                  onClick={() => handleRejectBooking(bookingToReject.id, rejectionReason)}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingForm({ services, onClose, onSubmit }: { services: Service[]; onClose: () => void; onSubmit: (payload: Partial<Booking>) => void }) {
  const [form, setForm] = useState<Partial<Booking>>({
    service_id: services[0]?.id,
    booking_date: new Date().toISOString(),
    service_date: new Date().toISOString(),
    guests: 1,
    total_amount: services[0] ? services[0].price : 0,
    currency: services[0]?.currency || 'UGX',
    status: 'pending'
  })

  const selectedService = services.find(s => s.id === form.service_id)

  useEffect(() => {
    if (selectedService) {
      setForm(prev => ({ ...prev, total_amount: (selectedService.price || 0) * (prev.guests || 1), currency: selectedService.currency }))
    }
  }, [form.service_id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">Add Booking</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <form className="px-6 py-4 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service</label>
            <select value={form.service_id as any} onChange={(e) => setForm(prev => ({ ...prev, service_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Guests</label>
              <input type="number" min={1} value={form.guests as any} onChange={(e) => setForm(prev => ({ ...prev, guests: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select value={form.status as any} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as Booking['status'] }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Amount</label>
            <input type="number" value={form.total_amount as any} onChange={(e) => setForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-500 mt-1">Currency: {form.currency}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create booking</button>
          </div>
        </form>
      </div>
    </div>
  )
}
