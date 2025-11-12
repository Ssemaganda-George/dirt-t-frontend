import { useState, useEffect } from 'react'
import { Search, MapPin, Star, Heart } from 'lucide-react'

interface Service {
  id: string
  title: string
  description: string
  price: number
  currency: string
  images: string[]
  location: string
  vendor: string
  category: string
  reviews: number
  rating: number
}

const mockServices: Service[] = [
  {
    id: '1',
    title: 'Murchison Falls Safari',
    description: 'Experience the magnificent Murchison Falls and spot the Big Five on this unforgettable safari adventure.',
    price: 450000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'],
    location: 'Murchison Falls National Park',
    vendor: 'Uganda Safari Co.',
    category: 'Tours',
    reviews: 1847,
    rating: 4.8
  },
  {
    id: '2',
    title: 'Lake Victoria Hotel',
    description: 'Luxury waterfront accommodation with stunning views of Lake Victoria.',
    price: 320000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg'],
    location: 'Entebbe',
    vendor: 'Victoria Hotels',
    category: 'Hotels',
    reviews: 2156,
    rating: 4.6
  },
  {
    id: '3',
    title: 'Jinja White Water Rafting',
    description: 'Thrilling white water rafting experience on the source of the Nile River.',
    price: 285000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/2827374/pexels-photo-2827374.jpeg'],
    location: 'Jinja',
    vendor: 'Nile Adventures',
    category: 'Activities',
    reviews: 987,
    rating: 4.9
  },
  {
    id: '4',
    title: 'Kampala Cultural Restaurant',
    description: 'Authentic Ugandan cuisine in the heart of Kampala with traditional music and dance.',
    price: 75000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/1565982/pexels-photo-1565982.jpeg'],
    location: 'Kampala',
    vendor: 'Cultural Dining',
    category: 'Restaurants',
    reviews: 1432,
    rating: 4.7
  },
  {
    id: '5',
    title: 'Airport Transfer Service',
    description: 'Reliable and comfortable transport between Entebbe Airport and your destination.',
    price: 85000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg'],
    location: 'Entebbe - Kampala',
    vendor: 'Uganda Transfers',
    category: 'Transport',
    reviews: 756,
    rating: 4.5
  },
  {
    id: '6',
    title: 'Queen Elizabeth Park Lodge',
    description: 'Eco-friendly lodge overlooking the Kazinga Channel with game viewing opportunities.',
    price: 420000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/1134166/pexels-photo-1134166.jpeg'],
    location: 'Queen Elizabeth National Park',
    vendor: 'Eco Lodges Uganda',
    category: 'Hotels',
    reviews: 1623,
    rating: 4.8
  },
  {
    id: '7',
    title: 'Bwindi Gorilla Trekking',
    description: 'Once-in-a-lifetime mountain gorilla trekking experience in the impenetrable forest.',
    price: 1200000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/1661535/pexels-photo-1661535.jpeg'],
    location: 'Bwindi Impenetrable Forest',
    vendor: 'Gorilla Safaris Ltd',
    category: 'Tours',
    reviews: 2341,
    rating: 5.0
  },
  {
    id: '8',
    title: 'Serena Kigo Restaurant',
    description: 'Fine dining with panoramic lake views and international cuisine.',
    price: 120000,
    currency: 'UGX',
    images: ['https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg'],
    location: 'Kampala',
    vendor: 'Serena Hotels',
    category: 'Restaurants',
    reviews: 891,
    rating: 4.6
  }
]

export default function Home() {
  const [services, setServices] = useState<Service[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const categories = [
    { id: 'all', name: 'All', icon: '🌍' },
    { id: 'Hotels', name: 'Hotels', icon: '🏨' },
    { id: 'Tours', name: 'Tours', icon: '🗺️' },
    { id: 'Transport', name: 'Transport', icon: '🚗' },
    { id: 'Restaurants', name: 'Restaurants', icon: '🍽️' },
    { id: 'Activities', name: 'Activities', icon: '🎯' }
  ]

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      setServices(mockServices)
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency === 'UGX' ? 'UGX' : 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.vendor.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory

    return matchesSearch && matchesCategory
  })

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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[500px] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700">
        <div className="absolute inset-0 bg-black/30"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        ></div>
        
        <div className="relative h-full flex flex-col items-center justify-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 text-center">
            Explore Uganda
          </h1>
          <p className="text-xl text-white/90 mb-8 text-center max-w-2xl">
            Discover the Pearl of Africa with authentic experiences
          </p>
          
          {/* Search Box */}
          <div className="w-full max-w-4xl bg-white rounded-full shadow-2xl p-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="Where to?"
                  className="w-full py-3 text-gray-900 placeholder-gray-500 focus:outline-none text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-full font-semibold transition-colors whitespace-nowrap">
                Search
              </button>
            </div>
          </div>

          {/* Quick Categories */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {categories.slice(1).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="bg-white/90 hover:bg-white px-5 py-2 rounded-full text-gray-800 font-medium shadow-lg hover:shadow-xl transition-all"
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filter Tabs */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all border ${
                selectedCategory === category.id
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {selectedCategory === 'all' ? 'Explore Uganda' : selectedCategory}
            </h2>
            <p className="text-gray-600">
              {filteredServices.length} {filteredServices.length === 1 ? 'place' : 'places'}
            </p>
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard 
                key={service.id} 
                service={service}
                formatCurrency={formatCurrency}
                onClick={() => setSelectedService(service)}
              />
            ))}
          </div>
        )}

        {!loading && filteredServices.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
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
              {service.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Location & Rating */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-sm text-gray-600 flex-1 min-w-0">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{service.location}</span>
            </div>
            <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg ml-2">
              <Star className="h-4 w-4 text-emerald-600 fill-current flex-shrink-0" />
              <span className="text-sm font-bold text-emerald-700">{service.rating}</span>
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
            {service.reviews.toLocaleString()} reviews • {service.vendor}
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
                    {service.category}
                  </span>
                  <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 text-emerald-600 fill-current" />
                    <span className="text-sm font-bold text-emerald-700">{service.rating}</span>
                    <span className="text-sm text-gray-600">({service.reviews.toLocaleString()} reviews)</span>
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
                      {service.vendor.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{service.vendor}</h3>
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