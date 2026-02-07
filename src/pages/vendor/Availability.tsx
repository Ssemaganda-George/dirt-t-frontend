import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAllBookings, getServices as getServicesDb } from '../../lib/database'
import { format } from 'date-fns'
import { usePreferences } from '../../contexts/PreferencesContext'
import { formatCurrencyWithConversion } from '../../lib/utils'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

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
    <div className="space-y-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm text-gray-600 hidden sm:block">Service</label>
          <select
            className="w-full sm:w-auto px-3 py-2 border rounded-md text-sm"
            value={selectedServiceId}
            onChange={e => setSelectedServiceId(e.target.value)}
          >
            <option value="all">All bookings</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(prev => addMonths(prev, -1))}
              className="p-2 rounded-md border hover:bg-gray-50"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="font-medium text-sm">{format(month, 'MMMM yyyy')}</div>
            <button
              onClick={() => setMonth(prev => addMonths(prev, 1))}
              className="p-2 rounded-md border hover:bg-gray-50"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="text-sm text-gray-600"> 
            <span className="inline-flex items-center mr-3"><span className="w-2 h-2 rounded-full bg-green-400 inline-block mr-2"></span>Available</span>
            <span className="inline-flex items-center"><span className="w-2 h-2 rounded-full bg-red-400 inline-block mr-2"></span>Booked</span>
          </div>
        </div>

        {/* Month header */}
        <div className="text-center">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>

          {/* Build tiles with week separators */}
          {(() => {
            const startPad = days[0].getDay()
            const tiles: (Date | null)[] = [...Array(startPad).fill(null), ...days]
            const weeks: (Date | null)[][] = []
            for (let i = 0; i < tiles.length; i += 7) weeks.push(tiles.slice(i, i + 7))

            return (
              <div className="space-y-2">
                {weeks.map((week, wi) => (
                  <div key={wi} className={`grid grid-cols-7 gap-2 items-stretch border-b ${wi === weeks.length - 1 ? 'border-b-0' : 'border-gray-100'} pb-2`}>
                    {week.map((cell, ci) => {
                      if (!cell) return <div key={ci} />
                      const key = format(cell, 'yyyy-MM-dd')
                      const isBooked = bookedDates.has(key)
                      // Date is blocked if any transport/accommodation booking exists on that date
                      const isSingleBlocked = singleBookingUnavailableDates.has(key) && (
                        selectedServiceId === 'all' || (selectedServiceCategory && singleBookingCategories.has(selectedServiceCategory))
                      )

                      return (
                        <div key={key} className="p-1">
                          <div
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
                            aria-disabled={isSingleBlocked}
                            className={`rounded-md p-2 min-h-[52px] sm:min-h-[64px] flex flex-col justify-between items-center text-sm
                              ${isSingleBlocked ? 'bg-gray-50 text-gray-400 opacity-80' : isBooked ? 'bg-red-50 text-red-700 cursor-pointer' : 'bg-white'}`}
                          >
                            <div className={`text-base font-medium ${isSingleBlocked ? 'line-through' : ''}`}>{format(cell, 'd')}</div>
                            {isSingleBlocked ? (
                              <div className="text-xs font-medium text-gray-500">Unavailable</div>
                            ) : isBooked ? (
                              <div className="text-xs font-medium">Booked</div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>
      
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => { setSelectedDate(null); setSelectedDateBookings([]) }} />
          <div className="relative w-full sm:max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Bookings on</div>
                <div className="font-bold text-lg">{format(new Date(selectedDate), 'MMMM d, yyyy')}</div>
              </div>
              <button className="text-gray-500" onClick={() => { setSelectedDate(null); setSelectedDateBookings([]) }}>Close</button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {selectedDateBookings.length === 0 ? (
                <div className="text-sm text-gray-500">No bookings found for this date.</div>
              ) : (
                selectedDateBookings.map(b => (
                  <div key={b.id} className="p-3 border rounded-md">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{b.profiles?.full_name || b.guest_name || 'Guest'}</div>
                        <div className="text-xs text-gray-500">{b.service?.title || b.services?.title || `Service ${b.service_id}`}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{b.guests} guest{b.guests > 1 ? 's' : ''}</div>
                        <div className="text-xs text-gray-500">{b.status}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {b.service_date ? (
                          b.end_date ? (
                            `${format(new Date(b.service_date), 'MMM d, h:mm a')} — ${format(new Date(b.end_date), 'MMM d, h:mm a')}`
                          ) : (
                            format(new Date(b.service_date), 'h:mm a')
                          )
                        ) : ''}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedBookingObj(b)}
                          className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        )}

        {/* Booking Details Dialog (opened from View details) */}
        {selectedBookingObj && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-y-auto max-h-[90vh]">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-medium">Booking Details</h2>
                <button onClick={() => setSelectedBookingObj(null)} className="text-gray-500">✕</button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold">Booking Information</h3>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                    <div><span className="font-medium">Booking ID:</span> #{selectedBookingObj.id?.slice(0,8)}</div>
                    <div><span className="font-medium">Service:</span> {selectedBookingObj.service?.title || selectedBookingObj.services?.title || '—'}</div>
                    <div><span className="font-medium">Booked Date:</span> {selectedBookingObj.booking_date ? format(new Date(selectedBookingObj.booking_date), 'dd MMM yyyy, HH:mm') : '—'}</div>
                    <div>
                      <span className="font-medium">Service Date:</span>{' '}
                      {selectedBookingObj.service_date ? (
                        selectedBookingObj.end_date ? (
                          `${format(new Date(selectedBookingObj.service_date), 'dd MMM yyyy, HH:mm')} — ${format(new Date(selectedBookingObj.end_date), 'dd MMM yyyy, HH:mm')}`
                        ) : (
                          format(new Date(selectedBookingObj.service_date), 'dd MMM yyyy, HH:mm')
                        )
                      ) : '—'}
                    </div>
                    <div><span className="font-medium">Guests:</span> {selectedBookingObj.guests ?? '—'}</div>
                    <div><span className="font-medium">Total Amount:</span> {formatCurrencyWithConversion(selectedBookingObj.total_amount || 0, selectedBookingObj.currency || 'UGX', selectedCurrency, selectedLanguage)}</div>
                    <div><span className="font-medium">Status:</span> {selectedBookingObj.status || '—'}</div>
                    <div><span className="font-medium">Payment Status:</span> {selectedBookingObj.payment_status || '—'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold">Customer Information</h3>
                  <div className="mt-3 text-sm text-gray-700">
                    <div><span className="font-medium">Customer ID:</span> #{selectedBookingObj.tourist_id ? selectedBookingObj.tourist_id.slice(0,8) : '—'}</div>
                    <div><span className="font-medium">Name:</span> {selectedBookingObj.tourist_profile?.full_name || selectedBookingObj.guest_name || 'Not available'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold">Transport Details</h3>
                  <div className="mt-3 text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div><span className="font-medium">Driver Option:</span> {selectedBookingObj.driver_option || '—'}</div>
                    <div><span className="font-medium">Start Time:</span> {selectedBookingObj.start_time || '—'}</div>
                    <div><span className="font-medium">End Time:</span> {selectedBookingObj.end_time || '—'}</div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={() => setSelectedBookingObj(null)} className="px-4 py-2 bg-gray-600 text-white rounded-md">Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
