import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Ticket, Download, Search, Filter } from 'lucide-react'

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
    vendors: {
      business_name: string
    }
  }
  orders: {
    currency: string
    created_at: string
  }
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          ticket_types(title, price),
          services(title, event_location, location, vendors(business_name)),
          orders(currency, created_at)
        `)
        .order('issued_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
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
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
            👥 ${ticket.services?.vendors?.business_name || 'Service Provider'}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issued Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                        {ticket.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.services?.title || 'Unknown Event'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ticket.ticket_types?.title || 'Ticket'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.services?.vendors?.business_name || 'Unknown Vendor'}
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
      </div>
    </div>
  )
}