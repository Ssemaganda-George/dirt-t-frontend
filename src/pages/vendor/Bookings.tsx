import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Booking, Service } from '../../types'
import { getServices as getServicesDb } from '../../lib/database'
import { getAllBookings, getArchivedBookings, getDeletedBookings, createBooking as createDbBooking, updateBooking, restoreBooking } from '../../lib/database'
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
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'rejected' | 'archived' | 'deleted'>('all')
  const [archivedBookings, setArchivedBookings] = useState<Booking[]>([])
  const [deletedBookings, setDeletedBookings] = useState<Booking[]>([])

  // Fetch bookings from Supabase for this vendor
  const load = async () => {
    try {
      const allBookings = await Promise.race([
        getAllBookings(),
        new Promise<Booking[]>((_, reject) => setTimeout(() => reject(new Error('Bookings load timed out')), 10000))
      ])
      let filteredBookings = allBookings.filter(b => b.vendor_id === vendorId)
      setBookings(filteredBookings)

      try {
        const svc = await getServicesDb(vendorId)
        setServices(svc)
        const serviceMap = new Map(svc.map(s => [s.id, s]))
        filteredBookings = filteredBookings.map(b => ({
          ...b,
          service: b.service || serviceMap.get(b.service_id) || undefined
        }))
      } catch (err) {
        console.error('Error loading services for vendor:', err)
        setServices([])
      }
      setBookings(filteredBookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
    setBookings([])
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
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `vendor_id=eq.${vendorId}`
      }, (payload) => {
        console.log('Real-time booking change:', payload)

        if (payload.eventType === 'INSERT') {
          setBookings(prev => [...prev, payload.new as Booking])
        } else if (payload.eventType === 'UPDATE') {
          setBookings(prev => prev.map(booking =>
            booking.id === payload.new.id ? payload.new as Booking : booking
          ))
        } else if (payload.eventType === 'DELETE') {
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
      await updateBooking(bookingId, { status })
      if (status === 'completed') {
        const guestEmail = (bookings.find(b => b.id === bookingId) as any)?.guest_email || (bookings.find(b => b.id === bookingId) as any)?.profiles?.email
        if (guestEmail) {
          alert('Booking completed. Review request sent to guest.')
        } else {
          alert('Booking completed. No email found for review request.')
        }
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: b.status } : b))
    }
  }

  const handleRejectBooking = async (bookingId: string, reason: string) => {
    try {
      await updateBooking(bookingId, { status: 'cancelled', rejection_reason: reason })
      setShowRejectionModal(false)
      setBookingToReject(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting booking:', error)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: b.status } : b))
    }
  }

  const openRejectionModal = (booking: Booking) => {
    setBookingToReject(booking)
    setRejectionReason('')
    setShowRejectionModal(true)
  }

  const handleRestoreBooking = async (bookingId: string) => {
    try {
      const booking = deletedBookings.find(b => b.id === bookingId) || archivedBookings.find(b => b.id === bookingId)
      await restoreBooking(bookingId)
      if (booking) {
        setBookings(prev => [...prev, booking])
      }
      if (deletedBookings.find(b => b.id === bookingId)) {
        setDeletedBookings(prev => prev.filter(b => b.id !== bookingId))
      }
      if (archivedBookings.find(b => b.id === bookingId)) {
        setArchivedBookings(prev => prev.filter(b => b.id !== bookingId))
      }
    } catch (error) {
      console.error('Error restoring booking:', error)
    }
  }

  const loadArchived = async () => {
    try {
      const data = await getArchivedBookings()
      setArchivedBookings(data.filter(b => b.vendor_id === vendorId))
    } catch (error) {
      console.error('Error loading archived bookings:', error)
    }
  }

  const loadDeleted = async () => {
    try {
      const data = await getDeletedBookings()
      setDeletedBookings(data.filter(b => b.vendor_id === vendorId))
    } catch (error) {
      console.error('Error loading deleted bookings:', error)
    }
  }

  useEffect(() => {
    if (!vendorId) return
    loadArchived()
    loadDeleted()
  }, [vendorId])

  // Determine which bookings to display based on active tab
  const activeBookings = bookings.filter(b => !b.archived_at && !b.deleted_at)
  const displayBookings = (() => {
    switch (activeTab) {
      case 'all':
        return [...activeBookings, ...archivedBookings, ...deletedBookings]
      case 'pending':
        return activeBookings.filter(b => b.status === 'pending')
      case 'completed':
        return activeBookings.filter(b => b.status === 'completed')
      case 'rejected':
        return activeBookings.filter(b => b.status === 'cancelled')
      case 'archived':
        return archivedBookings
      case 'deleted':
        return deletedBookings
      default:
        return activeBookings.filter(b => b.status === 'pending')
    }
  })()

  const displayBookingsFiltered = displayBookings.filter(b => {
    const serviceMatch = serviceFilter === 'all' || b.service_id === serviceFilter
    const searchMatch = !searchQuery.trim() || (() => {
      const query = searchQuery.toLowerCase()
      return (
        b.service?.title?.toLowerCase().includes(query) ||
        b.services?.title?.toLowerCase().includes(query) ||
        b.service?.description?.toLowerCase().includes(query) ||
        b.tourist_profile?.full_name?.toLowerCase().includes(query) ||
        b.profiles?.full_name?.toLowerCase().includes(query) ||
        b.guest_name?.toLowerCase().includes(query) ||
        b.guest_email?.toLowerCase().includes(query) ||
        b.status?.toLowerCase().includes(query) ||
        b.payment_status?.toLowerCase().includes(query) ||
        b.id?.toLowerCase().includes(query)
      )
    })()
    return serviceMatch && searchMatch
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track your customer bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendor/availability')}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
          >
            Availability
          </button>
          <div className="flex items-center text-xs text-emerald-600">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></div>
            Live
          </div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { key: 'all' as const, label: 'All', count: activeBookings.length + archivedBookings.length + deletedBookings.length },
          { key: 'pending' as const, label: 'Pending', count: activeBookings.filter(b => b.status === 'pending').length },
          { key: 'completed' as const, label: 'Completed', count: activeBookings.filter(b => b.status === 'completed').length },
          { key: 'rejected' as const, label: 'Rejected', count: activeBookings.filter(b => b.status === 'cancelled').length },
          { key: 'archived' as const, label: 'Archived', count: archivedBookings.length },
          { key: 'deleted' as const, label: 'Deleted', count: deletedBookings.length },
        ].map((card) => (
          <button
            key={card.key}
            onClick={() => setActiveTab(card.key)}
            className={`min-h-[48px] px-4 py-2.5 rounded-lg border text-sm font-medium transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
              activeTab === card.key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="font-semibold">{card.label}</span>
            <span className={`ml-2 ${activeTab === card.key ? 'text-slate-200' : 'text-slate-500'}`}>({card.count})</span>
          </button>
        ))}
      </div>

      {/* Search & Filters Card */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by service, customer, status, or booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[40px] pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus:border-transparent"
            />
          </div>
          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="flex-1 min-h-[40px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Mobile Card View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {displayBookingsFiltered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">No bookings in this category</p>
              <p className="text-xs text-slate-500 mt-1">Bookings will appear here</p>
            </div>
          ) : (
            displayBookingsFiltered.map(b => (
              <div key={b.id} className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateTime(b.booking_date)} · {b.guests} guest{b.guests > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrencyWithConversion(b.vendor_payout_amount ?? b.total_amount, b.currency, selectedCurrency, selectedLanguage)}
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
                  {b.status === 'pending' && activeTab === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        className="flex-1 min-h-[36px] px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                        onClick={() => handleStatusChange(b.id, 'confirmed')}
                      >Accept</button>
                      <button
                        className="flex-1 min-h-[36px] px-3 py-1.5 bg-white border border-slate-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20"
                        onClick={() => openRejectionModal(b)}
                      >Reject</button>
                    </div>
                  )}
                  {b.status === 'confirmed' && b.payment_status === 'paid' && activeTab === 'pending' && (
                    <button
                      className="min-h-[36px] px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                      onClick={() => handleStatusChange(b.id, 'completed')}
                    >Mark Complete</button>
                  )}
                  {activeTab === 'archived' && (
                    <button
                      className="min-h-[36px] px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                      onClick={() => handleRestoreBooking(b.id)}
                    >Restore</button>
                  )}
                  {activeTab === 'deleted' && (
                    <button
                      className="min-h-[36px] px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                      onClick={() => handleRestoreBooking(b.id)}
                    >Restore</button>
                  )}
                  <button
                    onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 rounded"
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
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Service</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Booked</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Guests</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Amount</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayBookingsFiltered.map(b => (
                <tr
                  key={b.id}
                  className="group border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => { setSelectedBooking(b); setShowBookingDetails(true) }}
                >
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-500">{formatDateTime(b.booking_date)}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-500">{b.guests}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{formatCurrencyWithConversion(b.vendor_payout_amount ?? b.total_amount, b.currency, selectedCurrency, selectedLanguage)}</td>
                  <td className="px-4 py-2.5">
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
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {b.status === 'pending' && activeTab === 'pending' && (
                        <>
                          <button
                            className="text-xs font-medium text-slate-900 hover:underline"
                            onClick={e => { e.stopPropagation(); handleStatusChange(b.id, 'confirmed') }}
                          >Accept</button>
                          <button
                            className="text-xs font-medium text-red-600 hover:underline"
                            onClick={e => { e.stopPropagation(); openRejectionModal(b) }}
                          >Reject</button>
                        </>
                      )}
                      {b.status === 'confirmed' && b.payment_status === 'paid' && activeTab === 'pending' && (
                        <button
                          className="text-xs font-medium text-slate-900 hover:underline"
                          onClick={e => { e.stopPropagation(); handleStatusChange(b.id, 'completed') }}
                        >Complete</button>
                      )}
                      {activeTab === 'archived' && (
                        <button
                          className="text-xs font-medium text-blue-600 hover:underline"
                          onClick={e => { e.stopPropagation(); handleRestoreBooking(b.id) }}
                        >Restore</button>
                      )}
                      {activeTab === 'deleted' && (
                        <button
                          className="text-xs font-medium text-blue-600 hover:underline"
                          onClick={e => { e.stopPropagation(); handleRestoreBooking(b.id) }}
                        >Restore</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {displayBookingsFiltered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-slate-900">No bookings yet</p>
                    <p className="text-xs text-slate-500 mt-1">Bookings will appear here</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saved Cart Items */}
      {cartState.items.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Saved Cart Items ({cartState.items.length})</h3>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Service</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Saved</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {cartState.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-slate-900">{item.service.title}</p>
                      <p className="text-xs text-slate-500">{item.service.vendors.business_name}</p>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-500 capitalize">{item.category}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-900">{formatCurrencyWithConversion(item.totalPrice, item.currency, selectedCurrency, selectedLanguage)}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{formatDateTime(item.savedAt)}</td>
                    <td className="px-4 py-2.5">
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
            // Attach service type to payload for backend logic
            const selectedService = services.find(s => s.id === payload.service_id)
            const created = await createDbBooking({ ...payload, vendor_id: vendorId, service_type: selectedService ? (selectedService as any).type : undefined } as any)
            setBookings(prev => [created, ...prev])
            setShowForm(false)
          }}
        />
      )}



      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
              <h3 className="text-base font-semibold text-slate-900">Booking Receipt</h3>
              <button
                onClick={() => setShowBookingDetails(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-semibold text-slate-900">Reject Booking</h3>
              <button 
                onClick={() => { setShowRejectionModal(false); setBookingToReject(null); setRejectionReason('') }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
              >✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-slate-500">Provide a reason for rejecting this booking. This will be sent to the customer.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Not available on that date, Fully booked..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowRejectionModal(false); setBookingToReject(null); setRejectionReason('') }}
                  className="flex-1 min-h-[40px] px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                >Cancel</button>
                <button
                  onClick={() => handleRejectBooking(bookingToReject.id, rejectionReason)}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 min-h-[40px] px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/20 disabled:bg-slate-300 disabled:cursor-not-allowed"
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
    status: 'pending',
    payment_status: 'pending'
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
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Add Booking</h3>
          <button onClick={onClose} className="min-h-[36px] min-w-[36px] rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20">✕</button>
        </div>
        <form className="px-6 py-4 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Service</label>
            <select value={form.service_id as any} onChange={(e) => setForm(prev => ({ ...prev, service_id: e.target.value }))} className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20">
              {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Guests</label>
              <input type="number" min={1} value={form.guests as any} onChange={(e) => setForm(prev => ({ ...prev, guests: Number(e.target.value) }))} className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select value={form.status as any} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as Booking['status'] }))} className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Amount</label>
            <input type="number" value={form.total_amount as any} onChange={(e) => setForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))} className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20" />
            <p className="text-xs text-slate-500 mt-1">Currency: {form.currency}</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="min-h-[40px] px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20">Cancel</button>
            <button type="submit" className="min-h-[40px] px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20">Create booking</button>
          </div>
        </form>
      </div>
    </div>
  )
}
