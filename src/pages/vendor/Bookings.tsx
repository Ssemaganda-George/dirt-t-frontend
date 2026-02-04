import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Booking, Service } from '../../types'
import { getServices } from '../../store/vendorStore'
import { getAllBookings, createBooking as createDbBooking, updateBooking } from '../../lib/database'
import { formatCurrency, formatDateTime, getVendorDisplayStatus } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { Trash2, Ticket, Calendar, Download } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { supabase } from '../../lib/supabaseClient'

interface TicketData {
  id: string
  code: string
  status: 'issued' | 'used' | 'cancelled'
  issued_at: string
  used_at?: string
  qr_data?: string
  ticket_types: {
    title: string
    price: number
  }
  services: {
    title: string
    event_location?: string
    location?: string
  }
  orders: {
    currency: string
    created_at: string
  }
}

export default function VendorBookings() {
  const { profile, vendor } = useAuth()
  const location = useLocation()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'
  const { state: cartState } = useCart()

  const [activeTab, setActiveTab] = useState<'bookings' | 'tickets'>('bookings')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')

  // Fetch bookings and tickets from Supabase for this vendor
  const load = async () => {
    // Get all bookings, then filter by vendor_id
    const allBookings = await getAllBookings()
    const filteredBookings = allBookings.filter(b => b.vendor_id === vendorId)
    setBookings(filteredBookings)

    // Load tickets for this vendor's services
    try {
      const { data: ticketsData, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types(title, price),
          services!inner(title, event_location, location, vendor_id),
          orders(currency, created_at)
        `)
        .eq('services.vendor_id', vendorId)
        .order('issued_at', { ascending: false })

      if (!error && ticketsData) {
        setTickets(ticketsData)
      }
    } catch (err) {
      console.error('Error loading tickets:', err)
    }

    setServices(getServices(vendorId))
  }

  // Set up real-time subscriptions for bookings and tickets
  useEffect(() => {
    // If the route is /vendor/tickets, default to the tickets tab
    if (location.pathname && location.pathname.endsWith('/tickets')) {
      setActiveTab('tickets')
    }
  }, [location.pathname])

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

    // Subscribe to real-time changes for tickets on this vendor's services
    const ticketsSubscription = supabase
      .channel('vendor_tickets')
      .on('postgres_changes', {
        event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'tickets'
      }, async (payload) => {
        console.log('Real-time ticket change:', payload)

        // Reload tickets when there's any change (since we need to filter by vendor)
        try {
          const { data: ticketsData, error } = await supabase
            .from('tickets')
            .select(`
              *,
              ticket_types(title, price),
              services!inner(title, event_location, location, vendor_id),
              orders(currency, created_at)
            `)
            .eq('services.vendor_id', vendorId)
            .order('issued_at', { ascending: false })

          if (!error && ticketsData) {
            setTickets(ticketsData)
          }
        } catch (err) {
          console.error('Error reloading tickets:', err)
        }
      })
      .subscribe()

    // Cleanup subscriptions on unmount or vendorId change
    return () => {
      bookingsSubscription.unsubscribe()
      ticketsSubscription.unsubscribe()
    }
  }, [vendorId])

  const handleStatusChange = async (bookingId: string, status: Booking['status']) => {
    try {
      await updateBooking(bookingId, { status })
      // Real-time subscription will update the UI automatically
    } catch (error) {
      console.error('Error updating booking status:', error)
      // Revert local state on error
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: b.status } : b))
    }
  }

  const downloadTicket = (ticket: TicketData) => {
    // Create a simple HTML page for the ticket
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const ticketHtml = `
      <div style="border: 2px solid #61B82C; border-radius: 8px; margin: 20px; overflow: hidden; max-width: 600px;">
        <!-- Ticket Header -->
        <div style="background: linear-gradient(to right, #61B82C, #4a8f23); color: white; padding: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎫</div>
              <div>
                <h3 style="font-weight: bold; font-size: 16px; margin: 0;">${ticket.services?.title || 'Event'}</h3>
                <p style="color: rgba(255,255,255,0.9); margin: 2px 0 0 0; font-size: 12px;">${ticket.ticket_types?.title || 'Ticket'}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: rgba(255,255,255,0.8);">Ticket Code</div>
              <div style="font-family: monospace; font-weight: bold; font-size: 14px;">${ticket.code}</div>
            </div>
          </div>
        </div>

        <!-- Ticket Details -->
        <div style="padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <div style="font-size: 12px; margin-bottom: 2px;">
                <span style="color: #6b7280;">Price: </span>
                <span style="font-weight: 600;">${formatCurrency(ticket.ticket_types?.price || 0, ticket.orders?.currency || 'UGX')}</span>
              </div>
              <div style="font-size: 12px; margin-bottom: 8px;">
                <span style="color: #6b7280;">Status: </span>
                <span style="font-weight: 600; color: ${ticket.status === 'issued' ? '#059669' : ticket.status === 'used' ? '#2563eb' : '#6b7280'};">${ticket.status?.charAt(0).toUpperCase() + ticket.status?.slice(1)}</span>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: #6b7280;">Issued: ${new Date(ticket.issued_at).toLocaleDateString()}</div>
              ${ticket.used_at ? `<div style="font-size: 10px; color: #6b7280;">Used: ${new Date(ticket.used_at).toLocaleDateString()}</div>` : ''}
            </div>
          </div>

          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
            📍 ${ticket.services?.event_location || ticket.services?.location || 'Venue TBA'}
          </div>

          <div style="font-size: 10px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px;">
            Valid for entry • Present at venue
          </div>
        </div>
      </div>
    `

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${ticket.code}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${ticketHtml}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  // Filtered bookings
  const filteredBookings = bookings.filter(b => {
    const statusMatch = statusFilter === 'all' || b.status === statusFilter
    const serviceMatch = serviceFilter === 'all' || b.service_id === serviceFilter
    return statusMatch && serviceMatch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings & Tickets</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live updates
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bookings'
                ? 'border-[#61B82C] text-[#61B82C]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="inline-block w-4 h-4 mr-2" />
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tickets'
                ? 'border-[#61B82C] text-[#61B82C]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Ticket className="inline-block w-4 h-4 mr-2" />
            Tickets ({tickets.length})
          </button>
        </nav>
      </div>

      {activeTab === 'bookings' && (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
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
              className="px-3 py-2 rounded-md border border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Services</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

  <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
        {/* Mobile Card View */}
  <div className="block md:hidden">
          {filteredBookings.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              No bookings yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBookings.map(b => (
                <div key={b.id} className="p-4 bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-xl shadow-sm mb-3 border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-primary-700 truncate">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(b.booking_date)} • <span className="font-medium text-gray-700">{b.guests} guests</span>
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="text-lg font-bold text-primary-900">
                        {formatCurrency(b.total_amount, b.currency)}
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={getVendorDisplayStatus(b.status, b.payment_status)} variant="small" />
                      </div>
                    </div>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="flex flex-col gap-2 mt-2">
                    <select
                      value={b.status}
                      onChange={(e) => handleStatusChange(b.id, e.target.value as Booking['status'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                      disabled={b.payment_status !== 'paid'}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>

                    {b.payment_status === 'paid' && b.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                          onClick={() => handleStatusChange(b.id, 'confirmed')}
                        >
                          Accept
                        </button>
                        <button
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                          onClick={() => handleStatusChange(b.id, 'cancelled')}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedBooking(b)
                        setShowBookingDetails(true)
                      }}
                      className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold shadow-sm transition-all"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booked</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map(b => (
                  <tr 
                    key={b.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedBooking(b)
                      setShowBookingDetails(true)
                    }}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">{b.services?.title || b.service?.title || `Service ${b.service_id}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(b.booking_date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{b.guests}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(b.total_amount, b.currency)}</td>
                    <td className="px-6 py-4"><StatusBadge status={getVendorDisplayStatus(b.status, b.payment_status)} variant="small" /></td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-3">
                        <select
                          value={b.status}
                          onChange={(e) => handleStatusChange(b.id, e.target.value as Booking['status'])}
                          className="border rounded-md px-2 py-1"
                          disabled={b.payment_status !== 'paid'}
                          title={b.payment_status !== 'paid' ? 'You can only update status after payment is marked as Paid by admin.' : ''}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="completed">Completed</option>
                        </select>
                        {/* Accept/Reject buttons only if payment is paid and status is pending */}
                        {b.payment_status === 'paid' && b.status === 'pending' && (
                          <>
                            <button
                              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                              title="Accept booking"
                              onClick={e => {
                                e.stopPropagation();
                                handleStatusChange(b.id, 'confirmed');
                              }}
                            >Accept</button>
                            <button
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                              title="Reject booking"
                              onClick={e => {
                                e.stopPropagation();
                                handleStatusChange(b.id, 'cancelled');
                              }}
                            >Reject</button>
                          </>
                        )}
                        {/* Delete booking functionality not implemented for Supabase yet */}
                        <button
                          className="text-red-600 hover:text-red-800 cursor-not-allowed opacity-50"
                          title={b.payment_status !== 'paid' ? 'You can only delete after payment is marked as Paid by admin.' : 'Delete booking (not implemented)'}
                          disabled
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">No bookings yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Saved Cart Items */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Saved Cart Items ({cartState.items.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saved Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cartState.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{item.service.title}</div>
                      <div className="text-gray-500">{item.service.vendors.business_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">{item.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(item.totalPrice, item.currency)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatDateTime(item.savedAt)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {cartState.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">No saved cart items.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
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

      {activeTab === 'tickets' && (
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Event Tickets</h3>
            <p className="text-sm text-gray-500 mt-1">Tickets issued for your events</p>
          </div>

          {tickets.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              No tickets issued yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                        {ticket.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.services?.title || 'Unknown Event'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ticket.services?.event_location || ticket.services?.location || 'Venue TBA'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.ticket_types?.title || 'Ticket'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(ticket.issued_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(ticket.ticket_types?.price || 0, ticket.orders?.currency || 'UGX')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={ticket.status === 'issued' ? 'confirmed' : ticket.status === 'used' ? 'completed' : ticket.status}
                          variant="small"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => downloadTicket(ticket)}
                          className="text-[#61B82C] hover:text-[#4a8f23] flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Booking Details</h3>
              <button 
                onClick={() => setShowBookingDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Booking Information</h4>
                  <div className="mt-2 space-y-2">
                    <p><span className="font-medium">Booking ID:</span> #{selectedBooking.id.slice(0, 8)}</p>
                    <p><span className="font-medium">Service:</span> {selectedBooking.services?.title || selectedBooking.service?.title || `Service ${selectedBooking.service_id}`}</p>
                    <p><span className="font-medium">Booked Date:</span> {formatDateTime(selectedBooking.booking_date)}</p>
                    <p><span className="font-medium">Service Date:</span> {selectedBooking.service_date ? formatDateTime(selectedBooking.service_date) : 'Not specified'}</p>
                    <p><span className="font-medium">Guests:</span> {selectedBooking.guests}</p>
                    <p><span className="font-medium">Total Amount:</span> {formatCurrency(selectedBooking.total_amount, selectedBooking.currency)}</p>
                    <p><span className="font-medium">Status:</span> <StatusBadge status={getVendorDisplayStatus(selectedBooking.status, selectedBooking.payment_status)} variant="small" /></p>
                    <p><span className="font-medium">Payment Status:</span> <StatusBadge status={selectedBooking.payment_status} variant="small" /></p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Customer Information</h4>
                  <div className="mt-2 space-y-2">
                    {selectedBooking.is_guest_booking ? (
                      <>
                        <p><span className="font-medium">Guest Name:</span> {selectedBooking.guest_name}</p>
                        <p><span className="font-medium">Guest Email:</span> {selectedBooking.guest_email}</p>
                        <p><span className="font-medium">Guest Phone:</span> {selectedBooking.guest_phone}</p>
                      </>
                    ) : (
                      <>
                        <p><span className="font-medium">Customer ID:</span> #{selectedBooking.tourist_id?.slice(0, 8)}</p>
                        <p><span className="font-medium">Name:</span> {selectedBooking.tourist_profile?.full_name || 'Not available'}</p>
                      </>
                    )}
                  </div>
                  
                  {selectedBooking.special_requests && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900">Special Requests</h4>
                      <p className="mt-1 text-sm text-gray-600">{selectedBooking.special_requests}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Transport-specific details */}
              {(selectedBooking.pickup_location || selectedBooking.dropoff_location || selectedBooking.driver_option) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900">Transport Details</h4>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedBooking.pickup_location && (
                      <p><span className="font-medium">Pickup Location:</span> {selectedBooking.pickup_location}</p>
                    )}
                    {selectedBooking.dropoff_location && (
                      <p><span className="font-medium">Dropoff Location:</span> {selectedBooking.dropoff_location}</p>
                    )}
                    {selectedBooking.driver_option && (
                      <p><span className="font-medium">Driver Option:</span> {selectedBooking.driver_option}</p>
                    )}
                    {selectedBooking.return_trip && (
                      <p><span className="font-medium">Return Trip:</span> Yes</p>
                    )}
                    {selectedBooking.start_time && (
                      <p><span className="font-medium">Start Time:</span> {selectedBooking.start_time}</p>
                    )}
                    {selectedBooking.end_time && (
                      <p><span className="font-medium">End Time:</span> {selectedBooking.end_time}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4 flex justify-end">
                <button 
                  onClick={() => setShowBookingDetails(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Close
                </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900">Add Booking</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form className="px-6 py-4 space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form) }}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Service</label>
            <select value={form.service_id as any} onChange={(e) => setForm(prev => ({ ...prev, service_id: e.target.value }))} className="mt-1 w-full border rounded-md px-3 py-2">
              {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Guests</label>
              <input type="number" min={1} value={form.guests as any} onChange={(e) => setForm(prev => ({ ...prev, guests: Number(e.target.value) }))} className="mt-1 w-full border rounded-md px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select value={form.status as any} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as Booking['status'] }))} className="mt-1 w-full border rounded-md px-3 py-2">
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Amount</label>
            <input type="number" value={form.total_amount as any} onChange={(e) => setForm(prev => ({ ...prev, total_amount: Number(e.target.value) }))} className="mt-1 w-full border rounded-md px-3 py-2" />
            <p className="text-xs text-gray-500 mt-1">Currency: {form.currency}</p>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border bg-white">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-primary-600 text-white">Create booking</button>
          </div>
        </form>
      </div>
    </div>
  )
}
