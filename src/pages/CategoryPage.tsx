import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Search, MapPin, Star, SlidersHorizontal } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { Link } from 'react-router-dom'
import { useServices } from '../hooks/hook'
import type { Service } from '../types'

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>()
  const { services: allServices, loading } = useServices()
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recommended')
  const [priceRange, setPriceRange] = useState([0, 1000000])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')

  // Map URL categories to database category IDs
  const categoryMapping: { [key: string]: string } = {
    'hotels': 'cat_hotels',
    'tours': 'cat_tour_packages',
    'restaurants': 'cat_restaurants',
    'transport': 'cat_transport',
    'activities': 'cat_activities',
    'flights': 'cat_flights'
  }

  const categoryNames: { [key: string]: string } = {
    'hotels': 'Hotels',
    'tours': 'Tour Packages',
    'restaurants': 'Restaurants',
    'transport': 'Transport',
    'activities': 'Activities',
    'flights': 'Flights',
    'services': 'Services'
  }

  // Get dynamic category filters based on current category
  const getCategoryFilters = () => {
    if (category === 'services') {
      // On services page, show all category filters
      return [
        { key: 'all', label: 'All' },
        { key: 'flights', label: 'Flights' },
        { key: 'hotels', label: 'Hotels' },
        { key: 'tours', label: 'Tours' },
        { key: 'restaurants', label: 'Restaurants' },
        { key: 'transport', label: 'Transport' },
        { key: 'activities', label: 'Activities' }
      ]
    } else if (category && categoryMapping[category]) {
      // On specific category pages, show category-specific filters
      const categoryId = categoryMapping[category]
      switch (categoryId) {
        case 'cat_flights':
          return [
            { key: 'all', label: 'All Flights' },
            { key: 'domestic', label: 'Domestic' },
            { key: 'international', label: 'International' },
            { key: 'business', label: 'Business Class' },
            { key: 'economy', label: 'Economy' }
          ]
        case 'cat_hotels':
          return [
            { key: 'all', label: 'All Hotels' },
            { key: 'budget', label: 'Budget' },
            { key: 'midrange', label: 'Mid-range' },
            { key: 'luxury', label: 'Luxury' },
            { key: 'resort', label: 'Resort' }
          ]
        case 'cat_tour_packages':
          return [
            { key: 'all', label: 'All Tours' },
            { key: 'daytrip', label: 'Day Trips' },
            { key: 'multiday', label: 'Multi-day' },
            { key: 'adventure', label: 'Adventure' },
            { key: 'cultural', label: 'Cultural' }
          ]
        case 'cat_restaurants':
          return [
            { key: 'all', label: 'All Restaurants' },
            { key: 'local', label: 'Local Cuisine' },
            { key: 'international', label: 'International' },
            { key: 'fine', label: 'Fine Dining' },
            { key: 'casual', label: 'Casual' }
          ]
        case 'cat_transport':
          return [
            { key: 'all', label: 'All Transport' },
            { key: 'taxi', label: 'Taxi' },
            { key: 'bus', label: 'Bus' },
            { key: 'private', label: 'Private Car' },
            { key: 'shuttle', label: 'Shuttle' }
          ]
        case 'cat_activities':
          return [
            { key: 'all', label: 'All Activities' },
            { key: 'outdoor', label: 'Outdoor' },
            { key: 'indoor', label: 'Indoor' },
            { key: 'water', label: 'Water Sports' },
            { key: 'cultural', label: 'Cultural' }
          ]
        default:
          return [{ key: 'all', label: 'All' }]
      }
    }
    return [{ key: 'all', label: 'All' }]
  }

  const categoryFilters = getCategoryFilters()

  const categoryName = categoryNames[category || ''] || 'Services'

  useEffect(() => {
    if (allServices) {
      let filtered = allServices

      // Filter by category if specified (but not for 'services' which shows all)
      if (category && category !== 'all' && category !== 'services') {
        const targetCategoryId = categoryMapping[category]
        if (targetCategoryId) {
          filtered = allServices.filter(service => service.category_id === targetCategoryId)
        }
      }

      // Filter by approval status (only show approved services to tourists, admin services don't need approval)
      filtered = filtered.filter(service => {
        // Admin services don't require approval (no vendor info)
        if (!service.vendors) {
          return service.status !== 'inactive'
        }
        // Vendor services need to be approved and vendor not suspended
        return service.status === 'approved' && service.vendors.status !== 'suspended'
      })

      setFilteredServices(filtered)
    }
  }, [allServices, category])

  // Reset category filter when category changes
  useEffect(() => {
    setSelectedCategoryFilter('all')
  }, [category])

  const searchFilteredServices = filteredServices.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
                         (service.vendors?.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

    const matchesPrice = service.price >= priceRange[0] && service.price <= priceRange[1]

    // Filter by selected category filter
    let matchesCategoryFilter = true
    if (category === 'services') {
      // On services page: filter by main categories
      matchesCategoryFilter = selectedCategoryFilter === 'all' || 
                             service.category_id === categoryMapping[selectedCategoryFilter]
    } else {
      // On specific category pages: filter by sub-categories (for now, just 'all' works)
      matchesCategoryFilter = selectedCategoryFilter === 'all'
    }

    return matchesSearch && matchesPrice && matchesCategoryFilter
  })

  const sortedServices = [...searchFilteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'rating':
        return 0 // Would sort by actual rating
      default:
        return 0 // Recommended order
    }
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{categoryName} in Uganda</h1>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="I want ..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Category Filters for Mobile - Dynamic based on current category */}
            {category && categoryFilters.length > 1 && (
              <div className="md:hidden">
                <div className="flex gap-0.5 overflow-x-auto pb-0.5 scrollbar-hide">
                  {categoryFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setSelectedCategoryFilter(filter.key)}
                      className={`flex items-center px-1 py-0.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[24px] ${
                        selectedCategoryFilter === filter.key
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <select
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <SlidersHorizontal className="h-5 w-5 mr-2" />
                Filters
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range (UGX)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option>All locations</option>
                    <option>Kampala</option>
                    <option>Jinja</option>
                    <option>Entebbe</option>
                    <option>Murchison Falls</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option>Any rating</option>
                    <option>4+ stars</option>
                    <option>3+ stars</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {sortedServices.length} {categoryName.toLowerCase()} found
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}

        {!loading && sortedServices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface ServiceCardProps {
  service: Service
}

function ServiceCard({ service }: ServiceCardProps) {
  const imageUrl = service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'

  // Get category-specific information
  const getCategoryInfo = () => {
    switch (service.category_id) {
      case 'cat_hotels':
        return {
          icon: '🏨',
          label: 'Hotel',
          primaryInfo: service.duration_hours ? `${service.duration_hours} nights` : 'Accommodation',
          secondaryInfo: service.max_capacity ? `Up to ${service.max_capacity} guests` : null
        }
      case 'cat_tour_packages':
        return {
          icon: '🎒',
          label: 'Tour Package',
          primaryInfo: service.duration_hours ? `${service.duration_hours}h tour` : 'Full day tour',
          secondaryInfo: service.max_capacity ? `Max ${service.max_capacity} people` : null
        }
      case 'cat_transport':
        return {
          icon: '🚗',
          label: 'Transport',
          primaryInfo: service.duration_hours ? `${service.duration_hours}h rental` : 'Vehicle rental',
          secondaryInfo: service.max_capacity ? `Seats ${service.max_capacity}` : null
        }
      case 'cat_restaurants':
        return {
          icon: '🍽️',
          label: 'Restaurant',
          primaryInfo: 'Dining experience',
          secondaryInfo: service.max_capacity ? `Capacity ${service.max_capacity}` : null
        }
      case 'cat_activities':
        return {
          icon: '🎢',
          label: 'Activity',
          primaryInfo: service.duration_hours ? `${service.duration_hours}h activity` : 'Adventure',
          secondaryInfo: service.max_capacity ? `Group size ${service.max_capacity}` : null
        }
      case 'cat_flights':
        return {
          icon: '✈️',
          label: 'Flight',
          primaryInfo: service.duration_hours ? `${service.duration_hours}h flight` : 'Flight booking',
          secondaryInfo: service.max_capacity ? `Class: ${service.max_capacity}` : null
        }
      default:
        return {
          icon: '📦',
          label: 'Service',
          primaryInfo: 'Experience',
          secondaryInfo: null
        }
    }
  }

  const categoryInfo = getCategoryInfo()

  return (
    <Link to={`/service/${service.id}`} className="group">
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 h-full flex flex-col">
        {/* Image Container - Fixed height */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
              <span className="text-sm">{categoryInfo.icon}</span>
              <span className="text-xs font-semibold text-gray-800">{categoryInfo.label}</span>
            </div>
          </div>

          {/* Rating Badge */}
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              <Star className="h-3 w-3 fill-current" />
              <span>4.5</span>
            </div>
          </div>
        </div>

        {/* Content - Flexible height to maintain consistent card height */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Location */}
          {service.location && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{service.location}</span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2 min-h-[2.5rem]">
            {service.title}
          </h3>

          {/* Category-specific info */}
          <div className="mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <span>{categoryInfo.primaryInfo}</span>
            </div>
            {categoryInfo.secondaryInfo && (
              <div className="text-sm text-gray-600">
                {categoryInfo.secondaryInfo}
              </div>
            )}
          </div>

          {/* Description - Limited lines */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
            {service.description}
          </p>

          {/* Footer with vendor and price */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 truncate flex-1 min-w-0">
              by {service.vendors?.business_name || 'Vendor'}
            </div>
            <div className="text-right ml-2">
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(service.price, service.currency)}
              </div>
              <div className="text-xs text-gray-500">per person</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}