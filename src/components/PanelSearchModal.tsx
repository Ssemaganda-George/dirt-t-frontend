import { useState, useEffect, useRef } from 'react'
import { Search, X, MapPin, Users, MessageSquare, CreditCard, Ticket, FileText, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

interface PanelSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  type: 'service' | 'booking' | 'user' | 'transaction' | 'message' | 'ticket' | 'inquiry'
  id: string
  title: string
  subtitle: string
  url: string
  icon: any
}

export default function PanelSearchModal({ isOpen, onClose }: PanelSearchModalProps) {
  const { profile, vendor } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const isAdmin = profile?.role === 'admin'
  const isVendor = profile?.role === 'vendor'

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Close modal on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Search functionality
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    performSearch()
  }, [query])

  const performSearch = async () => {
    const searchTerm = query.toLowerCase().trim()
    const searchResults: SearchResult[] = []

    try {
      if (isAdmin) {
        // Admin search across all platform data
        await Promise.all([
          searchServices(searchTerm, searchResults),
          searchBookings(searchTerm, searchResults),
          searchUsers(searchTerm, searchResults),
          searchTransactions(searchTerm, searchResults),
          searchMessages(searchTerm, searchResults),
          searchTickets(searchTerm, searchResults),
          searchInquiries(searchTerm, searchResults)
        ])
      } else if (isVendor) {
        // Vendor search within their own data
        await Promise.all([
          searchVendorServices(searchTerm, searchResults),
          searchVendorBookings(searchTerm, searchResults),
          searchVendorTickets(searchTerm, searchResults),
          searchVendorInquiries(searchTerm, searchResults),
          searchVendorMessages(searchTerm, searchResults),
          searchVendorTransactions(searchTerm, searchResults)
        ])
      }
    } catch (error) {
      console.error('Search error:', error)
    }

    setResults(searchResults.slice(0, 20)) // Limit to 20 results
    setIsLoading(false)
  }

  const searchServices = async (searchTerm: string, results: SearchResult[]) => {
    const { data: services } = await supabase
      .from('services')
      .select('id, title, category_id, vendor_id, vendors(business_name)')
      .or(`id.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(10)

    services?.forEach((service: any) => {
      results.push({
        type: 'service',
        id: service.id,
        title: service.title,
        subtitle: `Service • ${(service.vendors as any)?.business_name || 'Unknown Vendor'}`,
        url: isAdmin ? `/admin/services` : `/vendor/services`,
        icon: MapPin
      })
    })
  }

  const searchVendorServices = async (searchTerm: string, results: SearchResult[]) => {
    const { data: services } = await supabase
      .from('services')
      .select('id, title, category_id')
      .eq('vendor_id', vendor?.id)
      .or(`id.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(10)

    services?.forEach(service => {
      results.push({
        type: 'service',
        id: service.id,
        title: service.title,
        subtitle: 'Your Service',
        url: '/vendor/services',
        icon: MapPin
      })
    })
  }

  const searchBookings = async (searchTerm: string, results: SearchResult[]) => {
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id, service_id, services(title), tourist_profile(full_name), guest_name,
        vendors(business_name), status
      `)
      .or(`services.title.ilike.%${searchTerm}%,tourist_profile.full_name.ilike.%${searchTerm}%,guest_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`)
      .limit(10)

    bookings?.forEach((booking: any) => {
      const customerName = (booking.tourist_profile as any)?.full_name || booking.guest_name || 'Unknown Customer'
      results.push({
        type: 'booking',
        id: booking.id,
        title: `Booking ${booking.id.slice(-8)}`,
        subtitle: `${(booking.services as any)?.title || 'Unknown Service'} • ${customerName}`,
        url: '/admin/bookings',
        icon: Calendar
      })
    })
  }

  const searchVendorBookings = async (searchTerm: string, results: SearchResult[]) => {
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id, service_id, services(title), tourist_profile(full_name), guest_name, status
      `)
      .eq('vendor_id', vendor?.id)
      .or(`services.title.ilike.%${searchTerm}%,tourist_profile.full_name.ilike.%${searchTerm}%,guest_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`)
      .limit(10)

    bookings?.forEach((booking: any) => {
      const customerName = (booking.tourist_profile as any)?.full_name || booking.guest_name || 'Unknown Customer'
      results.push({
        type: 'booking',
        id: booking.id,
        title: `Booking ${booking.id.slice(-8)}`,
        subtitle: `${(booking.services as any)?.title || 'Unknown Service'} • ${customerName}`,
        url: '/vendor/bookings',
        icon: Calendar
      })
    })
  }

  const searchUsers = async (searchTerm: string, results: SearchResult[]) => {
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, user_type')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10)

    users?.forEach(user => {
      results.push({
        type: 'user',
        id: user.id,
        title: user.full_name || 'Unknown User',
        subtitle: `User • ${user.user_type}`,
        url: '/admin/users',
        icon: Users
      })
    })
  }

  const searchTransactions = async (searchTerm: string, results: SearchResult[]) => {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, amount, currency, type, created_at')
      .or(`id.ilike.%${searchTerm}%,reference.ilike.%${searchTerm}%`)
      .limit(10)

    transactions?.forEach(transaction => {
      results.push({
        type: 'transaction',
        id: transaction.id,
        title: `Transaction ${transaction.id.slice(-8)}`,
        subtitle: `${transaction.type} • ${transaction.amount} ${transaction.currency}`,
        url: '/admin/finance',
        icon: CreditCard
      })
    })
  }

  const searchVendorTransactions = async (searchTerm: string, results: SearchResult[]) => {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, amount, currency, type, created_at')
      .eq('user_id', profile?.id)
      .or(`id.ilike.%${searchTerm}%,reference.ilike.%${searchTerm}%`)
      .limit(10)

    transactions?.forEach(transaction => {
      results.push({
        type: 'transaction',
        id: transaction.id,
        title: `Transaction ${transaction.id.slice(-8)}`,
        subtitle: `${transaction.type} • ${transaction.amount} ${transaction.currency}`,
        url: '/vendor/transactions',
        icon: CreditCard
      })
    })
  }

  const searchMessages = async (searchTerm: string, results: SearchResult[]) => {
    const { data: messages } = await supabase
      .from('messages')
      .select('id, subject, sender_name, created_at')
      .or(`id.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%`)
      .limit(10)

    messages?.forEach(message => {
      results.push({
        type: 'message',
        id: message.id,
        title: message.subject || 'No Subject',
        subtitle: `From: ${message.sender_name}`,
        url: '/admin/messages',
        icon: MessageSquare
      })
    })
  }

  const searchVendorMessages = async (searchTerm: string, results: SearchResult[]) => {
    const { data: messages } = await supabase
      .from('messages')
      .select('id, subject, sender_name, created_at')
      .eq('recipient_id', profile?.id)
      .or(`id.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,sender_name.ilike.%${searchTerm}%`)
      .limit(10)

    messages?.forEach(message => {
      results.push({
        type: 'message',
        id: message.id,
        title: message.subject || 'No Subject',
        subtitle: `From: ${message.sender_name}`,
        url: '/vendor/messages',
        icon: MessageSquare
      })
    })
  }

  const searchVendorTickets = async (searchTerm: string, results: SearchResult[]) => {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, code, ticket_types(title), services(title)')
      .eq('vendor_id', vendor?.id)
      .or(`id.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,ticket_types.title.ilike.%${searchTerm}%`)
      .limit(10)

    tickets?.forEach((ticket: any) => {
      results.push({
        type: 'ticket',
        id: ticket.id,
        title: `Ticket ${ticket.code}`,
        subtitle: (ticket.ticket_types as any)?.title || 'Event Ticket',
        url: '/vendor/bookings',
        icon: Ticket
      })
    })
  }

  const searchTickets = async (searchTerm: string, results: SearchResult[]) => {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, code, ticket_types(title), services(title), vendors(business_name)')
      .or(`id.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,ticket_types.title.ilike.%${searchTerm}%`)
      .limit(10)

    tickets?.forEach((ticket: any) => {
      results.push({
        type: 'ticket',
        id: ticket.id,
        title: `Ticket ${ticket.code}`,
        subtitle: `${(ticket.ticket_types as any)?.title || 'Event Ticket'} • ${(ticket.vendors as any)?.business_name || 'Unknown Vendor'}`,
        url: '/admin/tickets',
        icon: Ticket
      })
    })
  }

  const searchInquiries = async (searchTerm: string, results: SearchResult[]) => {
    const { data: inquiries } = await supabase
      .from('inquiries')
      .select('id, subject, customer_name, created_at, vendors(business_name)')
      .or(`id.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`)
      .limit(10)

    inquiries?.forEach((inquiry: any) => {
      results.push({
        type: 'inquiry',
        id: inquiry.id,
        title: inquiry.subject || 'Service Inquiry',
        subtitle: `From: ${inquiry.customer_name} • ${(inquiry.vendors as any)?.business_name || 'Unknown Vendor'}`,
        url: '/admin/inquiries',
        icon: FileText
      })
    })
  }

  const searchVendorInquiries = async (searchTerm: string, results: SearchResult[]) => {
    const { data: inquiries } = await supabase
      .from('inquiries')
      .select('id, subject, customer_name, created_at')
      .eq('vendor_id', vendor?.id)
      .or(`id.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`)
      .limit(10)

    inquiries?.forEach(inquiry => {
      results.push({
        type: 'inquiry',
        id: inquiry.id,
        title: inquiry.subject || 'Service Inquiry',
        subtitle: `From: ${inquiry.customer_name}`,
        url: '/vendor/inquiries',
        icon: FileText
      })
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
      >
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              ref={inputRef}
              type="text"
              placeholder={isAdmin ? "Search by ID, name, title, or content..." : "Search your bookings, tickets, transactions, inquiries..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 text-lg border-0 focus:ring-0 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={result.url}
                  onClick={onClose}
                  className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <result.icon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-gray-500">
              No results found for "{query}"
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Start typing to search...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}