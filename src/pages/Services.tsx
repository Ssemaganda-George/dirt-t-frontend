import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Hotel, Camera, Utensils, Car, Activity, Plane, Search, Heart, MapPin, Star } from 'lucide-react'
import { getServices, getServiceCategories } from '../lib/database'
import { useFlights } from '../hooks/hook'
import { formatCurrency } from '../lib/utils'
import type { Service } from '../types'

const categories = [
  {
    name: 'Hotels',
    href: '/category/hotels',
    icon: Hotel,
    description: 'Find the perfect accommodation for your stay',
    color: 'bg-blue-500'
  },
  {
    name: 'Tours',
    href: '/category/tours',
    icon: Camera,
    description: 'Explore amazing destinations and experiences',
    color: 'bg-green-500'
  },
  {
    name: 'Restaurants',
    href: '/category/restaurants',
    icon: Utensils,
    description: 'Discover great places to eat and drink',
    color: 'bg-orange-500'
  },
  {
    name: 'Transport',
    href: '/category/transport',
    icon: Car,
    description: 'Get around with reliable transportation',
    color: 'bg-purple-500'
  },
  {
    name: 'Flights',
    href: '/flights',
    icon: Plane,
    description: 'Find and book flights to your destination',
    color: 'bg-indigo-500'
  },
  {
    name: 'Activities',
    href: '/category/activities',
    icon: Activity,
    description: 'Book exciting activities and adventures',
    color: 'bg-red-500'
  }
]

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [dbCategories, setDbCategories] = useState<Array<{id: string, name: string, icon?: string}>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  // Use the reactive useFlights hook instead of local state
  const { flights: allFlights, loading: flightsLoading } = useFlights()

  // Combined loading state
  const isLoading = loading || flightsLoading

  useEffect(() => {
    fetchServices()
    fetchCategories()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const allServices = await getServices()
      // Only show approved services to tourists, but admin services don't require approval
      const approvedServices = allServices.filter(service => 
        !service.vendors || service.status === 'approved'
      )
      setServices(approvedServices)
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const categories = await getServiceCategories()
      // Sort categories so Activities comes last
      const sortedCategories = categories.sort((a, b) => {
        if (a.id === 'cat_activities') return 1
        if (b.id === 'cat_activities') return -1
        return a.name.localeCompare(b.name)
      })
      
      // Add "All" category at the beginning
      const allCategories = [
        { id: 'all', name: 'All', icon: '🌍' },
        ...sortedCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon || '📍'
        }))
      ]
      setDbCategories(allCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Fallback to basic categories if database fetch fails
      setDbCategories([
        { id: 'all', name: 'All', icon: '🌍' },
        { id: 'cat_hotel', name: 'Hotels', icon: '🏨' },
        { id: 'cat_tour', name: 'Tours', icon: '🗺️' },
        { id: 'cat_restaurant', name: 'Restaurants', icon: '🍽️' },
        { id: 'cat_transport', name: 'Transport', icon: '🚗' },
        { id: 'cat_flights', name: 'Flights', icon: '✈️' },
        { id: 'cat_activities', name: 'Activities', icon: '🎯' }
      ])
    }
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
  }

  // Filter by search query first (across all categories if searching)
  const searchFilteredServices = services.filter(service => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return service.title.toLowerCase().includes(query) ||
           (service.location?.toLowerCase().includes(query) ?? false) ||
           (service.vendors?.business_name.toLowerCase().includes(query) ?? false) ||
           (service.service_categories?.name.toLowerCase().includes(query) ?? false) ||
           (service.description?.toLowerCase().includes(query) ?? false)
  })

  const searchFilteredFlights = allFlights.filter(flight => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return flight.flight_number.toLowerCase().includes(query) ||
           flight.airline.toLowerCase().includes(query) ||
           flight.departure_city.toLowerCase().includes(query) ||
           flight.arrival_city.toLowerCase().includes(query) ||
           query.includes('flight') ||
           query.includes('air') ||
           query.includes('plane') ||
           query.includes('airline') ||
           query.includes('aviation')
  })

  // Apply category filtering only when not searching
  const categoryFilteredServices = searchQuery 
    ? searchFilteredServices 
    : searchFilteredServices.filter(service => {
        if (selectedCategory === 'all') return true
        return service.category_id === selectedCategory
      })

  const categoryFilteredFlights = searchQuery
    ? searchFilteredFlights
    : allFlights.filter(() => {
        if (selectedCategory === 'all') return true
        if (selectedCategory === 'cat_flights') return true
        return false
      })

  const isShowingFlights = selectedCategory === 'cat_flights'
  const isShowingAll = selectedCategory === 'all'

  // For "All" category, combine services and flights
  // For "Flights" category, show only flights
  // For other categories, show only services
  // But if there's a search query, show all matching results regardless of category
  const currentItems = searchQuery
    ? [...searchFilteredServices, ...searchFilteredFlights] // When searching, show all matching results
    : isShowingAll
      ? [...categoryFilteredServices, ...categoryFilteredFlights]
      : isShowingFlights
        ? categoryFilteredFlights
        : categoryFilteredServices
  
  const currentItemCount = currentItems.length

  if (selectedService) {
    return (
      <ServiceDetail 
        service={selectedService} 
        onBack={() => setSelectedService(null)}
        formatCurrency={formatCurrency}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Filter Layout */}
      <div className="md:hidden">
        <div className="bg-white shadow-sm">
          <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Our Services</h1>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
              {dbCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all border flex-shrink-0 min-w-0 ${
                    selectedCategory === category.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-xs hidden md:inline">{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>

            {/* Results Header */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {searchQuery
                  ? `Search results for "${searchQuery}"`
                  : selectedCategory === 'all'
                    ? 'All Services'
                    : dbCategories.find(cat => cat.id === selectedCategory)?.name || selectedCategory}
              </h2>
              <p className="text-gray-600 text-sm">
                {currentItemCount} {searchQuery ? 'result' : isShowingAll ? 'result' : isShowingFlights ? 'flight' : 'service'}{currentItemCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="px-4 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentItems.map((item: any) => {
                // Check if item is a flight (has flight_number) or service
                if ('flight_number' in item) {
                  // It's a flight
                  return (
                    <FlightCard 
                      key={item.id} 
                      flight={item}
                      formatCurrency={formatCurrency}
                    />
                  )
                } else {
                  // It's a service
                  return (
                    <ServiceCard 
                      key={item.id} 
                      service={item}
                      formatCurrency={formatCurrency}
                      onClick={() => setSelectedService(item)}
                    />
                  )
                }
              })}
            </div>
          </div>
        )}

        {!isLoading && currentItemCount === 0 && (
          <div className="text-center py-16 px-4">
            <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Desktop Layout - Original Card Layout */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h1>
            <p className="text-lg text-gray-600">
              Discover and book amazing experiences, accommodations, and transportation services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={category.href}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${category.color} text-white mr-4 group-hover:scale-110 transition-transform`}>
                    <category.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{category.name}</h3>
                </div>
                <p className="text-gray-600">{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ServiceCardProps {
  service: Service
  formatCurrency: (amount: number, currency: string) => string
  onClick: () => void
}

function ServiceCard({ service, formatCurrency, onClick }: ServiceCardProps) {
  const [isSaved, setIsSaved] = useState(false)
  
  return (
    <div 
      onClick={onClick}
      className="group block cursor-pointer"
    >
      <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100">
        {/* Image Container */}
        <div className="relative">
          <img
            src={service.images[0]}
            alt={service.title}
            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Save Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsSaved(!isSaved)
            }}
            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
          >
            <Heart 
              className={`h-5 w-5 transition-colors ${
                isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'
              }`}
            />
          </button>

          {/* Category Badge */}
          <div className="absolute bottom-3 left-3">
            <span className="bg-white/95 px-3 py-1 rounded-full text-xs font-semibold text-gray-800">
              {service.service_categories?.name || service.category_id}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Location & Rating */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-sm text-gray-600 flex-1 min-w-0">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{service.location || 'Location TBA'}</span>
            </div>
            <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg ml-2">
              <Star className="h-4 w-4 text-emerald-600 fill-current flex-shrink-0" />
              <span className="text-sm font-bold text-emerald-700">4.5</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-2 min-h-[3rem]">
            {service.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {service.description}
          </p>

          {/* Reviews & Vendor */}
          <div className="text-xs text-gray-500 mb-3">
            0 reviews • {service.vendors?.business_name || 'Vendor'}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">From</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCurrency(service.price, service.currency)}
            </span>
            <span className="text-xs text-gray-500">per person</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ServiceDetailProps {
  service: Service
  onBack: () => void
  formatCurrency: (amount: number, currency: string) => string
}

function ServiceDetail({ service, onBack, formatCurrency }: ServiceDetailProps) {
  const [isSaved, setIsSaved] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to search
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-96 bg-gray-900">
        <img
          src={service.images[0]}
          alt={service.title}
          className="w-full h-full object-cover opacity-90"
        />
        <button
          onClick={() => setIsSaved(!isSaved)}
          className="absolute top-6 right-6 p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <Heart 
            className={`h-6 w-6 ${
              isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              {/* Title & Rating */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">
                    {service.service_categories?.name || service.category_id}
                  </span>
                  <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 text-emerald-600 fill-current" />
                    <span className="text-sm font-bold text-emerald-700">4.5</span>
                    <span className="text-sm text-gray-600">(0 reviews)</span>
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                  {service.title}
                </h1>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span className="text-lg">{service.location}</span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About this experience</h2>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {service.description}
                </p>
              </div>

              {/* Vendor Info */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Provided by</h2>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-emerald-700">
                      {service.vendors?.business_name?.charAt(0) || 'V'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{service.vendors?.business_name || 'Vendor'}</h3>
                    <p className="text-gray-600">Professional tour operator</p>
                  </div>
                </div>
              </div>

              {/* Highlights */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Highlights</h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Professional guided experience</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Free cancellation up to 24 hours before</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">All equipment and materials included</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-6 h-6 text-emerald-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">Small group size for personalized attention</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-sm text-gray-600">From</span>
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(service.price, service.currency)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">per person</p>
              </div>

              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-semibold text-lg transition-colors mb-4">
                Check availability
              </button>

              <button className="w-full border-2 border-gray-300 hover:border-gray-400 text-gray-700 py-3 rounded-xl font-semibold transition-colors mb-6">
                Contact vendor
              </button>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-bold text-gray-900 mb-4">What's included</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-emerald-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Professional guide
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-emerald-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    All fees and taxes
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-emerald-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Insurance coverage
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FlightCardProps {
  flight: any
  formatCurrency: (amount: number, currency: string) => string
}

function FlightCard({ flight, formatCurrency }: Omit<FlightCardProps, 'onClick'>) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <Link to={`/flights/${flight.id}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100 cursor-pointer">
        {/* Flight Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="text-2xl mr-2">✈️</span>
              <div>
                <div className="font-bold text-lg">{flight.flight_number}</div>
                <div className="text-blue-100 text-sm">{flight.airline}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Duration</div>
              <div className="font-semibold">{formatDuration(flight.duration_minutes)}</div>
            </div>
          </div>
        </div>

        {/* Flight Details */}
        <div className="p-4">
          {/* Route */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <div className="font-bold text-lg">{flight.departure_city}</div>
              <div className="text-sm text-gray-500">{flight.departure_airport}</div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                {formatDateTime(flight.departure_time)}
              </div>
            </div>
            <div className="flex-1 mx-4 relative">
              <div className="border-t-2 border-dashed border-gray-300 relative">
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-white border-2 border-gray-300 rounded-full p-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{flight.arrival_city}</div>
              <div className="text-sm text-gray-500">{flight.arrival_airport}</div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                {formatDateTime(flight.arrival_time)}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Economy</span>
              <span className="font-bold text-lg text-gray-900">
                {formatCurrency(flight.economy_price, flight.currency)}
              </span>
            </div>
            {flight.business_price && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Business</span>
                <span className="font-semibold text-gray-700">
                  {formatCurrency(flight.business_price, flight.currency)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
              <span>{flight.available_seats} seats available</span>
              <span>{flight.aircraft_type}</span>
            </div>
          </div>

          {/* Amenities */}
          {flight.amenities && flight.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {flight.amenities.slice(0, 3).map((amenity: string, index: number) => (
                <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {amenity}
                </span>
              ))}
              {flight.amenities.length > 3 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  +{flight.amenities.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}