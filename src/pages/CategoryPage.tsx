import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, MapPin, Star, SlidersHorizontal, Hotel, Map, Car, Utensils,
  Target, Plane, ShoppingBag, Package, X, ArrowLeft, Compass
} from 'lucide-react'
import { formatCurrency, getDisplayPrice } from '../lib/utils'
import { usePreferences } from '../contexts/PreferencesContext'
import { useServices } from '../hooks/hook'
import { getServiceAverageRating } from '../lib/database'
import SaveToCartHeartButton from '../components/SaveToCartHeartButton'
import type { Service } from '../types'

export default function CategoryPage() {
  const navigate = useNavigate()
  const { category } = useParams<{ category: string }>()
  const [searchParams] = useSearchParams()
  const { services: allServices, loading } = useServices(undefined, { includeExpired: false })
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
  const [sortBy, setSortBy] = useState('recommended')
  const [priceRange, setPriceRange] = useState([0, 100000000])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')
  const prefillCheckIn = searchParams.get('checkIn') || ''
  const prefillCheckOut = searchParams.get('checkOut') || ''
  const prefillGuests = Number(searchParams.get('guests') || '1')

  const categoryMapping: { [key: string]: string } = {
    'hotels': 'cat_hotels',
    'tours': 'cat_tour_packages',
    'restaurants': 'cat_restaurants',
    'transport': 'cat_transport',
    'activities': 'cat_activities',
    'events': 'cat_activities',
    'flights': 'cat_flights',
    'shops': 'cat_shops'
  }

  const categoryNames: { [key: string]: string } = {
    'hotels': 'Stays',
    'tours': 'Tours',
    'restaurants': 'Restaurants',
    'transport': 'Transport',
    'activities': 'Events',
    'events': 'Events',
    'flights': 'Flights',
    'shops': 'Shops',
    'services': 'All Services'
  }

  const getCategoryFilters = () => {
    if (category === 'services') {
      return [
        { key: 'all', label: 'All' },
        { key: 'flights', label: 'Flights' },
        { key: 'hotels', label: 'Stays' },
        { key: 'tours', label: 'Tours' },
        { key: 'restaurants', label: 'Restaurants' },
        { key: 'transport', label: 'Transport' },
        { key: 'events', label: 'Events' },
        { key: 'shops', label: 'Shops' }
      ]
    } else if (category && categoryMapping[category]) {
      const categoryId = categoryMapping[category]
      switch (categoryId) {
        case 'cat_flights':
          return [
            { key: 'all', label: 'All Flights' },
            { key: 'domestic', label: 'Domestic' },
            { key: 'international', label: 'International' },
            { key: 'business', label: 'Business' },
            { key: 'economy', label: 'Economy' }
          ]
        case 'cat_hotels':
          return [
            { key: 'all', label: 'All Stays' },
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
            { key: 'local', label: 'Local' },
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
            { key: 'all', label: 'All Events' },
            { key: 'outdoor', label: 'Outdoor' },
            { key: 'indoor', label: 'Indoor' },
            { key: 'water', label: 'Water Sports' },
            { key: 'cultural', label: 'Cultural' }
          ]
        case 'cat_shops':
          return [
            { key: 'all', label: 'All Shops' },
            { key: 'crafts', label: 'Crafts & Art' },
            { key: 'souvenirs', label: 'Souvenirs' },
            { key: 'clothing', label: 'Clothing' },
            { key: 'food', label: 'Food & Produce' }
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
      if (category && category !== 'all' && category !== 'services') {
        const targetCategoryId = categoryMapping[category]
        if (targetCategoryId) {
          filtered = allServices.filter(service => service.category_id === targetCategoryId)
        }
      }
      filtered = filtered.filter(service => {
        return service.status === 'approved' &&
          (!service.vendors || service.vendors.status !== 'suspended')
      })
      setFilteredServices(filtered)
    }
  }, [allServices, category])

  useEffect(() => {
    setSelectedCategoryFilter('all')
  }, [category])

  const { t, selectedCurrency } = usePreferences()

  const containsKeyword = (text: string | undefined, keywords: string[]): boolean => {
    if (!text) return false
    const lowerText = text.toLowerCase()
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))
  }

  const matchesSubFilter = (service: Service, filterKey: string, categoryId: string): boolean => {
    if (filterKey === 'all') return true
    const title = service.title?.toLowerCase() || ''
    const description = service.description?.toLowerCase() || ''
    const combined = `${title} ${description}`

    switch (categoryId) {
      case 'cat_tour_packages':
        switch (filterKey) {
          case 'daytrip':
            return (service.duration_days !== undefined && service.duration_days <= 1) ||
              (service.duration_hours !== undefined && service.duration_hours <= 24 && !service.duration_days)
          case 'multiday':
            return service.duration_days !== undefined && service.duration_days > 1
          case 'adventure':
            return service.difficulty_level === 'challenging' || service.difficulty_level === 'difficult' ||
              containsKeyword(combined, ['adventure', 'hiking', 'trekking', 'climbing', 'safari', 'gorilla', 'wildlife', 'rafting', 'bungee', 'extreme'])
          case 'cultural':
            return containsKeyword(combined, ['cultural', 'heritage', 'history', 'traditional', 'village', 'community', 'tribal', 'museum', 'craft', 'dance', 'ceremony'])
          default: return true
        }
      case 'cat_hotels':
        switch (filterKey) {
          case 'budget':
            return (service.star_rating !== undefined && service.star_rating <= 2) ||
              containsKeyword(service.property_type, ['budget', 'hostel', 'guesthouse', 'backpacker'])
          case 'midrange':
            return service.star_rating !== undefined && service.star_rating >= 3 && service.star_rating <= 4
          case 'luxury':
            return (service.star_rating !== undefined && service.star_rating >= 5) ||
              containsKeyword(service.property_type, ['luxury', 'boutique', '5-star', 'five star'])
          case 'resort':
            return containsKeyword(service.property_type, ['resort', 'lodge', 'safari lodge', 'beach resort'])
          default: return true
        }
      case 'cat_transport': {
        const vehicleType = service.vehicle_type?.toLowerCase() || ''
        switch (filterKey) {
          case 'taxi': return containsKeyword(vehicleType, ['taxi', 'cab'])
          case 'bus': return containsKeyword(vehicleType, ['bus', 'coach', 'coaster'])
          case 'private': return containsKeyword(vehicleType, ['private', 'car', 'suv', 'sedan', 'land cruiser', '4x4', 'jeep'])
          case 'shuttle': return containsKeyword(vehicleType, ['shuttle', 'van', 'minibus', 'transfer'])
          default: return true
        }
      }
      case 'cat_restaurants': {
        const cuisineType = service.cuisine_type?.toLowerCase() || ''
        const atmosphere = service.restaurant_atmosphere?.toLowerCase() || ''
        switch (filterKey) {
          case 'local': return containsKeyword(cuisineType, ['local', 'ugandan', 'african', 'east african', 'traditional', 'native'])
          case 'international': return containsKeyword(cuisineType, ['international', 'western', 'italian', 'indian', 'chinese', 'continental', 'fusion', 'american', 'european'])
          case 'fine': return containsKeyword(atmosphere, ['fine', 'upscale', 'elegant', 'formal']) || containsKeyword(service.price_range, ['high', 'expensive', 'fine'])
          case 'casual': return containsKeyword(atmosphere, ['casual', 'relaxed', 'informal', 'family']) || containsKeyword(service.price_range, ['low', 'moderate', 'casual', 'budget'])
          default: return true
        }
      }
      case 'cat_activities': {
        const eventType = service.event_type?.toLowerCase() || ''
        switch (filterKey) {
          case 'outdoor': return containsKeyword(eventType, ['outdoor']) || containsKeyword(combined, ['outdoor', 'hiking', 'camping', 'nature', 'park', 'garden', 'forest', 'mountain', 'lake', 'river'])
          case 'indoor': return containsKeyword(eventType, ['indoor']) || containsKeyword(combined, ['indoor', 'museum', 'gallery', 'theater', 'cinema', 'spa', 'gym', 'workshop', 'class'])
          case 'water': return containsKeyword(combined, ['water', 'swimming', 'diving', 'snorkeling', 'kayak', 'boat', 'cruise', 'rafting', 'fishing', 'beach', 'lake', 'river', 'pool'])
          case 'cultural': return containsKeyword(eventType, ['cultural']) || containsKeyword(combined, ['cultural', 'music', 'dance', 'art', 'traditional', 'heritage', 'festival', 'performance', 'exhibit'])
          default: return true
        }
      }
      case 'cat_shops':
        switch (filterKey) {
          case 'crafts': return containsKeyword(combined, ['craft', 'art', 'handmade', 'artisan', 'pottery', 'painting', 'sculpture', 'woodwork', 'basket', 'weaving'])
          case 'souvenirs': return containsKeyword(combined, ['souvenir', 'gift', 'memento', 'keepsake', 'trinket', 'curio', 'collectible'])
          case 'clothing': return containsKeyword(combined, ['clothing', 'fashion', 'apparel', 'wear', 'fabric', 'textile', 'kitenge', 'gomesi', 'traditional dress'])
          case 'food': return containsKeyword(combined, ['food', 'grocery', 'produce', 'market', 'spice', 'coffee', 'tea', 'organic', 'fresh', 'farm'])
          default: return true
        }
      case 'cat_flights':
        switch (filterKey) {
          case 'domestic': return containsKeyword(combined, ['domestic', 'local', 'internal', 'uganda'])
          case 'international': return containsKeyword(combined, ['international', 'abroad', 'overseas'])
          case 'business': return containsKeyword(combined, ['business class', 'business', 'premium'])
          case 'economy': return containsKeyword(combined, ['economy', 'standard', 'basic'])
          default: return true
        }
      default: return true
    }
  }

  const searchFilteredServices = filteredServices.filter(service => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (service.vendors?.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesPrice = service.price >= priceRange[0] && service.price <= priceRange[1]
    let matchesCategoryFilter = true
    if (category === 'services') {
      matchesCategoryFilter = selectedCategoryFilter === 'all' ||
        service.category_id === categoryMapping[selectedCategoryFilter]
    } else if (category && categoryMapping[category]) {
      const categoryId = categoryMapping[category]
      matchesCategoryFilter = matchesSubFilter(service, selectedCategoryFilter, categoryId)
    }
    return matchesSearch && matchesPrice && matchesCategoryFilter
  })

  const sortedServices = [...searchFilteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price
      case 'price-high': return b.price - a.price
      default: return 0
    }
  })

  const sortOptions = [
    { value: 'recommended', label: 'Top picks' },
    { value: 'price-low', label: 'Price: low' },
    { value: 'price-high', label: 'Price: high' },
    { value: 'rating', label: 'Review score' },
  ]

  const FilterPanel = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Filter results</h2>
        <button
          onClick={() => { setPriceRange([0, 100000000]); setSelectedCategoryFilter('all') }}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Clear all
        </button>
      </div>

      {/* Search context from hero (Fix #2) */}
      {(prefillCheckIn || prefillGuests > 1) && (
        <div className="bg-emerald-50 rounded-lg px-3 py-2.5 text-xs text-emerald-800 space-y-1">
          {prefillCheckIn && (
            <p><span className="font-semibold">Check-in:</span> {prefillCheckIn}{prefillCheckOut ? ` → ${prefillCheckOut}` : ''}</p>
          )}
          {prefillGuests > 1 && (
            <p><span className="font-semibold">Guests:</span> {prefillGuests}</p>
          )}
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Price range ({selectedCurrency || 'UGX'})
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            value={priceRange[0] || ''}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
          />
          <span className="text-gray-300 text-sm flex-shrink-0">—</span>
          <input
            type="number"
            placeholder="Max"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            value={priceRange[1] === 100000000 ? '' : priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 100000000])}
          />
        </div>
      </div>

      {/* Sub-category type */}
      {categoryFilters.length > 1 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Type</h3>
          <div className="space-y-2.5">
            {categoryFilters.map(filter => (
              <label key={filter.key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="category-filter"
                  checked={selectedCategoryFilter === filter.key}
                  onChange={() => setSelectedCategoryFilter(filter.key)}
                  className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  {filter.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Location */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Location</h3>
        <div className="space-y-2.5">
          {['All locations', 'Kampala', 'Jinja', 'Entebbe', 'Murchison Falls', 'Bwindi', 'Queen Elizabeth'].map(loc => (
            <label key={loc} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                defaultChecked={loc === 'All locations'}
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{loc}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Mobile sort */}
      <div className="lg:hidden">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sort by</h3>
        <div className="space-y-2.5">
          {sortOptions.map(opt => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="sort-mobile"
                checked={sortBy === opt.value}
                onChange={() => setSortBy(opt.value)}
                className="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sticky refinement bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-shrink-0 p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`lg:hidden flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all flex-shrink-0 ${
              showFilters
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Mobile filter panel */}
        {showFilters && (
          <div className="lg:hidden bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <FilterPanel />
          </div>
        )}

        <div className="flex gap-6 items-start">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-32 bg-white rounded-xl border border-gray-200 p-5">
              <FilterPanel />
            </div>
          </aside>

          {/* Results column */}
          <div className="flex-1 min-w-0">

            {/* Result count + sort */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <p className="text-sm text-gray-600">
                {loading ? (
                  <span className="inline-block w-24 h-4 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="font-semibold text-gray-900">{sortedServices.length}</span>
                    {' '}{categoryName.toLowerCase()} found
                  </>
                )}
              </p>

              {/* Desktop sort pills */}
              <div className="hidden sm:flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-medium">Sort:</span>
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      sortBy === opt.value
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tours: custom safari CTA */}
            {category === 'tours' && (
              <Link
                to="/create-safari"
                className="flex items-center gap-4 bg-emerald-700 hover:bg-emerald-800 rounded-xl p-4 mb-4 transition-colors group"
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Compass className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">Plan a custom safari</p>
                  <p className="text-emerald-200 text-xs mt-0.5">Tell us where you want to go and we will design the trip</p>
                </div>
                <span className="text-white/70 text-xs font-medium group-hover:text-white transition-colors flex-shrink-0">
                  Get started →
                </span>
              </Link>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                    <div className="w-44 sm:w-52 bg-gray-200 flex-shrink-0 min-h-[180px]" />
                    <div className="flex-1 p-5 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                      <div className="mt-auto pt-4 flex justify-between items-end">
                        <div className="h-6 bg-gray-200 rounded w-24" />
                        <div className="h-9 bg-gray-200 rounded w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center bg-white rounded-xl border border-gray-200 py-16 px-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500 text-sm max-w-xs">Try adjusting your search or filters to find what you are looking for</p>
                {(searchQuery || selectedCategoryFilter !== 'all') && (
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategoryFilter('all') }}
                    className="mt-5 px-5 py-2.5 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedServices.map(service => (
                  <HorizontalServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ServiceCardProps {
  service: Service
}

function HorizontalServiceCard({ service }: ServiceCardProps) {
  const [rating, setRating] = useState<number>(0)
  const [reviewCount, setReviewCount] = useState<number>(0)
  const imageUrl = service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'

  useEffect(() => {
    getServiceAverageRating(service.id)
      .then(data => { setRating(data.average || 0); setReviewCount(data.count || 0) })
      .catch(() => { setRating(0); setReviewCount(0) })
  }, [service.id])

  const getCategoryBadge = () => {
    switch (service.category_id) {
      case 'cat_hotels': return { label: 'Stay', Icon: Hotel }
      case 'cat_tour_packages': return { label: 'Tour', Icon: Map }
      case 'cat_transport': return { label: 'Transport', Icon: Car }
      case 'cat_restaurants': return { label: 'Restaurant', Icon: Utensils }
      case 'cat_activities': return { label: 'Event', Icon: Target }
      case 'cat_flights': return { label: 'Flight', Icon: Plane }
      case 'cat_shops': return { label: 'Shop', Icon: ShoppingBag }
      default: return { label: 'Service', Icon: Package }
    }
  }

  const getUnitLabel = () => {
    switch (service.category_id) {
      case 'cat_transport': return 'per day'
      case 'cat_hotels': return 'per night'
      case 'cat_shops': return 'per item'
      case 'cat_restaurants': return 'per meal'
      case 'cat_activities': return 'per ticket'
      case 'cat_tour_packages': return 'per guest'
      default: return 'per person'
    }
  }

  const getReviewLabel = (score: number) => {
    if (score >= 4.5) return 'Exceptional'
    if (score >= 4.0) return 'Excellent'
    if (score >= 3.5) return 'Very good'
    if (score >= 3.0) return 'Good'
    return 'Reviewed'
  }

  const { label, Icon } = getCategoryBadge()
  const price = getDisplayPrice(service, service.ticket_types)

  return (
    <Link
      to={`/service/${service.slug || service.id}`}
      className="group flex flex-row bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative w-36 sm:w-44 md:w-52 flex-shrink-0 min-h-[180px] bg-gray-100">
        <img
          src={imageUrl}
          alt={service.title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
          <Icon className="h-3 w-3 text-gray-600" />
          <span className="text-[10px] font-semibold text-gray-700">{label}</span>
        </div>
        <SaveToCartHeartButton
          service={service}
          ticketTypes={service.ticket_types}
          className="absolute top-2 right-2 p-2 bg-white/95 hover:bg-white rounded-full shadow-sm transition-colors"
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between min-w-0">
        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
            {service.title}
          </h3>

          {service.location && (
            <div className="flex items-center gap-1 text-gray-500">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="text-xs truncate">{service.location}</span>
            </div>
          )}

          {service.vendors?.business_name && (
            <p className="text-xs text-gray-400 truncate">{service.vendors.business_name}</p>
          )}

          {rating > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                <Star className="h-2.5 w-2.5 fill-white" />
                <span>{rating.toFixed(1)}</span>
              </div>
              <span className="text-xs font-medium text-gray-700">{getReviewLabel(rating)}</span>
              {reviewCount > 0 && (
                <span className="text-xs text-gray-400">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-end justify-between gap-3 mt-4 pt-3 border-t border-gray-100">
          <div>
            <span className="text-xs text-gray-400">From</span>
            <div className="text-lg font-bold text-gray-900 leading-tight">
              {formatCurrency(price, service.currency)}
            </div>
            <span className="text-xs text-gray-400">{getUnitLabel()}</span>
          </div>
          <span className="flex-shrink-0 bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
            See availability
          </span>
        </div>
      </div>
    </Link>
  )
}
