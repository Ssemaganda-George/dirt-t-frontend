import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Booking, Service } from '../../types'
import { getServices } from '../../store/vendorStore'
import { getAllBookings, createBooking as createDbBooking } from '../../lib/database'
import { formatCurrency, formatDateTime, getVendorDisplayStatus } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { Trash2 } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { supabase } from '../../lib/supabaseClient'

export default function VendorBookings() {
  const { profile, vendor } = useAuth()
  const vendorId = vendor?.id || profile?.id || 'vendor_demo'
  const { state: cartState } = useCart()

  console.log('VendorBookings - profile:', profile)
  console.log('VendorBookings - vendor:', vendor)
  console.log('VendorBookings - vendorId:', vendorId)
  console.log('VendorBookings - profile role:', profile?.role)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)

  // Fetch bookings from Supabase for this vendor
  const load = async () => {
    // Get all bookings, then filter by vendor_id
    const allBookings = await getAllBookings()
    console.log('All bookings from database:', allBookings)
    console.log('Looking for vendor_id:', vendorId)
    const filteredBookings = allBookings.filter(b => b.vendor_id === vendorId)
    console.log('Filtered bookings for vendor:', filteredBookings)
    console.log('Bookings with different vendor_ids:', allBookings.filter(b => b.vendor_id !== vendorId))
    setBookings(filteredBookings)
    setServices(getServices(vendorId))
  }

  // Set up real-time subscription for bookings
  useEffect(() => {
    if (!vendorId) return

    // Initial load
    load()

    // Subscribe to real-time changes for this vendor's bookings
    const subscription = supabase
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

    // Cleanup subscription on unmount or vendorId change
    return () => {
      subscription.unsubscribe()
    }
  }, [vendorId])

  // TODO: Implement status update via Supabase if needed
  const handleStatusChange = (bookingId: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    // Optionally: call a Supabase updateBookingStatus here
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Live updates
          </div>
          <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700">Add Booking</button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800">Debug Info:</h3>
        <p className="text-sm text-yellow-700">Profile ID: {profile?.id || 'Not logged in'}</p>
        <p className="text-sm text-yellow-700">Vendor Record ID: {vendor?.id || 'No vendor record'}</p>
        <p className="text-sm text-yellow-700">Using Vendor ID: {vendorId}</p>
        <p className="text-sm text-yellow-700">Profile Role: {profile?.role || 'Unknown'}</p>
        <p className="text-sm text-yellow-700">Bookings Count: {bookings.length}</p>
        <p className="text-sm text-green-700">✅ Real-time updates enabled</p>
        <div className="flex gap-2 mt-2">
          <button 
            onClick={async () => {
              const all = await getAllBookings()
              console.log('ALL BOOKINGS IN DATABASE:', all)
              alert(`Found ${all.length} total bookings in database. Check console for details.`)
            }}
            className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Check All Bookings in Console
          </button>
          <button 
            onClick={load}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
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
              {bookings.map(b => (
                <tr 
                  key={b.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedBooking(b)
                    setShowBookingDetails(true)
                  }}
                >
                  <td className="px-6 py-4 text-sm text-gray-900">{b.service?.title || b.service_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(b.booking_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{b.guests}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(b.total_amount, b.currency)}</td>
                  <td className="px-6 py-4"><StatusBadge status={getVendorDisplayStatus(b.status, b.payment_status)} variant="small" /></td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-3">
                      <select value={b.status} onChange={(e) => handleStatusChange(b.id, e.target.value as Booking['status'])} className="border rounded-md px-2 py-1">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                      {/* Delete booking functionality not implemented for Supabase yet */}
                      <button
                        className="text-red-600 hover:text-red-800 cursor-not-allowed opacity-50"
                        title="Delete booking (not implemented)"
                        disabled
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">No bookings yet.</td>
                </tr>
              )}
            </tbody>
          </table>
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
                    <p><span className="font-medium">Service:</span> {selectedBooking.service?.title || selectedBooking.service_id}</p>
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
                    <p><span className="font-medium">Customer ID:</span> #{selectedBooking.tourist_id.slice(0, 8)}</p>
                    <p><span className="font-medium">Name:</span> {selectedBooking.tourist_profile?.full_name || 'Not available'}</p>
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
