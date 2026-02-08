import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrencyWithConversion } from '../../lib/utils'
import { usePreferences } from '../../contexts/PreferencesContext'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Calendar, MapPin, Users, DollarSign, CheckCircle, Clock, ExternalLink, Copy } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { createActivationRequest } from '../../lib/database'

interface EventData {
  id: string
  title: string
  description: string
  location: string
  event_location?: string
  primary_image_url?: string
  status: 'active' | 'inactive' | 'pending' | 'draft'
  scan_enabled?: boolean
  created_at: string
  updated_at: string
  vendor_id: string
  category_id?: string
  ticket_types: Array<{
    id: string
    title: string
    price: number
    quantity: number
    sold_count: number
  }>
  ticket_sales: number
  total_revenue: number
  service_categories?: {
    name: string
  }
}

export default function VendorEvents() {
  const { vendor, profile, user } = useAuth()
  const { selectedCurrency } = usePreferences()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'

  const [events, setEvents] = useState<EventData[]>([])
  const [activationRequests, setActivationRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  useEffect(() => {
    if (vendorId) {
      loadEvents()
    }
  }, [vendorId])

  const loadEvents = async () => {
    try {
      setLoading(true)

      // Load events/services for this vendor (only events category)
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          service_categories(name)
        `)
        .eq('vendor_id', vendorId)
        .eq('category_id', 'cat_activities')
        .order('created_at', { ascending: false })

      if (servicesError) throw servicesError

      // For each service, load ticket types separately
      const eventsWithStats = await Promise.all(
        (servicesData || []).map(async (service) => {
          // Get ticket types for this service
          const { data: ticketTypesData } = await supabase
            .from('ticket_types')
            .select('*')
            .eq('service_id', service.id)

          // Get ticket sales data
          const { data: ticketsData } = await supabase
            .from('tickets')
            .select('ticket_types(price), orders(currency)')
            .eq('service_id', service.id)
            .eq('status', 'used')

          const ticketSales = ticketsData?.length || 0
          const totalRevenue = ticketsData?.reduce((sum, ticket) => {
            return sum + (ticket.ticket_types?.[0]?.price || 0)
          }, 0) || 0

          return {
            ...service,
            ticket_types: ticketTypesData || [],
            ticket_sales: ticketSales,
            total_revenue: totalRevenue
          }
        })
      )

      setEvents(eventsWithStats)

      // Load activation requests for this vendor
      const { data: activationData, error: activationError } = await supabase
        .from('activation_requests')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })

      if (activationError) {
        console.error('Error loading activation requests:', activationError)
      } else {
        setActivationRequests(activationData || [])
      }
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleActivationRequest = async (eventId: string) => {
    try {
      await createActivationRequest(eventId, vendorId, user?.id)
      alert('Activation request submitted. An admin will review it.')
      // Refresh events to show updated status
      loadEvents()
    } catch (err) {
      console.error('Failed to create activation request:', err)
      alert('Failed to submit activation request. Please try again later.')
    }
  }

  const handleCopyLink = async (eventId: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedLinkId(eventId)
      setTimeout(() => setCopiedLinkId(null), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy link:', err)
      alert('Failed to copy link to clipboard.')
    }
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery.trim() ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || event.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
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
        <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
        <p className="text-sm text-gray-600">Manage your event listings and activation requests</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow border border-gray-200">
            {/* Event Image */}
            <div className="h-32 bg-gray-200 relative">
              {event.primary_image_url ? (
                <img
                  src={event.primary_image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="absolute top-1 right-1">
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusColor(event.status)}`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Event Details */}
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                {event.title}
              </h3>

              <div className="space-y-1 mb-2">
                <div className="flex items-center text-xs text-gray-600">
                  <MapPin className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" />
                  <span className="line-clamp-1">{event.event_location || event.location}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-gray-600">
                    <Users className="w-3 h-3 mr-1 text-gray-400" />
                    <span>{event.ticket_sales}</span>
                  </div>
                  <div className="flex items-center text-green-600 font-medium">
                    <DollarSign className="w-3 h-3 mr-0.5" />
                    <span>{formatCurrencyWithConversion(event.total_revenue, 'UGX', selectedCurrency)}</span>
                  </div>
                </div>
              </div>

              {/* Ticket Types Summary */}
              {event.ticket_types && event.ticket_types.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">
                    {event.ticket_types.length} ticket type{event.ticket_types.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-gray-600">
                    From {formatCurrencyWithConversion(Math.min(...event.ticket_types.map(t => t.price)), 'UGX', selectedCurrency)}
                  </div>
                </div>
              )}

              {/* Event Scan Link */}
              {event.scan_enabled && (
                <div className="mb-2 text-sm">
                  <div className="flex items-center gap-2">
                    <a href={`${window.location.origin}/scan/${event.id}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Event scan link</a>
                    <button
                      onClick={() => handleCopyLink(event.id, `${window.location.origin}/scan/${event.id}`)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy link"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {copiedLinkId === event.id && (
                      <span className="text-xs text-green-600">Copied!</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-1">
                {!event.scan_enabled && (
                  <button
                    onClick={() => handleActivationRequest(event.id)}
                    className="w-full bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Request activation
                  </button>
                )}

                {event.scan_enabled && event.status === 'pending' && (() => {
                  const activationRequest = activationRequests.find(req => req.service_id === event.id)
                  return activationRequest ? (
                    <a
                      href={activationRequest.activation_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-yellow-100 text-yellow-800 px-2 py-1.5 rounded text-xs font-medium hover:bg-yellow-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Link
                    </a>
                  ) : (
                    <div className="w-full bg-yellow-100 text-yellow-800 px-2 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pending
                    </div>
                  )
                })()}

                {event.scan_enabled && event.status === 'active' && (
                  <div className="w-full bg-green-100 text-green-800 px-2 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </div>
                )}

                {event.status === 'draft' && (
                  <div className="w-full bg-gray-100 text-gray-800 px-2 py-1.5 rounded text-xs font-medium flex items-center justify-center">
                    Draft
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first event to get started'
            }
          </p>
        </div>
      )}
    </div>
  )
}