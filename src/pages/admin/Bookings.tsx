import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import * as QRCode from 'qrcode'
import { useBookings, useServiceCategories } from '../../hooks/hook';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { formatCurrencyWithConversion, formatDateTime } from '../../lib/utils';
import { usePreferences } from '../../contexts/PreferencesContext'
import { useCart } from '../../contexts/CartContext';
import type { Booking } from '../../types';
import { supabase } from '../../lib/supabaseClient'
import { getServiceCategories } from '../../lib/database'
import SearchBar from '../../components/SearchBar';

function BookingActionsMenu({ booking, view, onStatusChange, onPaymentChange, onArchive, onDelete, onRestore }: {
  booking: Booking
  view: 'active' | 'archived' | 'deleted'
  onStatusChange: (id: string, status: Booking['status']) => void
  onPaymentChange: (id: string, status: Booking['payment_status']) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onRestore: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
        aria-label="Actions"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1.5">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
            Booking Status
          </div>
          <select
            value={booking.status}
            onChange={(e) => { onStatusChange(booking.id, e.target.value as Booking['status']); setOpen(false) }}
            className="w-full mx-3 my-1.5 border rounded-md px-2 py-1.5 text-sm bg-white"
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase border-t border-slate-100 mt-1">
            Payment Status
          </div>
          <select
            value={booking.payment_status}
            onChange={(e) => { onPaymentChange(booking.id, e.target.value as Booking['payment_status']); setOpen(false) }}
            className="w-full mx-3 my-1.5 border rounded-md px-2 py-1.5 text-sm bg-white"
          >
            <option value="pending">Payment Pending</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
          <div className="border-t border-slate-100 mt-1 pt-1">
            {view === 'active' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!confirm('Archive this booking?')) return; onArchive(booking.id); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  Archive
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!confirm('Move this booking to Deleted? It will be auto-purged after 30 days.')) return; onDelete(booking.id); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
            {view === 'archived' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!confirm('Restore this booking to Active?')) return; onRestore(booking.id); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  Restore
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!confirm('Move this booking to Deleted? It will be auto-purged after 30 days.')) return; onDelete(booking.id); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
            {view === 'deleted' && (
              <button
                onClick={(e) => { e.stopPropagation(); if (!confirm('Restore this booking to Active?')) return; onRestore(booking.id); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors"
              >
                Restore
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function Bookings() {
  const { bookings, archivedBookings, deletedBookings, view, setView, loading, error, updateBookingStatus, updatePaymentStatus, archiveBooking, deleteBooking, restoreBooking } = useBookings();
  const { state: cartState } = useCart();
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [vendors, setVendors] = useState<any[]>([])
  const [allVendors, setAllVendors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filteredBookings, setFilteredBookings] = useState<Booking[] | null>(null)
  const [isFiltering, setIsFiltering] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [selectedBookingTickets, setSelectedBookingTickets] = useState<any[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [categoryTickets, setCategoryTickets] = useState<any[]>([])
  const [categoryTicketsLoading, setCategoryTicketsLoading] = useState(false)
  const [showTicketImage, setShowTicketImage] = useState(false)
  const [ticketImageUrl, setTicketImageUrl] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null)
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all')
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('all')
  const [selectedAttendanceFilter, setSelectedAttendanceFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')

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
    // Load vendors and categories for filters
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
          setAllVendors(v)
        }
      } catch (err) {
        console.error('Error loading vendors/categories for admin filters:', err)
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
        setTicketsLoading(true)
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
      } finally {
        if (mounted) setTicketsLoading(false)
      }
    }

    loadTicketsForBooking(selectedBooking)

    return () => { mounted = false }
  }, [selectedBooking])

  const displayCategoryName = (c: any) => {
    // Non-destructive mapping: display "Events" for internal category id 'cat_activities'
    if (!c) return ''
    if (c.id === 'cat_activities') return 'Events'
    return c.name || ''
  }

  // When a category is selected, narrow the vendors list to vendors who have services in that category and have bookings
  useEffect(() => {
    if (!selectedCategory || selectedCategory === 'all') {
      // restore full vendor list and keep vendor selection
      setVendors(allVendors)
      return
    }

    let mounted = true
    ;(async () => {
      try {
        // Get services in this category
        const { data: servicesData, error: servicesErr } = await supabase
          .from('services')
          .select('id, vendor_id')
          .eq('category_id', selectedCategory)

        if (servicesErr) {
          console.error('Error fetching services for category:', servicesErr)
          if (mounted) setVendors([])
          return
        }

        const serviceIds = (servicesData || []).map((s: any) => s.id)
        if (serviceIds.length === 0) {
          if (mounted) setVendors([])
          return
        }

        // Find bookings that reference those services, extract unique vendor_ids
        const { data: bookingsForServices, error: bookingsErr } = await supabase
          .from('bookings')
          .select('vendor_id')
          .in('service_id', serviceIds)

        if (bookingsErr) {
          console.error('Error fetching bookings for services in category:', bookingsErr)
          if (mounted) setVendors([])
          return
        }

        const vendorIds = Array.from(new Set((bookingsForServices || []).map((b: any) => b.vendor_id)))
        if (vendorIds.length === 0) {
          if (mounted) setVendors([])
          return
        }

        // Fetch vendor details for those vendorIds
        // Only include approved vendors for the narrowed list
        const { data: vendorDetails, error: vendorErr } = await supabase
          .from('vendors')
          .select('id, user_id, business_name, business_email, status')
          .in('id', vendorIds)
          .eq('status', 'approved')

        if (vendorErr) {
          console.error('Error fetching vendor details for category-filtered vendors:', vendorErr)
          if (mounted) setVendors([])
          return
        }

        if (mounted) {
          setVendors(vendorDetails || [])
          // If currently selectedVendor is not in the new list, reset it to 'all'
          if (selectedVendor !== 'all' && !vendorDetails?.some((v: any) => v.id === selectedVendor)) {
            setSelectedVendor('all')
          }
        }
      } catch (err) {
        console.error('Exception narrowing vendors by category:', err)
        if (mounted) setVendors([])
      }
    })()

    return () => { mounted = false }
  }, [selectedCategory])

  // Apply search filter whenever searchQuery changes
  useEffect(() => {
    if (!bookings.length) return

    if (!searchQuery.trim()) {
      // If no search query and no other filters, show all bookings
      if (selectedVendor === 'all' && selectedCategory === 'all') {
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

  const stats = {
    total: bookings.filter(b => !b.archived_at && !b.deleted_at).length,
    pending: bookings.filter(b => b.status === 'pending' && !b.archived_at && !b.deleted_at).length,
    confirmed: bookings.filter(b => b.status === 'confirmed' && !b.archived_at && !b.deleted_at).length,
    completed: bookings.filter(b => b.status === 'completed' && !b.archived_at && !b.deleted_at).length,
    cancelled: bookings.filter(b => b.status === 'cancelled' && !b.archived_at && !b.deleted_at).length,
    rejected: bookings.filter(b => b.status === 'cancelled' && !b.archived_at && !b.deleted_at).length,
    archived: archivedBookings.length,
    deleted: deletedBookings.length,
  };

  const handleStatusCardClick = (status: string) => {
    setView('active')
    const filterStatus = status === 'rejected' ? 'cancelled' : status
    setSelectedStatusFilter(filterStatus)
    if (filterStatus === 'all') {
      setFilteredBookings(bookings.filter(b => !b.archived_at && !b.deleted_at))
    } else {
      const filtered = bookings.filter(b => b.status === filterStatus && !b.archived_at && !b.deleted_at)
      setFilteredBookings(filtered)
    }
  }

  // Apply a category filter: fetch bookings for all services in a category
  const handleSelectCategoryCard = async (categoryId: string) => {
    try {
      setSelectedCategory(categoryId)
      // Reset vendor filter to avoid conflicting results when selecting a category
      setSelectedVendor('all')

      if (categoryId === 'all') {
        const searchFiltered = filterBookingsBySearch(bookings)
        setFilteredBookings(searchFiltered.length === bookings.length ? null : searchFiltered)
        return
      }

      setIsFiltering(true)

      // Get services in this category
      const { data: servicesData, error: servicesErr } = await supabase
        .from('services')
        .select('id')
        .eq('category_id', categoryId)

      if (servicesErr) {
        console.error('Error fetching services for category filter:', servicesErr)
        setFilteredBookings([])
        return
      }

      const serviceIds = (servicesData || []).map((s: any) => s.id)
      if (serviceIds.length === 0) {
        setFilteredBookings([])
        return
      }

      const { data: bookingsData, error: bookingsErr } = await supabase
        .from('bookings')
        .select(`*, services (*), profiles ( full_name )`)
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false })

      if (bookingsErr) {
        console.error('Error fetching bookings for selected category:', bookingsErr)
        setFilteredBookings([])
        return
      }

      setFilteredBookings(filterBookingsBySearch(bookingsData || []))

      // Additionally, load tickets for services in this category only for Events (cat_activities)
      if (categoryId === 'cat_activities') {
        try {
          setCategoryTicketsLoading(true)
          const { data: ticketsData, error: ticketsErr } = await supabase
            .from('tickets')
            .select(`
              *,
              ticket_types(title, price),
              services(title, event_location, location, vendors(business_name)),
              orders(currency, created_at, status)
            `)
            .in('service_id', serviceIds)
            .order('issued_at', { ascending: false })

          if (ticketsErr) {
            console.error('Error fetching tickets for selected category:', ticketsErr)
            setCategoryTickets([])
          } else {
            setCategoryTickets(ticketsData || [])
          }
        } catch (err) {
          console.error('Exception fetching tickets for category:', err)
          setCategoryTickets([])
        } finally {
          setCategoryTicketsLoading(false)
        }
      } else {
        // Clear any previously loaded tickets when switching to a non-events category
        setCategoryTickets([])
      }
    } catch (err) {
      console.error('Exception applying category filter:', err)
      setFilteredBookings([])
    } finally {
      setIsFiltering(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Booking Management</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor and manage all platform bookings</p>
        </div>
        <div className="flex items-center text-sm text-emerald-600">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
          Real-time updates
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        placeholder="Search bookings by service, customer, vendor, status, or booking ID..."
        onSearch={setSearchQuery}
        initialValue={searchQuery}
      />

      {/* Category cards - click to filter bookings for services in that category */}
      <div className="pt-2">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Filter by Category</h2>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          <button
            onClick={() => handleSelectCategoryCard('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-medium transition ${selectedCategory === 'all' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            All categories
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectCategoryCard(c.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg border text-left transition ${selectedCategory === c.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="text-sm font-medium truncate" style={{maxWidth: 220}}>{displayCategoryName(c)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters: Vendor & Category */}
      <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Filter by Vendor</label>
          <select
            value={selectedVendor}
            onChange={async (e) => setSelectedVendor(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All vendors</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.business_name || v.profiles?.full_name || 'Unknown Vendor'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Filter by Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{displayCategoryName(c)}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            disabled={isFiltering}
            onClick={async () => {
              // If no filters, apply search to all bookings
              if (selectedVendor === 'all' && selectedCategory === 'all') {
                const filtered = filterBookingsBySearch(bookings)
                setFilteredBookings(filtered.length === bookings.length ? null : filtered)
                return
              }

              setIsFiltering(true)
              try {
                // If only vendor filter is set, filter client-side using bookings.vendor_id
                if (selectedCategory === 'all' && selectedVendor !== 'all') {
                  const vendorFiltered = bookings.filter(b => b.vendor_id === selectedVendor)
                  const searchFiltered = filterBookingsBySearch(vendorFiltered)
                  setFilteredBookings(searchFiltered)
                  return
                }

                // If category filter is set, fetch service ids for that category, then query bookings by service_id
                if (selectedCategory !== 'all') {
                  // Get services that belong to the category (optionally narrow by vendor)
                  const { data: servicesData, error: servicesErr } = await supabase
                    .from('services')
                    .select('id, vendor_id')
                    .eq('category_id', selectedCategory)

                  if (servicesErr) {
                    console.error('Error fetching services for category filter:', servicesErr)
                    setFilteredBookings([])
                    return
                  }

                  const serviceIds = (servicesData || []).map((s: any) => s.id)
                  if (serviceIds.length === 0) {
                    setFilteredBookings([])
                    return
                  }

                  // Build bookings query by service_id
                  let bookingsQuery = supabase
                    .from('bookings')
                    .select(`*, services (*), profiles ( full_name )`)
                    .in('service_id', serviceIds)
                    .order('created_at', { ascending: false })

                  // If vendor filter is also set, additionally filter by vendor_id
                  if (selectedVendor !== 'all') {
                    bookingsQuery = bookingsQuery.eq('vendor_id', selectedVendor)
                  }

                  const { data: bookingsData, error: bookingsErr } = await bookingsQuery
                  if (bookingsErr) {
                    console.error('Error fetching bookings for selected services:', bookingsErr)
                    setFilteredBookings([])
                    return
                  }

                  const searchFiltered = filterBookingsBySearch(bookingsData || [])
                  setFilteredBookings(searchFiltered)
                  return
                }

              } catch (err) {
                console.error('Exception fetching filtered bookings:', err)
                setFilteredBookings([])
              } finally {
                setIsFiltering(false)
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
          >
            {isFiltering ? 'Applying...' : 'Apply'}
          </button>

          <button
            onClick={() => {
              setSelectedVendor('all')
              setSelectedCategory('all')
              setFilteredBookings(null)
            }}
            className="ml-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <button
          onClick={async () => {
            if (bookings.length > 0) {
              const testBooking = bookings.find(b => b.status === 'confirmed' && b.payment_status === 'pending');
              if (testBooking) {
                console.log('Testing payment status update for booking:', testBooking.id);
                try {
                  await updatePaymentStatus(testBooking.id, 'paid');
                  alert('Test payment status update completed! Check console for logs.');
                } catch (err) {
                  console.error('Test failed:', err);
                  alert('Test failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
                }
              } else {
                alert('No confirmed bookings with pending payment found for testing');
              }
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Test Payment Update
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => handleStatusCardClick('all')}
          className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer ${selectedStatusFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-blue-200'}`}
        >
          <p className="text-xs font-medium text-slate-500">Total Bookings</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.total}</p>
          <p className="text-xs text-slate-400 mt-1">All time</p>
        </div>
        <div 
          onClick={() => handleStatusCardClick('pending')}
          className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer ${selectedStatusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-amber-200'}`}
        >
          <p className="text-xs font-medium text-slate-500">Pending</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.pending}</p>
          <p className="text-xs text-slate-400 mt-1">Awaiting</p>
        </div>
        <div 
          onClick={() => handleStatusCardClick('confirmed')}
          className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer ${selectedStatusFilter === 'confirmed' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-blue-200'}`}
        >
          <p className="text-xs font-medium text-slate-500">Confirmed</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.confirmed}</p>
          <p className="text-xs text-slate-400 mt-1">Active</p>
        </div>
        <div 
          onClick={() => handleStatusCardClick('completed')}
          className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer ${selectedStatusFilter === 'completed' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-emerald-200'}`}
        >
          <p className="text-xs font-medium text-slate-500">Completed</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.completed}</p>
          <p className="text-xs text-slate-400 mt-1">Done</p>
        </div>
        <div 
          onClick={() => handleStatusCardClick('cancelled')}
          className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer ${selectedStatusFilter === 'cancelled' ? 'border-red-500 ring-2 ring-red-100' : 'border-red-200'}`}
        >
          <p className="text-xs font-medium text-slate-500">Cancelled</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.cancelled}</p>
          <p className="text-xs text-slate-400 mt-1">Dropped</p>
        </div>
        <div 
          onClick={() => handleStatusCardClick('rejected')}
          className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer ${selectedStatusFilter === 'rejected' ? 'border-red-500 ring-2 ring-red-100' : 'border-red-200'}`}
        >
          <p className="text-xs font-medium text-slate-500">Rejected</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.rejected}</p>
          <p className="text-xs text-slate-400 mt-1">Rejected</p>
        </div>
        <div 
          onClick={() => setView('archived')}
          className="bg-white rounded-xl border border-purple-200 p-4 hover:shadow-sm transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">Archived</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.archived}</p>
          <p className="text-xs text-slate-400 mt-1">Stored</p>
        </div>
        <div 
          onClick={() => setView('deleted')}
          className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-all cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">Deleted</p>
          <p className="text-2xl font-semibold text-slate-900 mt-2">{stats.deleted}</p>
          <p className="text-xs text-slate-400 mt-1">30-day retention</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setView('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            view === 'active'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setView('archived')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            view === 'archived'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Archived
        </button>
        <button
          onClick={() => setView('deleted')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            view === 'deleted'
              ? 'border-red-600 text-red-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Deleted
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Bookings</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest booking activity across all vendors</p>
          </div>
          
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
                {(filteredBookings ?? (view === 'archived' ? archivedBookings : view === 'deleted' ? deletedBookings : bookings.filter(b => !b.archived_at && !b.deleted_at))).map((booking) => (
              <div key={booking.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-900">
                      #{booking.id.slice(0, 8)}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {booking.service?.title || 'Unknown Service'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {booking.tourist_profile?.full_name || booking.guest_name || 'Unknown Tourist'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {formatCurrencyWithConversion(booking.total_amount, booking.currency, selectedCurrency, selectedLanguage)}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <StatusBadge status={booking.status} variant="small" />
                      <StatusBadge status={booking.payment_status} variant="small" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Status</label>
                    <select
                      value={booking.status}
                      onChange={(e) => updateBookingStatus(booking.id, e.target.value as Booking['status'])}
                      className="w-full border rounded px-2 py-2 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                    <select
                      value={booking.payment_status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as Booking['payment_status'];
                        console.log('Admin: Payment status dropdown changed for booking', booking.id, 'from', booking.payment_status, 'to', newStatus);
                        try {
                          await updatePaymentStatus(booking.id, newStatus);
                          console.log('Admin: Payment status update completed');
                        } catch (err) {
                          console.error('Admin: Payment status update failed:', err);
                          alert('Failed to update payment status: ' + (err instanceof Error ? err.message : 'Unknown error'));
                        }
                      }}
                      className="w-full border rounded px-2 py-2 text-sm"
                    >
                      <option value="pending">Payment Pending</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowBookingDetails(true);
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700"
                  >
                    View Details
                  </button>
                  {view === 'active' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => archiveBooking(booking.id)}
                        className="flex-1 px-3 py-2 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700"
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => deleteBooking(booking.id)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  {view === 'archived' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => restoreBooking(booking.id)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => deleteBooking(booking.id)}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  {view === 'deleted' && (
                    <button
                      onClick={() => restoreBooking(booking.id)}
                      className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Booking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tourist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Payment
                  </th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
            {(filteredBookings ?? (view === 'archived' ? archivedBookings : view === 'deleted' ? deletedBookings : bookings.filter(b => !b.archived_at && !b.deleted_at))).map((booking) => (
                  <tr 
                    key={booking.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowBookingDetails(true);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      #{booking.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {booking.service?.title || 'Unknown Service'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {booking.service?.vendors?.business_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {booking.tourist_profile?.full_name || booking.guest_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {booking.tourist_profile?.phone || booking.guest_email || booking.guest_phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {booking.service_date 
                          ? format(new Date(booking.service_date), 'MMM dd, yyyy')
                          : 'Not specified'
                        }
                      </div>
                      <div className="text-sm text-slate-500">
                        Booked: {format(new Date(booking.created_at), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatCurrencyWithConversion(booking.total_amount, booking.currency, selectedCurrency, selectedLanguage)}
                      <div className="text-xs text-slate-500">
                        {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={booking.status} variant="small" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={booking.payment_status} variant="small" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <BookingActionsMenu
                        booking={booking}
                        view={view}
                        onStatusChange={updateBookingStatus}
                        onPaymentChange={updatePaymentStatus}
                        onArchive={archiveBooking}
                        onDelete={deleteBooking}
                        onRestore={restoreBooking}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {bookings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500">No bookings found</p>
            </div>
          )}

          {/* Tickets for selected category - only show for Events (cat_activities) */}
          {selectedCategory === 'cat_activities' && (
            <div className="mt-6 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h3 className="text-sm font-semibold text-slate-900">Tickets for selected category</h3>
              </div>
              <div className="p-5">
                {categoryTicketsLoading ? (
                  <div className="py-6"><LoadingSpinner size="md" /></div>
                ) : categoryTickets.length === 0 ? (
                  <p className="text-sm text-slate-500">No tickets found for this category.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Booking ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ticket Code</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            <select
                              value={selectedEventFilter}
                              onChange={(e) => setSelectedEventFilter(e.target.value)}
                              className="text-xs font-medium text-slate-500 uppercase bg-white border border-slate-300 rounded px-2 py-1 cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="all">All Events</option>
                              {Array.from(new Set(categoryTickets.map(t => t.services?.title || 'Event').filter(title => title !== 'Event'))).sort().map(eventName => (
                                <option key={eventName} value={eventName}>{eventName}</option>
                              ))}
                            </select>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            <select
                              value={selectedTypeFilter}
                              onChange={(e) => setSelectedTypeFilter(e.target.value)}
                              className="text-xs font-medium text-slate-500 uppercase bg-white border border-slate-300 rounded px-2 py-1 cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="all">All Types</option>
                              {Array.from(new Set(categoryTickets.map(t => t.ticket_types?.title || 'Ticket').filter(title => title !== 'Ticket'))).sort().map(typeName => (
                                <option key={typeName} value={typeName}>{typeName}</option>
                              ))}
                            </select>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            <select
                              value={selectedVendorFilter}
                              onChange={(e) => setSelectedVendorFilter(e.target.value)}
                              className="text-xs font-medium text-slate-500 uppercase bg-white border border-slate-300 rounded px-2 py-1 cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="all">All Vendors</option>
                              {Array.from(new Set(categoryTickets.map(t => t.services?.vendors?.business_name || 'Unknown').filter(name => name !== 'Unknown'))).sort().map(vendorName => (
                                <option key={vendorName} value={vendorName}>{vendorName}</option>
                              ))}
                            </select>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Issued</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Booking Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            <select
                              value={selectedAttendanceFilter}
                              onChange={(e) => setSelectedAttendanceFilter(e.target.value)}
                              className="text-xs font-medium text-slate-500 uppercase bg-white border border-slate-300 rounded px-2 py-1 cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="all">All Attendance</option>
                              <option value="attended">Attended</option>
                              <option value="not-attended">Not Attended</option>
                            </select>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {categoryTickets
                          .filter(t => selectedEventFilter === 'all' || (t.services?.title || 'Event') === selectedEventFilter)
                          .filter(t => selectedTypeFilter === 'all' || (t.ticket_types?.title || 'Ticket') === selectedTypeFilter)
                          .filter(t => selectedVendorFilter === 'all' || (t.services?.vendors?.business_name || 'Unknown') === selectedVendorFilter)
                          .filter(t => {
                            if (selectedAttendanceFilter === 'all') return true;
                            if (selectedAttendanceFilter === 'attended') return t.status === 'used';
                            if (selectedAttendanceFilter === 'not-attended') return t.status !== 'used';
                            return true;
                          })
                          .map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              {(() => {
                                // Match tickets to bookings based on service and tourist
                                let match = (filteredBookings || []).find((b: any) =>
                                  b.service_id === t.service_id && (b.tourist_id === t.owner_id || (t.orders && b.tourist_id === t.orders.user_id))
                                )

                                // If no direct match, try to match by order user and service with date proximity
                                if (!match && t.orders) {
                                  match = (filteredBookings || []).find((b: any) => {
                                    const bookingDate = new Date(b.created_at)
                                    const orderDate = new Date(t.orders!.created_at)
                                    const timeDiff = Math.abs(bookingDate.getTime() - orderDate.getTime())
                                    // Match if within 5 minutes and same service
                                    return b.service_id === t.service_id && timeDiff < 5 * 60 * 1000
                                  })
                                }

                                return match ? `#${match.id.slice(0,8)}` : t.order_id ? `#${t.order_id.slice(0,8)}` : `#${t.id.slice(0,8)}`
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{t.code}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{t.services?.title || 'Event'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{t.ticket_types?.title || 'Ticket'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{t.services?.vendors?.business_name || 'Unknown'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{t.issued_at ? formatDateTime(t.issued_at) : '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <StatusBadge status={t.status} variant="small" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{formatCurrencyWithConversion(t.ticket_types?.price || 0, t.orders?.currency || 'UGX', selectedCurrency, selectedLanguage)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                              {(() => {
                                // Match tickets to bookings based on service and tourist
                                let match = (filteredBookings || []).find((b: any) =>
                                  b.service_id === t.service_id && (b.tourist_id === t.owner_id || (t.orders && b.tourist_id === t.orders.user_id))
                                )

                                // If no direct match, try to match by order user and service with date proximity
                                if (!match && t.orders) {
                                  match = (filteredBookings || []).find((b: any) => {
                                    const bookingDate = new Date(b.created_at)
                                    const orderDate = new Date(t.orders!.created_at)
                                    const timeDiff = Math.abs(bookingDate.getTime() - orderDate.getTime())
                                    // Match if within 5 minutes and same service
                                    return b.service_id === t.service_id && timeDiff < 5 * 60 * 1000
                                  })
                                }
                                
                                // If ticket's order is paid, booking should be confirmed
                                const bookingStatus = t.orders?.status === 'paid' ? 'confirmed' : (match?.status || null)
                                
                                return bookingStatus ? <StatusBadge status={bookingStatus} variant="small" /> : <span className="text-sm text-slate-500">—</span>
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                              {t.status === 'used' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Attended
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                  Not Attended
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    setSelectedTicket(t)
                                    // prefer a stored ticket image if available
                                    if (t.image_url || t.image) {
                                      setTicketImageUrl(t.image_url || t.image)
                                    } else {
                                      const payload = t.qr_data || t.code || t.id
                                      const url = await QRCode.toDataURL(payload)
                                      setTicketImageUrl(url)
                                    }
                                    setShowTicketImage(true)
                                  } catch (err) {
                                    console.error('Failed to generate ticket image:', err)
                                    alert('Failed to generate ticket image')
                                  }
                                }}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              >
                                View Ticket
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
          )}
        </div>
      </div>

      {/* Saved Cart Items */}
      <div className="bg-white shadow-sm rounded-xl border border-slate-200">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Saved Cart Items ({cartState.items.length})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Saved Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {cartState.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {item.service.title}
                        </div>
                        <div className="text-sm text-slate-500">
                          {item.service.vendors.business_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 capitalize">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatCurrencyWithConversion(item.totalPrice, item.currency, selectedCurrency, selectedLanguage)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {format(new Date(item.savedAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {cartState.items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500">No saved cart items</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-900">Booking Details</h3>
              <button 
                onClick={() => setShowBookingDetails(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-slate-900">Booking Information</h4>
                  <div className="mt-2 space-y-2">
                    <p><span className="font-medium">Booking ID:</span> #{selectedBooking.id.slice(0, 8)}</p>
                    <p><span className="font-medium">Service:</span> {selectedBooking.service?.title || selectedBooking.service_id}</p>
                    <p><span className="font-medium">Vendor:</span> {selectedBooking.service?.vendors?.business_name || 'Unknown'}</p>
                    <p><span className="font-medium">Booked Date:</span> {format(selectedBooking.created_at, 'MMM dd, yyyy HH:mm')}</p>
                    <p><span className="font-medium">Service Date:</span> {selectedBooking.service_date ? format(new Date(selectedBooking.service_date), 'MMM dd, yyyy') : 'Not specified'}</p>
                    <p><span className="font-medium">Guests:</span> {selectedBooking.guests}</p>
                    <p><span className="font-medium">Total Amount:</span> {formatCurrencyWithConversion(selectedBooking.total_amount, selectedBooking.currency, selectedCurrency, selectedLanguage)}</p>
                    <p><span className="font-medium">Status:</span> <StatusBadge status={selectedBooking.status} variant="small" /></p>
                    <p><span className="font-medium">Payment Status:</span> <StatusBadge status={selectedBooking.payment_status} variant="small" /></p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Customer Information</h4>
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
                        <p><span className="font-medium">Phone:</span> {selectedBooking.tourist_profile?.phone || 'Not available'}</p>
                      </>
                    )}
                  </div>
                  
                  {selectedBooking.special_requests && (
                    <div className="mt-4">
                      <h4 className="font-medium text-slate-900">Special Requests</h4>
                      <p className="mt-1 text-sm text-slate-600">{selectedBooking.special_requests}</p>
                    </div>
                  )}
              
                  {/* Tickets issued for this booking (if any) */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-slate-900">Tickets</h4>
                    <div className="mt-2">
                      {ticketsLoading ? (
                        <div className="py-4"><LoadingSpinner size="md" /></div>
                      ) : (selectedBookingTickets.length === 0 ? (
                        <p className="text-sm text-slate-500">No tickets found for this booking/customer.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                              <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Ticket Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Issued</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                              {selectedBookingTickets.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                  <td className="px-4 py-2 text-sm text-slate-900 font-mono">{t.code}</td>
                                  <td className="px-4 py-2 text-sm text-slate-700">{t.ticket_types?.title || 'Ticket'}</td>
                                  <td className="px-4 py-2 text-sm text-slate-700">{t.issued_at ? format(new Date(t.issued_at), 'MMM dd, yyyy') : '—'}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      {t.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            setSelectedTicket(t)
                                            if (t.image_url || t.image) {
                                              setTicketImageUrl(t.image_url || t.image)
                                            } else {
                                              const payload = t.qr_data || t.code || t.id
                                              const url = await QRCode.toDataURL(payload)
                                              setTicketImageUrl(url)
                                            }
                                            setShowTicketImage(true)
                                          } catch (err) {
                                            console.error('Failed to generate ticket image:', err)
                                            alert('Failed to generate ticket image')
                                          }
                                        }}
                                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                      >
                                        View Ticket
                                      </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Transport-specific details */}
              {(selectedBooking.pickup_location || selectedBooking.dropoff_location || selectedBooking.driver_option) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900">Transport Details</h4>
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
              
              <div className="border-t pt-4 flex justify-end space-x-2">
                <button 
                  onClick={() => setShowBookingDetails(false)}
                  className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showTicketImage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Ticket</h3>
              <button onClick={() => { setShowTicketImage(false); setTicketImageUrl(null); setSelectedTicket(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="flex flex-col items-center">
                {ticketImageUrl ? (
                <img loading="lazy" decoding="async" src={ticketImageUrl} alt="Ticket" className="max-w-full h-auto" />
              ) : (
                <p className="text-sm text-slate-500">No image available</p>
              )}
              {selectedTicket && (
                <div className="mt-3 text-sm text-slate-700 w-full">
                  <p><span className="font-medium">Ticket Code:</span> {selectedTicket.code}</p>
                  <p><span className="font-medium">Event:</span> {selectedTicket.services?.title || selectedTicket.service_id}</p>
                  <p><span className="font-medium">Type:</span> {selectedTicket.ticket_types?.title || 'Ticket'}</p>
                  <p><span className="font-medium">Issued:</span> {selectedTicket.issued_at ? format(new Date(selectedTicket.issued_at), 'MMM dd, yyyy') : '—'}</p>
                </div>
              )}
              <div className="mt-4 flex justify-end w-full">
                <button onClick={() => { setShowTicketImage(false); setTicketImageUrl(null); setSelectedTicket(null); }} className="px-3 py-2 bg-slate-600 text-white rounded">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}