import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Booking, Service } from '../../types'
import { createBooking, getBookings, getServices, updateBookingStatus, deleteBooking } from '../../store/vendorStore'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/StatusBadge'
import { Trash2 } from 'lucide-react'

export default function VendorBookings() {
  const { profile } = useAuth()
  const vendorId = profile?.id || 'vendor_demo'

  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setBookings(getBookings(vendorId))
    setServices(getServices(vendorId))
  }
  useEffect(() => { load() }, [])

  const handleStatusChange = (bookingId: string, status: Booking['status']) => {
    updateBookingStatus(vendorId, bookingId, status)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Add Booking</button>
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
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{b.service?.name || b.service_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(b.booking_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{b.guests}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(b.total_amount, b.currency)}</td>
                  <td className="px-6 py-4"><StatusBadge status={b.status} variant="small" /></td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-3">
                      <select value={b.status} onChange={(e) => handleStatusChange(b.id, e.target.value as Booking['status'])} className="border rounded-md px-2 py-1">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button
                        className="text-red-600 hover:text-red-800"
                        title="Delete booking"
                        onClick={() => { if (confirm('Delete this booking?')) { deleteBooking(vendorId, b.id); setBookings(prev => prev.filter(x => x.id !== b.id)) } }}
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

      {showForm && (
        <BookingForm
          services={services}
          onClose={() => setShowForm(false)}
          onSubmit={(payload) => {
            const created = createBooking(vendorId, payload as any)
            setBookings(prev => [created, ...prev])
            setShowForm(false)
          }}
        />
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
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white">Create booking</button>
          </div>
        </form>
      </div>
    </div>
  )
}
