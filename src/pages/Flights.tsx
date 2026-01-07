import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, Plane, Clock } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { Link } from 'react-router-dom'
import { useServices } from '../hooks/hook'
import type { Service } from '../types'

export default function Flights() {
  const [searchTerm, setSearchTerm] = useState('')
  const { services: allServices, loading, error } = useServices()
  const [filteredFlights, setFilteredFlights] = useState<Service[]>([])

  useEffect(() => {
    if (allServices) {
      console.log('All services from database:', allServices.length)
      const flightServices = allServices.filter((service: Service) => 
        service.category_id === 'cat_flights' && 
        (!service.vendors || service.status === 'approved')
      )
      console.log('Flight services:', flightServices.length)
      
      const filtered = flightServices.filter((service: Service) => {
        // Search functionality
        const matchesSearch = !searchTerm || (
          service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.airline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.departure_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.arrival_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.flight_number?.toLowerCase().includes(searchTerm.toLowerCase())
        )

        return matchesSearch
      })
      console.log('Filtered flight services:', filtered.length)
      setFilteredFlights(filtered)
    } else {
      console.log('No services data received')
    }
  }, [searchTerm, allServices])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Plane className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Flights</h1>
          </div>
          <p className="text-lg text-gray-600">
            Flights in Uganda
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="I want ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <SlidersHorizontal className="h-5 w-5 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {/* Flights Grid */}
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <Plane className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Error loading flights</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading flights...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFlights.map((service) => (
              <Link
                key={service.id}
                to={`/services/${service.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow block group"
              >
                <div className="aspect-w-16 aspect-h-9 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                  <div className="text-white text-center">
                    <Plane className="h-16 w-16 mx-auto mb-2" />
                    <div className="text-lg font-semibold">{service.flight_number || service.title}</div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{service.airline || service.title}</h3>
                    <span className="text-sm text-gray-500">{service.flight_number || 'Flight'}</span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>{service.departure_city || 'Departure'}</span>
                      <span className="text-xs">→</span>
                      <span>{service.arrival_city || 'Arrival'}</span>
                    </div>
                    {service.departure_time && service.duration_minutes && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(service.departure_time).toLocaleDateString()}</span>
                        <span>{Math.floor(service.duration_minutes / 60)}h {service.duration_minutes % 60}m</span>
                      </div>
                    )}
                  </div>

                  {service.departure_time && (
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(service.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(service.economy_price || service.price, service.currency)}
                      </div>
                      <div className="text-sm text-gray-500">Economy</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">
                      {service.available_seats ? `${service.available_seats} seats available` : 'Seats available'}
                    </div>
                    <div className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center">
                      Book Flight
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filteredFlights.length === 0 && (
          <div className="text-center py-12">
            <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No flights found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}