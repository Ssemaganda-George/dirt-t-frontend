import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAllBookings, getServices as getServicesDb } from '../../lib/database'
import { format } from 'date-fns'
import { usePreferences } from '../../contexts/PreferencesContext'
import { formatCurrencyWithConversion } from '../../lib/utils'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function getMonthDays(date: Date) {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  const days: Date[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}

function getDatesBetween(start: Date, end: Date) {
  const dates: Date[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d))
  }
  return dates
}

export default function VendorAvailability() {
  const { profile, vendor } = useAuth()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'

  const [services, setServices] = useState<any[]>([])
  // default to 'all' to show all bookings across services
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>('all')
  const [bookings, setBookings] = useState<any[]>([])
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDateBookings, setSelectedDateBookings] = useState<any[]>([])
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [selectedBookingObj, setSelectedBookingObj] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const svc = await getServicesDb(vendorId)
        if (!mounted) return
        setServices(svc)
        // If no selection set by caller, default to 'all' (show all bookings)
        if (!selectedServiceId) setSelectedServiceId('all')
      } catch (err) {
        console.error('Error loading services for availability:', err)
      }
    })()
    return () => { mounted = false }
  }, [vendorId])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const all = await getAllBookings()
        if (!mounted) return
        // filter to vendor
        const vendorBookings = all.filter(b => b.vendor_id === vendorId)
        setBookings(vendorBookings)
      } catch (err) {
        console.error('Error loading bookings for availability:', err)
      }
    })()
    return () => { mounted = false }
  }, [vendorId])

  const bookingsForService = useMemo(() => {
    if (!selectedServiceId || selectedServiceId === 'all') return bookings
    return bookings.filter(b => b.service_id === selectedServiceId)
  }, [bookings, selectedServiceId])

  // Categories that allow only a single booking per date
  const singleBookingCategories = useMemo(() => new Set(['transport', 'accommodation', 'hotels', 'hotel']), [])

  // Build a set of dates that are taken by single-booking categories (transport/accommodation)
  const singleBookingUnavailableDates = useMemo(() => {
    const set = new Set<string>()
    for (const b of bookings) {
      const catName = (b.services?.service_categories?.name || b.service?.service_categories?.name || '').toString().toLowerCase()
      if (!catName) continue
      if (!singleBookingCategories.has(catName)) continue
      if (!b.service_date) continue
      const start = new Date(b.service_date)
      if (isNaN(start.getTime())) continue
      const end = b.end_date ? new Date(b.end_date) : start
      if (isNaN(end.getTime())) {
        set.add(format(start, 'yyyy-MM-dd'))
        continue
      }
      const from = start < end ? start : end
      const to = end >= start ? end : start
      const dates = getDatesBetween(from, to)
      for (const dt of dates) set.add(format(dt, 'yyyy-MM-dd'))
    }
    return set
  }, [bookings, singleBookingCategories])

  // Find the category of the currently selected service (if any)
  const selectedServiceCategory = useMemo(() => {
    if (!selectedServiceId || selectedServiceId === 'all') return null
    const svc = services.find(s => s.id === selectedServiceId)
    return svc?.service_categories?.name?.toString().toLowerCase() || null
  }, [selectedServiceId, services])

  const bookedDates = useMemo(() => {
    const set = new Set<string>()
    for (const b of bookingsForService) {
      if (!b.service_date) continue
      const start = new Date(b.service_date)
      if (isNaN(start.getTime())) continue
      const end = b.end_date ? new Date(b.end_date) : start
      if (isNaN(end.getTime())) {
        set.add(format(start, 'yyyy-MM-dd'))
        continue
      }
      const from = start < end ? start : end
      const to = end >= start ? end : start
      const dates = getDatesBetween(from, to)
      for (const dt of dates) set.add(format(dt, 'yyyy-MM-dd'))
    }
    return set
  }, [bookingsForService])

  const days = getMonthDays(month)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Availability</h1>
          <p className="text-sm text-gray-500 mt-1">View your booking calendar</p>
        </div>
        <select
          className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          value={selectedServiceId}
          onChange={e => setSelectedServiceId(e.target.value)}
        >
          <option value="all">All bookings</option>
          {services.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(prev => addMonths(prev, -1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">{format(month, 'MMMM yyyy')}</span>
            <button
              onClick={() => setMonth(prev => addMonths(prev, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Booked</span>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs font-medium text-gray-400 text-center py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {(() => {
          const startPad = days[0].getDay()
          const tiles: (Date | null)[] = [...Array(startPad).fill(null), ...days]
          const weeks: (Date | null)[][] = []
          for (let i = 0; i < tiles.length; i += 7) weeks.push(tiles.slice(i, i + 7))

          return (
            <div className="space-y-1.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1.5">
                  {week.map((cell, ci) => {
                    if (!cell) return <div key={ci} />
                    const key = format(cell, 'yyyy-MM-dd')
                    const isBooked = bookedDates.has(key)
                    const isSingleBlocked = singleBookingUnavailableDates.has(key) && (
                      selectedServiceId === 'all' || (selectedServiceCategory && singleBookingCategories.has(selectedServiceCategory))
                    )

                    return (
                      <div
                        key={key}
                        onClick={() => {
                          if (!isBooked) return
                          const matched = bookingsForService.filter(b => {
                            if (!b.service_date) return false
                            try {
                              const start = new Date(b.service_date)
                              const end = b.end_date ? new Date(b.end_date) : start
                              if (isNaN(start.getTime())) return false
                              if (isNaN(end.getTime())) return format(start, 'yyyy-MM-dd') === key
                              const dates = getDatesBetween(start < end ? start : end, end >= start ? end : start)
                              return dates.some(dt => format(dt, 'yyyy-MM-dd') === key)
                            } catch {
                              return false
                            }
                          })
                          setSelectedDate(key)
                          setSelectedDateBookings(matched)
                        }}
                        className={`rounded-lg p-2 min-h-[52px] sm:min-h-[60px] flex flex-col items-center justify-center text-sm transition
                          ${isSingleBlocked
                            ? 'bg-gray-50 text-gray-300'
                            : isBooked
                              ? 'bg-red-50 text-red-700 cursor-pointer hover:bg-red-100'
                              : 'hover:bg-gray-50'
                          }`}
                      >
                        <span className={`text-sm font-medium ${isSingleBlocked ? 'line-through' : ''}`}>{format(cell, 'd')}</span>
                        {isSingleBlocked ? (
                          <span className="text-[10px] text-gray-400 mt-0.5">Blocked</span>
                        ) : isBooked ? (
                          <span className="text-[10px] font-medium mt-0.5">Booked</span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Date Bookings Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setSelectedDate(null); setSelectedDateBookings([]) }} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Bookings on</p>
                <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
              </div>
              <button
                onClick={() => { setSelectedDate(null); setSelectedDateBookings([]) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              {selectedDateBookings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No bookings found for this date.</p>
              ) : (
                selectedDateBookings.map(b => (
                  <div key={b.id} className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50/50 transition">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{b.profiles?.full_name || b.guest_name || 'Guest'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{b.service?.title || b.services?.title || `Service ${b.service_id}`}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-medium text-gray-900">{b.guests} guest{b.guests > 1 ? 's' : ''}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium mt-0.5 ${
                          b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700'
                            : b.status === 'pending' ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>{b.status}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {b.service_date ? (
                          b.end_date ? (
                            `${format(new Date(b.service_date), 'MMM d, h:mm a')} — ${format(new Date(b.end_date), 'MMM d, h:mm a')}`
                          ) : (
                            format(new Date(b.service_date), 'h:mm a')
                          )
                        ) : ''}
                      </p>
                      <button
                        onClick={() => setSelectedBookingObj(b)}
                        className="text-xs font-medium text-gray-900 hover:underline"
                      >
                        View details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBookingObj && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedBookingObj(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-y-auto max-h-[85vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-sm font-semibold text-gray-900">Booking Details</h2>
              <button onClick={() => setSelectedBookingObj(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Booking Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">ID</span>
                    <p className="font-medium text-gray-900">#{selectedBookingObj.id?.slice(0,8)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Service</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.service?.title || selectedBookingObj.services?.title || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Booked</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.booking_date ? format(new Date(selectedBookingObj.booking_date), 'dd MMM yyyy, HH:mm') : '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Service Date</span>
                    <p className="font-medium text-gray-900">
                      {selectedBookingObj.service_date ? (
                        selectedBookingObj.end_date ? (
                          `${format(new Date(selectedBookingObj.service_date), 'dd MMM yyyy')} — ${format(new Date(selectedBookingObj.end_date), 'dd MMM yyyy')}`
                        ) : (
                          format(new Date(selectedBookingObj.service_date), 'dd MMM yyyy, HH:mm')
                        )
                      ) : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Guests</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.guests ?? '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount</span>
                    <p className="font-medium text-gray-900">{formatCurrencyWithConversion(selectedBookingObj.total_amount || 0, selectedBookingObj.currency || 'UGX', selectedCurrency, selectedLanguage)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.status || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Payment</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.payment_status || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Customer</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">ID</span>
                    <p className="font-medium text-gray-900">#{selectedBookingObj.tourist_id ? selectedBookingObj.tourist_id.slice(0,8) : '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Name</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.tourist_profile?.full_name || selectedBookingObj.guest_name || 'Not available'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Transport Details</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Driver</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.driver_option || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Start</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.start_time || '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">End</span>
                    <p className="font-medium text-gray-900">{selectedBookingObj.end_time || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setSelectedBookingObj(null)} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition">
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
