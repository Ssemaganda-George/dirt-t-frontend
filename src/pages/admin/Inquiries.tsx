import { useEffect, useState } from 'react'
import { Mail, Send, X, Search, Filter, RefreshCw, Inbox, CheckCircle, MessageSquare, Archive, Phone, Calendar, Users, Briefcase, Globe } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getUnifiedInquiries, updateUnifiedInquiryStatus, getUnifiedInquiryCounts, type UnifiedInquiry, type InquiryType, type InquiryStatus } from '../../lib/database'
import { formatDateTime } from '../../lib/utils'

export default function AdminInquiries() {
  const { profile } = useAuth()
  const [inquiries, setInquiries] = useState<UnifiedInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<InquiryType | 'all'>('all')
  const [filter, setFilter] = useState<'all' | InquiryStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInquiry, setSelectedInquiry] = useState<UnifiedInquiry | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [responding, setResponding] = useState(false)
  const [counts, setCounts] = useState({
    total: 0,
    unread: 0,
    byType: {
      contact: { total: 0, unread: 0 },
      service: { total: 0, unread: 0 },
      safari: { total: 0, unread: 0 },
      partnership: { total: 0, unread: 0 }
    }
  })

  useEffect(() => {
    fetchInquiries()
    fetchCounts()
  }, [activeTab])

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      const filters: { inquiry_type?: InquiryType } = {}
      if (activeTab !== 'all') {
        filters.inquiry_type = activeTab
      }
      const data = await getUnifiedInquiries(filters)
      setInquiries(data)
    } catch (error) {
      console.error('Error fetching inquiries:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCounts = async () => {
    try {
      const data = await getUnifiedInquiryCounts()
      setCounts(data)
    } catch (error) {
      console.error('Error fetching counts:', error)
    }
  }

  const filteredInquiries = inquiries.filter(inquiry => {
    // Status filter
    if (filter !== 'all' && inquiry.status !== filter) return false
    
    // Category filter (only for contact inquiries)
    if (categoryFilter !== 'all' && inquiry.category !== categoryFilter) return false
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        inquiry.name.toLowerCase().includes(query) ||
        inquiry.email.toLowerCase().includes(query) ||
        (inquiry.subject?.toLowerCase().includes(query) ?? false) ||
        (inquiry.message?.toLowerCase().includes(query) ?? false) ||
        (inquiry.services?.title?.toLowerCase().includes(query) ?? false) ||
        (inquiry.vendors?.business_name?.toLowerCase().includes(query) ?? false)
      )
    }
    
    return true
  })

  const handleStatusChange = async (inquiryId: string, newStatus: InquiryStatus, inquiryType?: InquiryType) => {
    try {
      await updateUnifiedInquiryStatus(inquiryId, newStatus, undefined, undefined, inquiryType)
      await fetchInquiries()
      await fetchCounts()
      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry(prev => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (error) {
      console.error('Error updating inquiry status:', error)
    }
  }

  const handleRespond = async () => {
    if (!selectedInquiry || !responseMessage.trim()) return

    setResponding(true)
    try {
      await updateUnifiedInquiryStatus(
        selectedInquiry.id, 
        'responded', 
        responseMessage,
        profile?.id,
        selectedInquiry.inquiry_type
      )
      
      // Open email client to send the response
      const subject = encodeURIComponent(`Re: ${selectedInquiry.subject || getInquiryTypeLabel(selectedInquiry.inquiry_type) + ' - ' + selectedInquiry.name}`)
      const body = encodeURIComponent(responseMessage)
      window.location.href = `mailto:${selectedInquiry.email}?subject=${subject}&body=${body}`
      
      setResponseMessage('')
      setSelectedInquiry(null)
      await fetchInquiries()
      await fetchCounts()
    } catch (error) {
      console.error('Error responding to inquiry:', error)
    } finally {
      setResponding(false)
    }
  }

  const getInquiryTypeLabel = (type: InquiryType) => {
    const labels: Record<InquiryType, string> = {
      contact: 'Contact',
      service: 'Service',
      safari: 'Safari',
      partnership: 'Partnership'
    }
    return labels[type] || type
  }

  const getInquiryTypeColor = (type: InquiryType) => {
    switch (type) {
      case 'contact': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'service': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'safari': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'partnership': return 'bg-orange-50 text-orange-700 border-orange-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-red-50 text-red-700 border-red-200'
      case 'read': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'responded': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'archived': return 'bg-gray-100 text-gray-600 border-gray-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      general: 'General Inquiry',
      booking: 'Booking Support',
      technical: 'Technical Support',
      partnership: 'Partnership',
      complaint: 'Complaint',
      other: 'Other'
    }
    return labels[category] || category
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'booking': return 'bg-purple-50 text-purple-700'
      case 'technical': return 'bg-orange-50 text-orange-700'
      case 'partnership': return 'bg-teal-50 text-teal-700'
      case 'complaint': return 'bg-red-50 text-red-700'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  const statusCounts = {
    all: inquiries.length,
    unread: inquiries.filter(i => i.status === 'unread').length,
    read: inquiries.filter(i => i.status === 'read').length,
    in_progress: inquiries.filter(i => i.status === 'in_progress').length,
    responded: inquiries.filter(i => i.status === 'responded').length,
    archived: inquiries.filter(i => i.status === 'archived').length
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all inquiries from contacts, services, safaris, and partnerships</p>
        </div>
        <button
          onClick={() => { fetchInquiries(); fetchCounts() }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {[
          { key: 'all', label: 'All Inquiries', count: counts.total },
          { key: 'contact', label: 'Contact', count: counts.byType.contact.total, icon: Mail },
          { key: 'service', label: 'Service', count: counts.byType.service.total, icon: Briefcase },
          { key: 'safari', label: 'Safari', count: counts.byType.safari.total, icon: Globe },
          { key: 'partnership', label: 'Partnership', count: counts.byType.partnership.total, icon: Users }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as InquiryType | 'all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { key: 'all', label: 'Total', icon: Inbox, color: 'text-gray-600 bg-gray-50' },
          { key: 'unread', label: 'Unread', icon: Mail, color: 'text-red-600 bg-red-50' },
          { key: 'read', label: 'Read', icon: CheckCircle, color: 'text-blue-600 bg-blue-50' },
          { key: 'in_progress', label: 'In Progress', icon: MessageSquare, color: 'text-yellow-600 bg-yellow-50' },
          { key: 'responded', label: 'Responded', icon: Send, color: 'text-emerald-600 bg-emerald-50' },
          { key: 'archived', label: 'Archived', icon: Archive, color: 'text-gray-500 bg-gray-100' }
        ].map(stat => (
          <button
            key={stat.key}
            onClick={() => setFilter(stat.key as any)}
            className={`p-4 rounded-xl border transition-all ${
              filter === stat.key 
                ? 'border-gray-900 ring-1 ring-gray-900' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900">{statusCounts[stat.key as keyof typeof statusCounts]}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inquiries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 appearance-none bg-white"
          >
            <option value="all">All Categories</option>
            <option value="general">General Inquiry</option>
            <option value="booking">Booking Support</option>
            <option value="technical">Technical Support</option>
            <option value="partnership">Partnership</option>
            <option value="complaint">Complaint</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Inquiries List */}
      {filteredInquiries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No inquiries found</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchQuery || categoryFilter !== 'all' || filter !== 'all' 
              ? 'Try adjusting your filters or search query' 
              : 'No contact inquiries have been received yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredInquiries.map((inquiry) => (
              <div 
                key={inquiry.id} 
                className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                  inquiry.status === 'unread' ? 'bg-blue-50/30' : ''
                }`}
                onClick={() => {
                  setSelectedInquiry(inquiry)
                  if (inquiry.status === 'unread') {
                    handleStatusChange(inquiry.id, 'read', inquiry.inquiry_type)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${inquiry.status === 'unread' ? 'text-gray-900' : 'text-gray-700'}`}>
                        {inquiry.name}
                      </p>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${getInquiryTypeColor(inquiry.inquiry_type)}`}>
                        {getInquiryTypeLabel(inquiry.inquiry_type)}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                      {inquiry.category && (
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(inquiry.category)}`}>
                          {getCategoryLabel(inquiry.category)}
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 text-sm ${inquiry.status === 'unread' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {inquiry.subject || (inquiry.services?.title ? `Inquiry about: ${inquiry.services.title}` : `${getInquiryTypeLabel(inquiry.inquiry_type)} Inquiry`)}
                    </p>
                    {inquiry.services && (
                      <p className="mt-1 text-sm text-purple-600 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {inquiry.services.title}
                        {inquiry.vendors && <span className="text-gray-400 ml-2">by {inquiry.vendors.business_name}</span>}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-500 line-clamp-1">
                      {inquiry.message || 'No message provided'}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span>{inquiry.email}</span>
                      {inquiry.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{inquiry.phone}</span>
                        </>
                      )}
                      {inquiry.preferred_date && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{inquiry.preferred_date}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDateTime(inquiry.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Inquiry Details</h3>
                <p className="text-sm text-gray-500">{formatDateTime(selectedInquiry.created_at)}</p>
              </div>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Inquiry Type Badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-3 py-1 rounded-md text-sm font-medium border ${getInquiryTypeColor(selectedInquiry.inquiry_type)}`}>
                  {getInquiryTypeLabel(selectedInquiry.inquiry_type)} Inquiry
                </span>
                {selectedInquiry.priority && selectedInquiry.priority !== 'normal' && (
                  <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                    selectedInquiry.priority === 'high' ? 'bg-red-100 text-red-700' : 
                    selectedInquiry.priority === 'urgent' ? 'bg-red-200 text-red-800' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedInquiry.priority.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Sender Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">From</p>
                  <p className="text-sm font-medium text-gray-900">{selectedInquiry.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {selectedInquiry.email}
                  </a>
                </div>
              </div>

              {selectedInquiry.phone && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                    <a href={`tel:${selectedInquiry.phone}`} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedInquiry.phone}
                    </a>
                  </div>
                  {selectedInquiry.contact_method && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Preferred Contact</p>
                      <p className="text-sm text-gray-700 capitalize">{selectedInquiry.contact_method}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Service Info (for service inquiries) */}
              {selectedInquiry.services && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-2">Service Inquiry</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Service</p>
                      <p className="text-sm font-medium text-gray-900">{selectedInquiry.services.title}</p>
                    </div>
                    {selectedInquiry.vendors && (
                      <div>
                        <p className="text-xs text-gray-500">Provider</p>
                        <p className="text-sm font-medium text-gray-900">{selectedInquiry.vendors.business_name}</p>
                        {selectedInquiry.vendors.business_email && (
                          <a href={`mailto:${selectedInquiry.vendors.business_email}`} className="text-xs text-blue-600 hover:underline">
                            {selectedInquiry.vendors.business_email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  {(selectedInquiry.preferred_date || selectedInquiry.number_of_guests || selectedInquiry.contact_method) && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      {selectedInquiry.preferred_date && (
                        <div>
                          <p className="text-xs text-gray-500">Preferred Date</p>
                          <p className="text-sm text-gray-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {selectedInquiry.preferred_date}
                          </p>
                        </div>
                      )}
                      {selectedInquiry.number_of_guests && (
                        <div>
                          <p className="text-xs text-gray-500">Number of Guests</p>
                          <p className="text-sm text-gray-700 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {selectedInquiry.number_of_guests}
                          </p>
                        </div>
                      )}
                      {selectedInquiry.contact_method && (
                        <div>
                          <p className="text-xs text-gray-500">Preferred Contact</p>
                          <p className="text-sm text-gray-700 capitalize">{selectedInquiry.contact_method}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Service-specific details */}
                  {selectedInquiry.service_specific_data && Object.keys(selectedInquiry.service_specific_data).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-100">
                      <p className="text-xs text-purple-600 mb-2">Additional Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedInquiry.service_specific_data.roomType && (
                          <div>
                            <p className="text-xs text-gray-500">Room Type</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.roomType}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.specialRequests && (
                          <div>
                            <p className="text-xs text-gray-500">Special Requests</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.specialRequests}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.dietaryRestrictions && (
                          <div>
                            <p className="text-xs text-gray-500">Dietary Restrictions</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.dietaryRestrictions}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.accommodationPreference && (
                          <div>
                            <p className="text-xs text-gray-500">Accommodation Preference</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.accommodationPreference}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.pickupLocation && (
                          <div>
                            <p className="text-xs text-gray-500">Pickup Location</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.pickupLocation}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.dropoffLocation && (
                          <div>
                            <p className="text-xs text-gray-500">Drop-off Location</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.dropoffLocation}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.seatPreference && (
                          <div>
                            <p className="text-xs text-gray-500">Seat Preference</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.seatPreference}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.mealPreference && (
                          <div>
                            <p className="text-xs text-gray-500">Meal Preference</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.mealPreference}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.specialOccasion && (
                          <div>
                            <p className="text-xs text-gray-500">Special Occasion</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.specialOccasion}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.experienceLevel && (
                          <div>
                            <p className="text-xs text-gray-500">Experience Level</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.experienceLevel}</p>
                          </div>
                        )}
                        {selectedInquiry.service_specific_data.specialRequirements && (
                          <div>
                            <p className="text-xs text-gray-500">Special Requirements</p>
                            <p className="text-gray-700">{selectedInquiry.service_specific_data.specialRequirements}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Partnership Info (for partnership inquiries) */}
              {selectedInquiry.inquiry_type === 'partnership' && (selectedInquiry.company_name || selectedInquiry.website) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-2">Partnership Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedInquiry.company_name && (
                      <div>
                        <p className="text-xs text-gray-500">Company Name</p>
                        <p className="text-gray-700 font-medium">{selectedInquiry.company_name}</p>
                      </div>
                    )}
                    {selectedInquiry.website && (
                      <div>
                        <p className="text-xs text-gray-500">Website</p>
                        <a href={selectedInquiry.website.startsWith('http') ? selectedInquiry.website : `https://${selectedInquiry.website}`} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-blue-600 hover:underline">
                          {selectedInquiry.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Safari Info (for safari inquiries) */}
              {selectedInquiry.inquiry_type === 'safari' && selectedInquiry.safari_data && (
                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-xs text-emerald-600 uppercase tracking-wider mb-2">Safari Request Details</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedInquiry.safari_data.countries && (
                      <div>
                        <p className="text-xs text-gray-500">Countries</p>
                        <p className="text-gray-700">{selectedInquiry.safari_data.countries.join(', ')}</p>
                      </div>
                    )}
                    {selectedInquiry.safari_data.activities && (
                      <div>
                        <p className="text-xs text-gray-500">Activities</p>
                        <p className="text-gray-700 text-xs">{selectedInquiry.safari_data.activities.join(', ')}</p>
                      </div>
                    )}
                    {selectedInquiry.safari_data.travelWith && (
                      <div>
                        <p className="text-xs text-gray-500">Traveling With</p>
                        <p className="text-gray-700">{selectedInquiry.safari_data.travelWith}</p>
                      </div>
                    )}
                    {selectedInquiry.safari_data.days && (
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-gray-700">{selectedInquiry.safari_data.days} days</p>
                      </div>
                    )}
                    {selectedInquiry.safari_data.budget && (
                      <div>
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="text-gray-700">${selectedInquiry.safari_data.budget} per person</p>
                      </div>
                    )}
                    {selectedInquiry.safari_data.startDate && (
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="text-gray-700">{selectedInquiry.safari_data.startDate}</p>
                      </div>
                    )}
                    {(selectedInquiry.safari_data.adults || selectedInquiry.safari_data.children) && (
                      <div>
                        <p className="text-xs text-gray-500">Travelers</p>
                        <p className="text-gray-700">
                          {selectedInquiry.safari_data.adults || 0} adults, {selectedInquiry.safari_data.children || 0} children
                        </p>
                      </div>
                    )}
                    {selectedInquiry.safari_data.rooms && (
                      <div>
                        <p className="text-xs text-gray-500">Rooms</p>
                        <p className="text-gray-700">{selectedInquiry.safari_data.rooms}</p>
                      </div>
                    )}
                    {selectedInquiry.safari_data.country && (
                      <div>
                        <p className="text-xs text-gray-500">Sender's Country</p>
                        <p className="text-gray-700">{selectedInquiry.safari_data.country}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Category and Status */}
              <div className="grid grid-cols-2 gap-4">
                {selectedInquiry.category && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Category</p>
                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(selectedInquiry.category)}`}>
                      {getCategoryLabel(selectedInquiry.category)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                  <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(selectedInquiry.status)}`}>
                    {selectedInquiry.status}
                  </span>
                </div>
              </div>

              {/* Subject */}
              {selectedInquiry.subject && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Subject</p>
                  <p className="text-sm font-medium text-gray-900">{selectedInquiry.subject}</p>
                </div>
              )}

              {/* Message */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Message</p>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Previous Response */}
              {selectedInquiry.response_message && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Response Details</p>
                  <div className="bg-emerald-50 rounded-lg p-4 space-y-3">
                    <div className="text-sm text-emerald-800 whitespace-pre-wrap">
                      {selectedInquiry.response_message}
                    </div>
                    <div className="pt-2 border-t border-emerald-100 space-y-1">
                      {selectedInquiry.responder_name && (
                        <p className="text-xs text-emerald-700">
                          <span className="font-medium">Responded by:</span> {selectedInquiry.responder_name}
                        </p>
                      )}
                      {selectedInquiry.responded_at && (
                        <p className="text-xs text-emerald-600">
                          <span className="font-medium">Date:</span> {formatDateTime(selectedInquiry.responded_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Response Input */}
              {selectedInquiry.status !== 'archived' && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Response</p>
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Type your response here..."
                    rows={4}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 resize-none text-sm"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {selectedInquiry.status !== 'archived' && (
                  <button
                    onClick={() => handleStatusChange(selectedInquiry.id, 'archived', selectedInquiry.inquiry_type)}
                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Archive
                  </button>
                )}
                {selectedInquiry.status === 'archived' && (
                  <button
                    onClick={() => handleStatusChange(selectedInquiry.id, 'read', selectedInquiry.inquiry_type)}
                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Unarchive
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Close
                </button>
                {selectedInquiry.status !== 'archived' && (
                  <button
                    onClick={handleRespond}
                    disabled={!responseMessage.trim() || responding}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {responding ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Response
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
