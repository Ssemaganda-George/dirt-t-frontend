import { useEffect, useState } from 'react'
import * as QRCode from 'qrcode'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrencyWithConversion, formatDateTime, convertCurrency } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Ticket, Search, Filter, RotateCcw } from 'lucide-react'
import { usePreferences } from '../../contexts/PreferencesContext'

interface TicketData {
  id: string
  code: string
  status: 'issued' | 'used' | 'cancelled'
  issued_at: string
  used_at?: string
  qr_data?: string
  service_id: string
  owner_id: string
  ticket_types: {
    title: string
    price: number
  }
  services: {
    title: string
    event_location?: string
    location?: string
    primary_image_url?: string
    vendors: {
      business_name: string
    }
  }
  orders: {
    currency: string
    created_at: string
    user_id: string
  }
  buyer_profile?: {
    full_name: string
    email: string
  } | null
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('all')
  const [selectedAttendanceFilter, setSelectedAttendanceFilter] = useState<string>('all')
  const { selectedCurrency } = usePreferences()

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setSelectedEventFilter('all')
    setSelectedTypeFilter('all')
    setSelectedVendorFilter('all')
    setSelectedAttendanceFilter('all')
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      setLoading(true)
      
      // Load tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types(title, price),
          services(title, event_location, location, primary_image_url, vendors(business_name)),
          orders(currency, created_at, user_id)
        `)
        .order('issued_at', { ascending: false })

      if (ticketsError) throw ticketsError

      // Load bookings to match with tickets
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id, service_id, tourist_id, status, payment_status, created_at,
          profiles(full_name),
          guest_name, guest_email
        `)
        .order('created_at', { ascending: false })

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError)
        // Continue without bookings data
      }

      // Fetch profiles for ticket buyers
      let profilesMap: Record<string, { full_name: string; email: string }> = {}
      if (ticketsData && ticketsData.length > 0) {
        const userIds = [...new Set(ticketsData.map(t => t.orders?.user_id).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)

          if (!profilesError && profilesData) {
            profilesMap = profilesData.reduce((acc, profile) => {
              acc[profile.id] = { full_name: profile.full_name, email: profile.email }
              return acc
            }, {} as Record<string, { full_name: string; email: string }>)
          }
        }
      }

      // Attach profile information to tickets
      const ticketsWithProfiles = (ticketsData || []).map(ticket => ({
        ...ticket,
        buyer_profile: ticket.orders?.user_id ? profilesMap[ticket.orders.user_id] : null
      }))

      setTickets(ticketsWithProfiles)
      setBookings(bookingsData || [])
    } catch (err) {
      console.error('Error loading tickets:', err)
      setError('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.services?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.services?.vendors?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: tickets.length,
    issued: tickets.filter(t => t.status === 'issued').length,
    used: tickets.filter(t => t.status === 'used').length,
    cancelled: tickets.filter(t => t.status === 'cancelled').length,
    totalEvents: new Set(tickets.map(t => t.services?.title).filter(Boolean)).size,
  }

  const downloadTicket = async (ticket: TicketData) => {
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(ticket.code)

    // Create a simple HTML page for the ticket
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const ticketHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border: 2px solid #61B82C;">
        <!-- Ticket Header -->
        <div style="background: linear-gradient(135deg, #61B82C 0%, #4a8f23 100%); color: white; padding: 16px 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${(() => {
                const eventImage = ticket.services?.primary_image_url;
                return eventImage ? `
                  <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <img src="${eventImage}" alt="Event Flier" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                ` : `
                  <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🎫</div>
                `;
              })()}
              <div>
                <h2 style="font-weight: 700; font-size: 16px; margin: 0; line-height: 1.2;">${ticket.services?.title || 'Event'}</h2>
                <p style="margin: 2px 0 0 0; font-size: 12px; opacity: 0.9;">${ticket.ticket_types?.title || 'Ticket'}</p>
              </div>
            </div>
            <div style="text-align: right; font-family: 'Courier New', monospace;">
              <div style="font-size: 10px; opacity: 0.8; margin-bottom: 2px;">CODE</div>
              <div style="font-weight: 700; font-size: 14px; letter-spacing: 1px;">${ticket.code}</div>
            </div>
          </div>
        </div>

        <!-- Ticket Body -->
        <div style="padding: 16px;">
          <div style="display: flex; gap: 12px; align-items: center;">
            <!-- Left Section - Event Details -->
            <div style="flex: 1;">
              <h3 style="font-size: 11px; font-weight: 600; color: #374151; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Event</h3>
              <div style="font-size: 11px; color: #6b7280; line-height: 1.3;">
                <div style="margin-bottom: 2px;"><strong>${ticket.services?.title || 'Event'}</strong></div>
                <div style="display: flex; align-items: center; gap: 3px; margin-bottom: 1px;">
                  <span>📅</span>
                  <span>${new Date(ticket.issued_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 3px;">
                  <span>📍</span>
                  <span>${ticket.services?.event_location || ticket.services?.location || 'Venue TBA'}</span>
                </div>
              </div>
            </div>

            <!-- Center Section - Buyer Information -->
            <div style="flex: 1; text-align: center; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; padding: 0 12px;">
              <h3 style="font-size: 11px; font-weight: 600; color: #374151; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">Buyer</h3>
              <div style="font-size: 11px; color: #6b7280; line-height: 1.3;">
                <div style="margin-bottom: 2px;"><strong>${ticket.buyer_profile?.full_name || 'N/A'}</strong></div>
                <div>${ticket.buyer_profile?.email || 'N/A'}</div>
              </div>
              <div style="margin-top: 6px;">
                <div style="display: inline-flex; align-items: center; gap: 3px; padding: 2px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; background: ${ticket.status === 'issued' ? '#dcfce7' : ticket.status === 'used' ? '#dbeafe' : '#fef3c7'}; color: ${ticket.status === 'issued' ? '#166534' : ticket.status === 'used' ? '#1e40af' : '#92400e'};">
                  <span>${ticket.status?.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <!-- Right Section - QR Code & Price -->
            <div style="flex: 1; text-align: center;">
              <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px; margin-bottom: 4px; display: inline-block;">
                <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 60px; height: 60px; display: block;" />
              </div>
              <div style="font-size: 9px; color: #6b7280; margin-bottom: 4px;">Scan for Entry</div>
              <div style="font-size: 12px; font-weight: 700; color: #374151;">${formatCurrencyWithConversion(ticket.ticket_types?.price || 0, ticket.orders?.currency || 'UGX', selectedCurrency)}</div>
            </div>
          </div>

          <!-- Footer -->
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #d1d5db; text-align: center;">
            <div style="font-size: 9px; color: #9ca3af;">
              Valid for entry • One-time use only • ${ticket.services?.vendors?.business_name || 'Service Provider'}
            </div>
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
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f9fafb;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            @media print {
              body { padding: 0; background: white; }
              .no-print { display: none; }
            }
            @page {
              size: A4;
              margin: 0.5in;
            }
          </style>
        </head>
        <body>
          ${ticketHtml}
          
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="background: #61B82C; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">Print Ticket</button>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ticket Management</h1>
        <div className="flex items-center text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Real-time updates enabled
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.totalEvents}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalEvents}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.total}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tickets</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.issued}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Tickets</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.issued}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.used}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Used Tickets</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.used}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{stats.cancelled}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Cancelled</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.cancelled}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tickets by code, event, or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-[#61B82C] focus:border-[#61B82C]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400 h-4 w-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-[#61B82C] focus:border-[#61B82C]"
            >
              <option value="all">All Statuses</option>
              <option value="issued">Active</option>
              <option value="used">Used</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              title="Clear all filters"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">All Tickets</h3>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No tickets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <select
                        value={selectedEventFilter}
                        onChange={(e) => setSelectedEventFilter(e.target.value)}
                        className="text-xs font-medium text-gray-500 uppercase bg-white border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Events</option>
                        {Array.from(new Set(tickets.map(t => t.services?.title || 'Event').filter(title => title !== 'Event'))).sort().map(eventName => (
                          <option key={eventName} value={eventName}>{eventName}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <select
                        value={selectedTypeFilter}
                        onChange={(e) => setSelectedTypeFilter(e.target.value)}
                        className="text-xs font-medium text-gray-500 uppercase bg-white border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Types</option>
                        {Array.from(new Set(tickets.map(t => t.ticket_types?.title || 'Ticket').filter(title => title !== 'Ticket'))).sort().map(typeName => (
                          <option key={typeName} value={typeName}>{typeName}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <select
                        value={selectedVendorFilter}
                        onChange={(e) => setSelectedVendorFilter(e.target.value)}
                        className="text-xs font-medium text-gray-500 uppercase bg-white border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Vendors</option>
                        {Array.from(new Set(tickets.map(t => t.services?.vendors?.business_name || 'Unknown').filter(name => name !== 'Unknown'))).sort().map(vendorName => (
                          <option key={vendorName} value={vendorName}>{vendorName}</option>
                        ))}
                      </select>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <select
                        value={selectedAttendanceFilter}
                        onChange={(e) => setSelectedAttendanceFilter(e.target.value)}
                        className="text-xs font-medium text-gray-500 uppercase bg-white border border-gray-300 rounded px-2 py-1 cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Attendance</option>
                        <option value="attended">Attended</option>
                        <option value="not-attended">Not Attended</option>
                      </select>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const filteredTickets = tickets
                      .filter(t => selectedEventFilter === 'all' || (t.services?.title || 'Event') === selectedEventFilter)
                      .filter(t => selectedTypeFilter === 'all' || (t.ticket_types?.title || 'Ticket') === selectedTypeFilter)
                      .filter(t => selectedVendorFilter === 'all' || (t.services?.vendors?.business_name || 'Unknown') === selectedVendorFilter)
                      .filter(t => {
                        if (selectedAttendanceFilter === 'all') return true;
                        if (selectedAttendanceFilter === 'attended') return t.status === 'used';
                        if (selectedAttendanceFilter === 'not-attended') return t.status !== 'used';
                        return true;
                      });

                    return (
                      <>
                        {filteredTickets.map((ticket) => (
                          <tr key={ticket.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(() => {
                                // Match tickets to bookings based on service and tourist
                                const match = bookings.find((b: any) =>
                                  b.service_id === ticket.service_id && (b.tourist_id === ticket.owner_id || (ticket.orders && b.tourist_id === ticket.orders.user_id))
                                )
                                return match ? `#${match.id.slice(0,8)}` : '—'
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.code}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.services?.title || 'Event'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ticket.ticket_types?.title || 'Ticket'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ticket.services?.vendors?.business_name || 'Unknown'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(ticket.issued_at)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <StatusBadge status={ticket.status} variant="small" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrencyWithConversion(ticket.ticket_types?.price || 0, ticket.orders?.currency || 'UGX', selectedCurrency)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {(() => {
                                // Match tickets to bookings based on service and tourist
                                const match = bookings.find((b: any) =>
                                  b.service_id === ticket.service_id && (b.tourist_id === ticket.owner_id || (ticket.orders && b.tourist_id === ticket.orders.user_id))
                                )
                                return match ? <StatusBadge status={match.status} variant="small" /> : <span className="text-sm text-gray-500">—</span>
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {ticket.status === 'used' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Attended
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Not Attended
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <button
                                onClick={() => downloadTicket(ticket)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              >
                                View Ticket
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredTickets.length > 0 && (
                          <tr className="bg-gray-50 border-t-2 border-gray-200">
                            <td colSpan={7} className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                              Total ({filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}):
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              {(() => {
                                const total = filteredTickets.reduce((sum, ticket) => {
                                  const price = ticket.ticket_types?.price || 0;
                                  const originalCurrency = ticket.orders?.currency || 'UGX';
                                  return sum + convertCurrency(price, originalCurrency, selectedCurrency);
                                }, 0);
                                return formatCurrencyWithConversion(total, selectedCurrency, selectedCurrency);
                              })()}
                            </td>
                            <td colSpan={3} className="px-6 py-4"></td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}