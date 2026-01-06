import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Plane,
  ArrowLeft,
  Wifi,
  Coffee,
  Monitor
} from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { useFlights } from '../hooks/hook'
import type { Flight } from '../types'

export default function FlightDetail() {
  const { id } = useParams<{ id: string }>()
  const { flights } = useFlights()
  const [flight, setFlight] = useState<Flight | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (flights && id) {
      const foundFlight = flights.find(f => f.id === id)
      setFlight(foundFlight || null)
      setLoading(false)
    }
  }, [flights, id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!flight) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Plane className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Flight Not Found</h2>
          <p className="text-gray-600 mb-4">The flight you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/flights"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Flights
          </Link>
        </div>
      </div>
    )
  }

  const departureDate = new Date(flight.departure_time)
  const arrivalDate = new Date(flight.arrival_time)
  const durationHours = Math.floor(flight.duration_minutes / 60)
  const durationMinutes = flight.duration_minutes % 60

  // Mock amenities for display (in a real app, these would come from the database)
  const amenities = flight.amenities || ['WiFi', 'Entertainment', 'Meals', 'USB Charging']

  const amenityIcons: { [key: string]: any } = {
    'WiFi': Wifi,
    'Entertainment': Monitor,
    'Meals': Coffee,
    'USB Charging': null // Could add an icon for this
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          to="/flights"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Flights
        </Link>

        {/* Flight Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{flight.airline}</h1>
              <p className="text-gray-600">Flight {flight.flight_number}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(flight.economy_price, flight.currency)}
              </div>
              <div className="text-sm text-gray-500">Economy</div>
            </div>
          </div>

          {/* Flight Route */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <div className="text-lg font-semibold text-gray-900">{flight.departure_city}</div>
              <div className="text-sm text-gray-500">{flight.departure_airport}</div>
              <div className="text-lg font-bold text-blue-600 mt-1">
                {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-gray-500">
                {departureDate.toLocaleDateString()}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center">
                <Plane className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-sm text-gray-500">
                  {durationHours}h {durationMinutes}m
                </div>
              </div>
            </div>

            <div className="text-center flex-1">
              <div className="text-lg font-semibold text-gray-900">{flight.arrival_city}</div>
              <div className="text-sm text-gray-500">{flight.arrival_airport}</div>
              <div className="text-lg font-bold text-blue-600 mt-1">
                {arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-gray-500">
                {arrivalDate.toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Aircraft Info */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Aircraft:</span>
                <span className="ml-2 text-gray-600">{flight.aircraft_type || 'Boeing 737'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Available Seats:</span>
                <span className="ml-2 text-gray-600">{flight.available_seats}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Baggage:</span>
                <span className="ml-2 text-gray-600">{flight.baggage_allowance || '23kg'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flight Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Amenities */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Flight Amenities</h2>
              <div className="grid grid-cols-2 gap-4">
                {amenities.map((amenity, index) => {
                  const IconComponent = amenityIcons[amenity]
                  return (
                    <div key={index} className="flex items-center">
                      {IconComponent && <IconComponent className="h-5 w-5 text-blue-600 mr-3" />}
                      <span className="text-gray-700">{amenity}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Important Information</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• Check-in opens 24 hours before departure</p>
                <p>• Boarding closes 45 minutes before departure</p>
                <p>• Valid government-issued ID required for check-in</p>
                <p>• Baggage fees may apply for additional luggage</p>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Book This Flight</h3>

              {/* Class Selection */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                  <div>
                    <div className="font-medium text-gray-900">Economy</div>
                    <div className="text-sm text-gray-500">{flight.available_seats} seats left</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">
                      {formatCurrency(flight.economy_price, flight.currency)}
                    </div>
                  </div>
                </div>

                {flight.business_price && (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">Business</div>
                      <div className="text-sm text-gray-500">Limited seats</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(flight.business_price, flight.currency)}
                      </div>
                    </div>
                  </div>
                )}

                {flight.first_class_price && (
                  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">First Class</div>
                      <div className="text-sm text-gray-500">Premium experience</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(flight.first_class_price, flight.currency)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Book Button */}
              <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium">
                Select Seats & Continue
              </button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Free cancellation up to 24 hours before departure
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}