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

  // Map URL categories to database category IDs
  const categoryMapping: { [key: string]: string } = {
    'hotels': 'cat_hotel',
    'tours': 'cat_tour',
    'restaurants': 'cat_restaurant',
    'transport': 'cat_transport',
    'activities': 'cat_activity'
  }

  const categoryNames: { [key: string]: string } = {
    'hotels': 'Hotels',
    'tours': 'Tour Packages',
    'restaurants': 'Restaurants',
    'transport': 'Transport',
    'activities': 'Activities'
  }

  const categoryName = categoryNames[category || ''] || 'Services'

  useEffect(() => {
    if (allServices) {
      let filtered = allServices

      // Filter by category if specified
      if (category && category !== 'all') {
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
        // Vendor services need to be approved
        return service.status === 'approved'
      })

      setFilteredServices(filtered)
    }
  }, [allServices, category])

  const searchFilteredServices = filteredServices.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
                         (service.vendors?.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

    const matchesPrice = service.price >= priceRange[0] && service.price <= priceRange[1]

    return matchesSearch && matchesPrice
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
                placeholder={`Search ${categoryName.toLowerCase()}...`}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
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

  return (
    <Link to={`/service/${service.id}`} className="group">
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <div className="relative">
          <img
            src={imageUrl}
            alt={service.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 right-3 bg-white bg-opacity-90 rounded-full p-1">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">4.5</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          {service.location && (
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              {service.location}
            </div>
          )}

          <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
            {service.title}
          </h3>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {service.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              by {service.vendors?.business_name || 'Unknown Vendor'}
            </div>
            <div className="text-right">
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