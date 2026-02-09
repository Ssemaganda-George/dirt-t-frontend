import { useState, useEffect } from 'react';
import * as QRCode from 'qrcode'
import { useBookings } from '../../hooks/hook';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrencyWithConversion, formatDateTime } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext'
import type { Booking } from '../../types';
import { supabase } from '../../lib/supabaseClient'
import SearchBar from '../../components/SearchBar';

export function ToursBookings() {
  const { bookings, loading, error, updateBookingStatus, updatePaymentStatus } = useBookings();
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [vendors, setVendors] = useState<any[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filteredBookings, setFilteredBookings] = useState<Booking[] | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBookingTickets, setSelectedBookingTickets] = useState<any[]>([])
  const [showTicketImage, setShowTicketImage] = useState(false)
  const [ticketImageUrl, setTicketImageUrl] = useState<string | null>(null)

  // Helper function to filter bookings based on search query
  const filterBookingsBySearch = (bookingsToFilter: Booking[]): Booking[] => {
    if (!searchQuery.trim()) return bookingsToFilter

    const query = searchQuery.toLowerCase()
    return bookingsToFilter.filter(booking => {
      // Search in service title
      if (booking.service?.title?.toLowerCase().includes(query)) return true
      if (booking.services?.title?.toLowerCase().includes(query)) return true

      // Search in service description
      if (booking.service?.description?.toLowerCase().includes(query)) return true

      // Search in customer name (tourist profile or guest name)
      if (booking.tourist_profile?.full_name?.toLowerCase().includes(query)) return true
      if (booking.profiles?.full_name?.toLowerCase().includes(query)) return true
      if (booking.guest_name?.toLowerCase().includes(query)) return true

      // Search in customer email
      if (booking.guest_email?.toLowerCase().includes(query)) return true

      // Search in vendor name (if available in service.vendors)
      if (booking.service?.vendors?.business_name?.toLowerCase().includes(query)) return true

      // Search in booking status
      if (booking.status?.toLowerCase().includes(query)) return true
      if (booking.payment_status?.toLowerCase().includes(query)) return true

      // Search in booking ID
      if (booking.id?.toLowerCase().includes(query)) return true

      return false
    })
  }

  useEffect(() => {
    // Load vendors for filters
    let mounted = true
    ;(async () => {
      try {
        // For the bookings filters we only want approved vendors and we want the full list
        // (previous helper used a limited/simple query which omitted older vendors).
        const { data: vendorData, error: vendorErr } = await supabase
          .from('vendors')
          .select('id, user_id, business_name, business_email, status')
          .eq('status', 'approved')
          .order('business_name', { ascending: true })

        if (vendorErr) {
          console.error('Error fetching vendors for filters:', vendorErr)
        }

        if (mounted) {
          const v = vendorData || []
          setVendors(v)
        }
      } catch (err) {
        console.error('Error loading vendors for admin filters:', err)
      }
    })()

    return () => { mounted = false }
  }, [])

  // When a booking is selected, load related tickets (if any) so admin can see issued tickets
  useEffect(() => {
    let mounted = true
    const loadTicketsForBooking = async (booking: Booking | null) => {
      if (!booking) {
        if (mounted) setSelectedBookingTickets([])
        return
      }

      try {
        // Fetch tickets for the same service — we'll filter client-side for matching owner/order where possible
        const { data: ticketsData, error: ticketsErr } = await supabase
          .from('tickets')
          .select('*, ticket_types(*), orders(*), services(*)')
          .eq('service_id', booking.service_id)
          .order('issued_at', { ascending: false })

        if (ticketsErr) {
          console.error('Error fetching tickets for booking details:', ticketsErr)
          if (mounted) setSelectedBookingTickets([])
          return
        }

        // Narrow down to tickets that likely belong to this booking's customer
        const filtered = (ticketsData || []).filter((t: any) => {
          if (!booking) return false
          const touristId = booking.tourist_id
          // ticket owner or orders.user_id may reference the same tourist
          if (t.owner_id && touristId && t.owner_id === touristId) return true
          if (t.orders && (t.orders.user_id === touristId || t.orders.user_id === booking.tourist_id)) return true
          // fallback: ticket created around booking time or exact service match
          return false
        })

        if (mounted) setSelectedBookingTickets(filtered || [])
      } catch (err) {
        console.error('Exception loading tickets for booking details:', err)
        if (mounted) setSelectedBookingTickets([])
      }
    }

    loadTicketsForBooking(selectedBooking)

    return () => { mounted = false }
  }, [selectedBooking])

  // Apply search filter whenever searchQuery changes
  useEffect(() => {
    if (!bookings.length) return

    if (!searchQuery.trim()) {
      // If no search query and no other filters, show all bookings
      if (selectedVendor === 'all') {
        setFilteredBookings(null)
      }
      return
    }

    // Apply search filter to current bookings
    const searchFiltered = filterBookingsBySearch(bookings)
    setFilteredBookings(searchFiltered)
  }, [searchQuery, bookings])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading bookings: {error}</p>
      </div>
    );
  }

  // Apply vendor filter: fetch bookings for all services by a vendor
  const handleSelectVendorCard = async (vendorId: string) => {
    try {
      setSelectedVendor(vendorId)

      if (vendorId === 'all') {
        const searchFiltered = filterBookingsBySearch(bookings)
        setFilteredBookings(searchFiltered.length === bookings.length ? null : searchFiltered)
        return
      }

      // Get services by this vendor
      const { data: servicesData, error: servicesErr } = await supabase
        .from('services')
        .select('id, vendor_id')
        .eq('vendor_id', vendorId)

      if (servicesErr) {
        console.error('Error fetching services for vendor:', servicesErr)
        return
      }

      const serviceIds = (servicesData || []).map((s: any) => s.id)
      if (serviceIds.length === 0) {
        setFilteredBookings([])
        return
      }

      // Get bookings for those services
      const { data: vendorBookings, error: bookingsErr } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(
            id,
            title,
            description,
            location,
            event_date,
            check_in_time,
            check_out_time,
            departure_time,
            service_categories(name),
            vendors(business_name)
          ),
          tourist_profile:profiles!bookings_tourist_id_fkey(full_name),
          profiles(full_name)
        `)
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false })

      if (bookingsErr) {
        console.error('Error fetching bookings for vendor:', bookingsErr)
        return
      }

      // Apply search filter to vendor bookings
      const searchFiltered = filterBookingsBySearch(vendorBookings || [])
      setFilteredBookings(searchFiltered)
    } catch (err) {
      console.error('Exception applying vendor filter:', err)
    }
  }

  const handleBookingStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      await updateBookingStatus(bookingId, newStatus as 'pending' | 'confirmed' | 'cancelled' | 'completed')
    } catch (err) {
      console.error('Failed to update booking status:', err)
    }
  }

  const handlePaymentStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      await updatePaymentStatus(bookingId, newStatus as 'pending' | 'paid' | 'refunded')
    } catch (err) {
      console.error('Failed to update payment status:', err)
    }
  }

  const generateTicketQR = async (ticketData: any) => {
    try {
      const text = JSON.stringify({
        ticketId: ticketData.id,
        bookingId: ticketData.booking_id,
        serviceId: ticketData.service_id,
        ownerId: ticketData.owner_id,
        issuedAt: ticketData.issued_at
      })

      const qrCodeDataUrl = await QRCode.toDataURL(text)

      setTicketImageUrl(qrCodeDataUrl)
      setShowTicketImage(true)
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }

  const handleViewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowBookingDetails(true)
  }

  const handleCloseBookingDetails = () => {
    setSelectedBooking(null)
    setShowBookingDetails(false)
    setSelectedBookingTickets([])
  }

  // Determine which bookings to display
  let displayBookings = bookings
  if (filteredBookings !== null) {
    displayBookings = filteredBookings
  } else {
    // Filter to only show tours bookings by default
    displayBookings = bookings.filter(booking =>
      booking.service?.service_categories?.name?.toLowerCase() === 'tour packages' ||
      booking.service?.category_id === 'cat_tour_packages'
    )
  }

  const totalBookings = displayBookings.length
  const confirmedBookings = displayBookings.filter(b => b.status === 'confirmed').length
  const pendingBookings = displayBookings.filter(b => b.status === 'pending').length
  const cancelledBookings = displayBookings.filter(b => b.status === 'cancelled').length
  const totalRevenue = displayBookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tours Bookings Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all tour bookings</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">Total: {totalBookings}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">Confirmed: {confirmedBookings}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">Pending: {pendingBookings}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700">Cancelled: {cancelledBookings}</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">Revenue: {formatCurrencyWithConversion(totalRevenue, 'UGX', selectedCurrency, selectedLanguage)}</span>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4">
        <SearchBar
          placeholder="Search tours bookings by service, customer, or booking ID..."
          onSearch={setSearchQuery}
          initialValue={searchQuery}
          className="max-w-md"
        />
      </div>

      {/* Current Category */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Current Category</h2>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          <button
            className="flex-shrink-0 px-4 py-2 rounded border border-blue-500 bg-blue-50 text-left"
          >
            <div className="text-sm font-medium">Tours</div>
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vendor-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Vendor
            </label>
            <select
              id="vendor-filter"
              value={selectedVendor}
              onChange={(e) => handleSelectVendorCard(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.business_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">All Tour Bookings</h3>
          <p className="text-xs text-gray-500 mt-0.5">{displayBookings.length} bookings found</p>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Booking Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No tours bookings found
                    </td>
                  </tr>
                ) : (
                  displayBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{booking.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {booking.service?.title || booking.services?.title || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.service?.location || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.tourist_profile?.full_name || booking.profiles?.full_name || booking.guest_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.guest_email || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(booking.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.service?.event_date
                          ? formatDateTime(booking.service?.event_date)
                          : 'N/A'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrencyWithConversion(booking.total_amount || 0, booking.currency || 'UGX', selectedCurrency, selectedLanguage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={booking.status || 'pending'} variant="small" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={booking.payment_status || 'pending'} variant="small" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewBookingDetails(booking)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                        <select
                          value={booking.status || 'pending'}
                          onChange={(e) => handleBookingStatusUpdate(booking.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="completed">Completed</option>
                        </select>
                        <select
                          value={booking.payment_status || 'pending'}
                          onChange={(e) => handlePaymentStatusUpdate(booking.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-xl rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Tour Booking Details</h3>
                <button
                  onClick={handleCloseBookingDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Booking Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Booking ID:</span> {selectedBooking.id}</p>
                    <p><span className="font-medium">Status:</span> <StatusBadge status={selectedBooking.status || 'pending'} variant="small" /></p>
                    <p><span className="font-medium">Payment Status:</span> <StatusBadge status={selectedBooking.payment_status || 'pending'} variant="small" /></p>
                    <p><span className="font-medium">Total Amount:</span> {formatCurrencyWithConversion(selectedBooking.total_amount || 0, selectedBooking.currency || 'UGX', selectedCurrency, selectedLanguage)}</p>
                    <p><span className="font-medium">Created:</span> {formatDateTime(selectedBooking.created_at)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedBooking.tourist_profile?.full_name || selectedBooking.profiles?.full_name || selectedBooking.guest_name || 'N/A'}</p>
                    <p><span className="font-medium">Email:</span> {selectedBooking.guest_email || 'N/A'}</p>
                    <p><span className="font-medium">Phone:</span> {selectedBooking.guest_phone || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Tour Service</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Title:</span> {selectedBooking.service?.title || 'N/A'}</p>
                    <p><span className="font-medium">Location:</span> {selectedBooking.service?.location || 'N/A'}</p>
                    <p><span className="font-medium">Tour Date:</span> {selectedBooking.service?.event_date ? formatDateTime(selectedBooking.service?.event_date) : 'N/A'}</p>
                    <p><span className="font-medium">Vendor:</span> {selectedBooking.service?.vendors?.business_name || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Additional Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Number of Guests:</span> {selectedBooking.guests || 1}</p>
                    <p><span className="font-medium">Special Requests:</span> {selectedBooking.special_requests || 'None'}</p>
                  </div>
                </div>
              </div>

              {selectedBookingTickets.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Tickets</h4>
                  <div className="space-y-2">
                    {selectedBookingTickets.map((ticket: any) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">Ticket #{ticket.id}</p>
                          <p className="text-xs text-gray-500">Issued: {formatDateTime(ticket.issued_at)}</p>
                        </div>
                        <button
                          onClick={() => generateTicketQR(ticket)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          View QR
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showTicketImage && ticketImageUrl && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Ticket QR Code</h3>
              <button
                onClick={() => setShowTicketImage(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="flex justify-center">
              <img src={ticketImageUrl} alt="Ticket QR Code" className="max-w-full h-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}