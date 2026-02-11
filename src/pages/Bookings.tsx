import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Booking } from '../lib/database'
import { formatCurrencyWithConversion } from '../lib/utils'
import { usePreferences } from '../contexts/PreferencesContext'

export default function Bookings() {
  const { user } = useAuth()
  const { selectedCurrency, selectedLanguage } = usePreferences()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchBookings()
    }
  }, [user])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services (
            id,
            title,
            images,
            location,
            service_categories (
              name
            )
          ),
          vendors (
            business_name
          )
        `)
        .eq('tourist_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      case 'completed':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Bookings</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchBookings}
            className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/profile"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-600 mt-2">Manage your travel bookings and reservations</p>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-white shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't made any bookings yet. Start exploring amazing experiences!
            </p>
            <Link
              to="/"
              className="bg-blue-600 text-white px-6 py-3 hover:bg-blue-700 transition-colors inline-block"
            >
              Explore Services
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white shadow-sm border border-gray-200 p-4 sm:p-6 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      {booking.services?.images?.[0] && (
                        <img
                          src={booking.services.images[0]}
                          alt={booking.services.title}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-0">
                          {booking.services?.title || 'Service'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {booking.services?.service_categories?.name || 'Service'}
                        </p>
                        <div className="flex flex-wrap text-sm text-gray-500 gap-3">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="truncate max-w-[10rem] block">{booking.services?.location || 'Location not specified'}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            <span>{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {booking.special_requests && (
                          <p className="text-sm text-gray-600 mt-2">
                            <strong>Special Requests:</strong> {booking.special_requests}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-0 sm:ml-4 flex flex-col items-start sm:items-end space-y-3 min-w-[10rem]">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span className="ml-1 capitalize text-sm">{booking.status}</span>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">
                        {formatCurrencyWithConversion(booking.total_amount, booking.currency, selectedCurrency || 'UGX', selectedLanguage || 'en-US')}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        Booked on {new Date(booking.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                      <Link
                        to={`/booking/${booking.id}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm text-center w-full sm:w-auto"
                      >
                        View Details
                      </Link>
                      {booking.status === 'pending' && (
                        <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm w-full sm:w-auto">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}