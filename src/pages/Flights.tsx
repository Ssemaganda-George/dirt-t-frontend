import { useState, useEffect } from 'react'
import { Search, MapPin, Star, SlidersHorizontal, Plane } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { Link } from 'react-router-dom'

interface Flight {
  id: string
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  location: string
  vendors: {
    business_name: string
  }
  service_categories: {
    name: string
  }
}

// Mock data for demonstration
const mockFlights: Flight[] = [
  {
    id: 'flight-1',
    title: 'Kampala to Nairobi Flight',
    description: 'Direct flight from Kampala to Nairobi with excellent service and modern aircraft.',
    price: 450000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg'],
    location: 'Kampala - Nairobi',
    vendors: {
      business_name: 'East African Airlines'
    },
    service_categories: {
      name: 'Flights'
    }
  },
  {
    id: 'flight-2',
    title: 'Entebbe to Dar es Salaam',
    description: 'Comfortable flight connecting East African cities with scenic views.',
    price: 520000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg'],
    location: 'Entebbe - Dar es Salaam',
    vendors: {
      business_name: 'Regional Air Services'
    },
    service_categories: {
      name: 'Flights'
    }
  },
  {
    id: 'flight-3',
    title: 'Kigali to Kampala Route',
    description: 'Short regional flight with frequent departures and reliable service.',
    price: 280000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg'],
    location: 'Kigali - Kampala',
    vendors: {
      business_name: 'RwandAir Express'
    },
    service_categories: {
      name: 'Flights'
    }
  }
]

export default function Flights() {
  const [searchTerm, setSearchTerm] = useState('')
  const [flights] = useState<Flight[]>(mockFlights)
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>(mockFlights)

  useEffect(() => {
    const filtered = flights.filter(flight =>
      flight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredFlights(filtered)
  }, [searchTerm, flights])

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
            Find and book flights to your favorite destinations
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
                  placeholder="Search flights..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFlights.map((flight) => (
            <div key={flight.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                <img
                  src={flight.images[0]}
                  alt={flight.title}
                  className="w-full h-48 object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{flight.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{flight.description}</p>

                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  {flight.location}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.5</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(flight.price, flight.currency)}
                    </div>
                    <div className="text-sm text-gray-500">per person</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-2">
                    by {flight.vendors.business_name}
                  </div>
                  <Link
                    to={`/service/${flight.id}`}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center block"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredFlights.length === 0 && (
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