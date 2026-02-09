import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as QRCode from 'qrcode'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrencyWithConversion, formatDateTime, convertCurrency } from '../../lib/utils'
import { Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
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
  }
  orders: {
    currency: string
    created_at: string
    user_id?: string
  }
  buyer_profile?: {
    full_name?: string
    email?: string
  }
}

export default function VendorTickets() {
  const { vendor, profile } = useAuth()
  const { selectedCurrency } = usePreferences()
  const navigate = useNavigate()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'

  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
  const [selectedAttendanceFilter, setSelectedAttendanceFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setSelectedEventFilter('all')
    setSelectedTypeFilter('all')
    setSelectedAttendanceFilter('all')
    setSelectedStatusFilter('all')
  }

  useEffect(() => {
    loadTickets()
  }, [vendorId])

  const loadTickets = async () => {
    try {
      setLoading(true)

      // Load tickets for this vendor's services
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types(title, price),
          services!inner(title, event_location, location, primary_image_url, vendor_id),
          orders(currency, created_at, user_id)
        `)
        .eq('services.vendor_id', vendorId)
        .order('issued_at', { ascending: false })

      if (ticketsError) throw ticketsError

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
      ticket.ticket_types?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.buyer_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.buyer_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const tableFilteredTickets = filteredTickets
    .filter(t => selectedEventFilter === 'all' || (t.services?.title || 'Event') === selectedEventFilter)
    .filter(t => selectedTypeFilter === 'all' || (t.ticket_types?.title || 'Ticket') === selectedTypeFilter)
    .filter(t => selectedStatusFilter === 'all' || t.status === selectedStatusFilter)
    .filter(t => {
      if (selectedAttendanceFilter === 'all') return true;
      if (selectedAttendanceFilter === 'attended') return t.status === 'used';
      if (selectedAttendanceFilter === 'not-attended') return t.status !== 'used';
      return true;
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
            <div style="flex-shrink: 0; text-align: center;">
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
              Valid for entry • One-time use only
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
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-7 bg-gray-200 rounded w-36"></div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-gray-200 h-20"></div>)}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 h-64"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage your event tickets</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div onClick={() => navigate('/vendor/events')} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm cursor-pointer transition-all">
          <p className="text-xs font-medium text-gray-500">Events</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.totalEvents}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Total</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Active</p>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">{stats.issued}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Used</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.used}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500">Cancelled</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">{stats.cancelled}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code, event, buyer name, email, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="issued">Active</option>
              <option value="used">Used</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
            >Clear</button>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Code</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                  <select value={selectedEventFilter} onChange={(e) => setSelectedEventFilter(e.target.value)} className="text-xs font-medium text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer p-0">
                    <option value="all">All Events</option>
                    {Array.from(new Set(tickets.map(t => t.services?.title || 'Event').filter(title => title !== 'Event'))).sort().map(eventName => (
                      <option key={eventName} value={eventName}>{eventName}</option>
                    ))}
                  </select>
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                  <select value={selectedTypeFilter} onChange={(e) => setSelectedTypeFilter(e.target.value)} className="text-xs font-medium text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer p-0">
                    <option value="all">All Types</option>
                    {Array.from(new Set(tickets.map(t => t.ticket_types?.title || 'Ticket').filter(title => title !== 'Ticket'))).sort().map(typeName => (
                      <option key={typeName} value={typeName}>{typeName}</option>
                    ))}
                  </select>
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Issued</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Price</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                  <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className="text-xs font-medium text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer p-0">
                    <option value="all">Status</option>
                    <option value="issued">Active</option>
                    <option value="used">Used</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">
                  <select value={selectedAttendanceFilter} onChange={(e) => setSelectedAttendanceFilter(e.target.value)} className="text-xs font-medium text-gray-500 bg-transparent border-none focus:ring-0 cursor-pointer p-0">
                    <option value="all">Attendance</option>
                    <option value="attended">Attended</option>
                    <option value="not-attended">Not Attended</option>
                  </select>
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableFilteredTickets.map((ticket) => (
                <tr key={ticket.id} className="group border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{ticket.code}</td>
                  <td className="px-5 py-3 text-sm text-gray-900">{ticket.services?.title || 'Event'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{ticket.ticket_types?.title || 'Ticket'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{formatDateTime(ticket.issued_at)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCurrencyWithConversion(ticket.ticket_types?.price || 0, ticket.orders?.currency || 'UGX', selectedCurrency)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                      ticket.status === 'issued' ? 'bg-emerald-50 text-emerald-700'
                        : ticket.status === 'used' ? 'bg-gray-100 text-gray-600'
                          : 'bg-red-50 text-red-700'
                    }`}>{ticket.status}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {ticket.status === 'used' ? (
                      <span className="text-xs text-emerald-600 font-medium">✓ Attended</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => downloadTicket(ticket)}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
                    >View</button>
                  </td>
                </tr>
              ))}
              {tableFilteredTickets.length > 0 && (
                <tr className="border-t border-gray-200 bg-gray-50/50">
                  <td colSpan={4} className="px-5 py-3 text-sm font-medium text-gray-500 text-right">
                    Total ({tableFilteredTickets.length} ticket{tableFilteredTickets.length !== 1 ? 's' : ''}):
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                    {(() => {
                      const total = tableFilteredTickets.reduce((sum, ticket) => {
                        const price = ticket.ticket_types?.price || 0;
                        const originalCurrency = ticket.orders?.currency || 'UGX';
                        return sum + convertCurrency(price, originalCurrency, selectedCurrency);
                      }, 0);
                      return formatCurrencyWithConversion(total, selectedCurrency, selectedCurrency);
                    })()}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden divide-y divide-gray-100">
          {tableFilteredTickets.map((ticket) => (
            <div key={ticket.id} className="p-4">
              <div className="flex justify-between items-start gap-2 mb-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{ticket.services?.title || 'Event'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ticket.code} · {ticket.ticket_types?.title || 'Ticket'}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0 ${
                  ticket.status === 'issued' ? 'bg-emerald-50 text-emerald-700'
                    : ticket.status === 'used' ? 'bg-gray-100 text-gray-600'
                      : 'bg-red-50 text-red-700'
                }`}>{ticket.status}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm font-medium text-gray-900">{formatCurrencyWithConversion(ticket.ticket_types?.price || 0, ticket.orders?.currency || 'UGX', selectedCurrency)}</p>
                <button onClick={() => downloadTicket(ticket)} className="text-xs font-medium text-gray-600 hover:text-gray-900">View</button>
              </div>
            </div>
          ))}
        </div>

        {tableFilteredTickets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-gray-900">No tickets found</p>
            <p className="text-xs text-gray-500 mt-1">No tickets match your current filters</p>
          </div>
        )}
      </div>
    </div>
  )
}