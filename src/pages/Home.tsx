import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Search, MapPin, Star, Heart, MapPin as MapPinIcon, Hotel, Map, Car, Utensils, Target, Plane, ShoppingBag, Package, ChevronDown, Check, Filter } from 'lucide-react'
import { getServiceCategories } from '../lib/database'
import { useServices } from '../hooks/hook'
import type { Service } from '../types'

export default function Home() {
  const [heroMediaList, setHeroMediaList] = useState<Array<{ url: string; type: 'image' | 'video' }>>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const slideInterval = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true) // Start with autoplay enabled
  const [categories, setCategories] = useState<Array<{id: string, name: string, icon?: React.ComponentType<any>}>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all'])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const navigate = useNavigate()

  // Use the reactive useServices hook
  const { services: allServices, loading: servicesLoading } = useServices()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.category-dropdown')) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen])

  // Combined loading state
  const isLoading = servicesLoading

  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === 'all') {
      setSelectedCategories(['all'])
    } else {
      setSelectedCategories(prev => {
        if (prev.includes('all')) {
          // If 'all' was selected, replace it with the specific category
          return [categoryId]
        } else if (prev.includes(categoryId)) {
          // Remove the category if it's already selected
          const newSelection = prev.filter(id => id !== categoryId)
          // If no categories selected, default to 'all'
          return newSelection.length === 0 ? ['all'] : newSelection
        } else {
          // Add the category
          return [...prev, categoryId]
        }
      })
    }
  }

  // Function to count services per category
  const getCategoryCounts = () => {
    const counts: { [key: string]: number } = {}
    
    // Initialize counts for all categories
    categories.forEach(cat => {
      counts[cat.id] = 0
    })
    
    // Count services for each category
    allServices.forEach(service => {
      const categoryId = service.category_id || service.service_categories?.id
      if (categoryId && counts.hasOwnProperty(categoryId)) {
        counts[categoryId]++
      }
    })
    
    return counts
  }

  const categoryCounts = getCategoryCounts()


  useEffect(() => {
    fetchCategories()
    fetchHeroMediaList()
    
    // Try to enable autoplay and handle any browser restrictions
    const ensureAutoPlay = () => {
      setAutoPlayEnabled(true)
      // Try to play any current video after a short delay to ensure DOM is ready
      setTimeout(() => {
        if (videoRef.current) {
          const playPromise = videoRef.current.play()
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Autoplay failed, will retry on slide change
            })
          }
        }
      }, 100)
    }
    
    // Try autoplay after a brief delay to ensure component is mounted
    setTimeout(ensureAutoPlay, 500)
    
    // Also listen for user interactions as fallback
    const handleUserInteraction = () => {
      ensureAutoPlay()
    }
    
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)
    
    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [])

  // Fetch all active hero images/videos from DB
  const fetchHeroMediaList = async () => {
    const { data } = await supabase
      .from('hero_videos')
      .select('url, type')
      .eq('is_active', true)
      .order('order', { ascending: true })
    if (data) setHeroMediaList(data)
  }

  // Carousel effect for hero media
  useEffect(() => {
    if (heroMediaList.length < 2) return

    // Clear any existing interval
    if (slideInterval.current) {
      clearInterval(slideInterval.current)
      slideInterval.current = null
    }

    const currentMedia = heroMediaList[currentSlide]
    if (currentMedia?.type === 'video') {
      // For videos, don't set interval - wait for video to end
      // The video end handler will advance to next slide
      return
    } else {
      // For images, use timer that creates continuous video-like flow
      slideInterval.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % heroMediaList.length)
      }, 1500) // Faster transitions for more continuous feel
    }

    // Cleanup function
    return () => {
      if (slideInterval.current) {
        clearInterval(slideInterval.current)
        slideInterval.current = null
      }
    }
  }, [heroMediaList, currentSlide])

  // Handle video end to move to next slide
  useEffect(() => {
    const currentMedia = heroMediaList[currentSlide]
    if (currentMedia?.type === 'video' && videoRef.current) {
      const video = videoRef.current
      const onEnded = () => {
        setCurrentSlide(prev => (prev + 1) % heroMediaList.length)
      }
      video.addEventListener('ended', onEnded)
      return () => {
        video.removeEventListener('ended', onEnded)
      }
    }
  }, [currentSlide, heroMediaList])

  // Periodic retry for autoplay if it failed initially
  useEffect(() => {
    if (!autoPlayEnabled) return
    
    const retryInterval = setInterval(() => {
      const currentMedia = heroMediaList[currentSlide]
      if (currentMedia?.type === 'video' && videoRef.current && videoRef.current.paused) {
        const playPromise = videoRef.current.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Still failing, will keep retrying
          })
        }
      }
    }, 2000) // Retry every 2 seconds
    
    return () => clearInterval(retryInterval)
  }, [currentSlide, heroMediaList, autoPlayEnabled])

  // Ensure video plays when slide changes to video
  useEffect(() => {
    const currentMedia = heroMediaList[currentSlide]
    if (currentMedia?.type === 'video' && videoRef.current) {
      const video = videoRef.current
      video.currentTime = 0
      
      // Try to play with a small delay to ensure video is ready
      setTimeout(() => {
        const playPromise = video.play()
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Video autoplay failed on slide change, will retry on user interaction:', error)
            // Will be retried when user interacts with page
          })
        }
      }, 100)
    }
  }, [currentSlide, heroMediaList])

  const fetchCategories = async () => {
    try {
      const dbCategories = await getServiceCategories()
      // Filter out flights category
      const filteredCategories = dbCategories.filter(cat => cat.id !== 'cat_flights')
      // Sort categories in custom order: Accommodation, Transport, Tours, Restaurants, Shops, Events
      const sortedCategories = filteredCategories.sort((a, b) => {
        const order: { [key: string]: number } = {
          'cat_hotels': 0,        // Accommodation
          'cat_transport': 1,     // Transport
          'cat_tour_packages': 2, // Tours
          'cat_restaurants': 3,   // Restaurants
          'cat_shops': 4,         // Shops
          'cat_activities': 5     // Events
        }
        const aPriority = order[a.id] ?? 6
        const bPriority = order[b.id] ?? 6
        return aPriority - bPriority
      })
      
      // Add "All" category at the beginning
      const allCategories = [
        { id: 'all', name: 'All', icon: Map },
        ...sortedCategories.map(cat => ({
          id: cat.id,
          name: cat.id === 'cat_activities' ? 'Events' : cat.id === 'cat_hotels' ? 'Accommodation' : cat.name,
          icon: cat.icon || MapPinIcon
        }))
      ]
      setCategories(allCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Fallback to basic categories if database fetch fails (also filter out flights)
      setCategories([
        { id: 'all', name: 'All', icon: Map },
        { id: 'cat_hotels', name: 'Accommodation', icon: Hotel },
        { id: 'cat_tour_packages', name: 'Tours', icon: Map },
        { id: 'cat_transport', name: 'Transport', icon: Car },
        { id: 'cat_restaurants', name: 'Food', icon: Utensils },
        { id: 'cat_activities', name: 'Events', icon: Target },
        { id: 'cat_shops', name: 'Shops', icon: ShoppingBag }
      ])
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    try {
      // Validate currency code - only allow known valid codes
      const validCurrencies = ['UGX', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'RWF'];
      const safeCurrency = validCurrencies.includes(currency) ? currency : 'UGX';
      
      return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: safeCurrency,
        minimumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      // Fallback to simple formatting if Intl.NumberFormat fails
      console.warn('Currency formatting failed for:', currency, 'falling back to UGX');
      return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0
      }).format(amount);
    }
  }

  const filteredServices = allServices.filter((service: Service) => {
    // First check if service is approved and vendor is not suspended
    // Temporarily show all services for debugging
    const isApproved = true; // service.status === 'approved' && 
                      // (!service.vendors || service.vendors.status !== 'suspended')

    const matchesSearch = !searchQuery || (() => {
      const query = searchQuery.toLowerCase();

      // Helper function to safely check if a string contains the query
      const containsQuery = (text: string | undefined | null): boolean => {
        return text ? text.toLowerCase().includes(query) : false;
      };

      // Helper function to safely check if an array contains items that include the query
      const arrayContainsQuery = (arr: string[] | undefined | null): boolean => {
        return arr ? arr.some(item => item.toLowerCase().includes(query)) : false;
      };

      // Search through all relevant fields - prioritize basic fields
      let result = containsQuery(service.title) ||
             containsQuery(service.description) ||
             containsQuery(service.location) ||
             containsQuery(service.vendors?.business_name) ||
             containsQuery(service.service_categories?.name);

      // Debug: Log which basic field matched
      if (searchQuery && result) {
        console.log('Search match found for query:', searchQuery, 'in service:', service.title);
        if (containsQuery(service.title)) console.log('  - Match in TITLE');
        if (containsQuery(service.description)) console.log('  - Match in DESCRIPTION');
        if (containsQuery(service.location)) console.log('  - Match in LOCATION');
        if (containsQuery(service.vendors?.business_name)) console.log('  - Match in VENDOR NAME');
        if (containsQuery(service.service_categories?.name)) console.log('  - Match in CATEGORY NAME');
      }

      // If no match in basic fields, check additional fields and category synonyms
      if (!result) {
        result = arrayContainsQuery(service.amenities) ||
                 arrayContainsQuery(service.facilities) ||
                 arrayContainsQuery(service.room_amenities) ||
                 arrayContainsQuery(service.nearby_attractions) ||
                 arrayContainsQuery(service.itinerary) ||
                 arrayContainsQuery(service.included_items) ||
                 arrayContainsQuery(service.tour_highlights) ||
                 arrayContainsQuery(service.room_types) ||
                 arrayContainsQuery(service.languages_offered) ||
                 containsQuery(service.property_type) ||
                 containsQuery(service.cuisine_type) ||
                 containsQuery(service.difficulty_level) ||
                 containsQuery(service.vehicle_type) ||
                 containsQuery(service.best_time_to_visit) ||
                 arrayContainsQuery(service.what_to_bring) ||
                 arrayContainsQuery(service.accessibility_features) ||
                 // Category synonyms and common search terms
                 (query.includes('accommodation') && service.category_id === 'cat_hotels') ||
                 (query.includes('hotel') && service.category_id === 'cat_hotels') ||
                 (query.includes('stay') && service.category_id === 'cat_hotels') ||
                 (query.includes('lodging') && service.category_id === 'cat_hotels') ||
                 (query.includes('transport') && service.category_id === 'cat_transport') ||
                 (query.includes('travel') && service.category_id === 'cat_transport') ||
                 (query.includes('ride') && service.category_id === 'cat_transport') ||
                 (query.includes('car') && service.category_id === 'cat_transport') ||
                 (query.includes('shop') && service.category_id === 'cat_shops') ||
                 (query.includes('shopping') && service.category_id === 'cat_shops') ||
                 (query.includes('store') && service.category_id === 'cat_shops') ||
                 (query.includes('restaurant') && service.category_id === 'cat_restaurants') ||
                 (query.includes('food') && service.category_id === 'cat_restaurants') ||
                 (query.includes('eat') && service.category_id === 'cat_restaurants') ||
                 (query.includes('dining') && service.category_id === 'cat_restaurants') ||
                 (query.includes('flight') && service.category_id === 'cat_flights') ||
                 (query.includes('plane') && service.category_id === 'cat_flights') ||
                 (query.includes('air') && service.category_id === 'cat_flights') ||
                 (query.includes('tour') && service.category_id === 'cat_tour_packages') ||
                 (query.includes('safari') && service.category_id === 'cat_tour_packages') ||
                 (query.includes('activity') && service.category_id === 'cat_activities') ||
                 (query.includes('event') && service.category_id === 'cat_activities') ||
                 (query.includes('experience') && service.category_id === 'cat_activities');

        // Debug: Log which additional field matched
        if (searchQuery && result) {
          console.log('Match in ADDITIONAL FIELD or CATEGORY SYNONYM for query:', searchQuery, 'service:', service.title);
        }
      }

      return result;
    })()

    const matchesCategory = selectedCategories.includes('all') ||
                           selectedCategories.includes(service.category_id || '')

    // If there's a search query, ignore category filter; otherwise apply category filter
    const shouldInclude = isApproved && (searchQuery ? matchesSearch : (matchesSearch && matchesCategory))

    return shouldInclude;
  })

  // Debug: Log filtering results
  useEffect(() => {
    if (searchQuery) {
      console.log('Search query:', searchQuery, 'Total services:', allServices.length, 'Filtered services:', filteredServices.length);
    }
  }, [searchQuery, filteredServices.length, allServices.length]);

  const currentItems = filteredServices
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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative min-h-[300px] md:min-h-[500px] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700">
        <div className="absolute inset-0 bg-black/30"></div>
        {heroMediaList.length > 0 && (
          heroMediaList.map((media, idx) => (
            <div
              key={media.url}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${currentSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              {media.type === 'video' ? (
                <video
                  ref={currentSlide === idx ? videoRef : undefined}
                  src={media.url}
                  autoPlay={autoPlayEnabled}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.6 }}
                  key={currentSlide === idx ? media.url : undefined}
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${media.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    width: '100%',
                    height: '100%',
                    opacity: 0.2
                  }}
                ></div>
              )}
            </div>
          ))
        )}
        
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 z-20">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 text-center text-heading">
            Xplore Uganda
          </h1>
          <p className="text-xl text-white/90 mb-8 text-center max-w-2xl text-elegant">
            One way to all Your Travel Needs ....
          </p>
        </div>
      </div>

      {/* Fixed Search Bar - Always Visible */}
      <div className="fixed top-16 left-0 right-0 z-[60] w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-4">
          <div className="w-full max-w-4xl mx-auto bg-white rounded-full shadow-2xl p-2 relative">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center px-4">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <input
                  type="text"
                  placeholder="I want ..."
                  className="w-full py-2 md:py-3 text-gray-900 placeholder-gray-500 focus:outline-none text-base md:text-lg"
                  value={searchQuery}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    console.log('Search input changed:', newValue);
                    setSearchQuery(newValue);
                  }}
                />
              </div>
              {/* Filter Dropdown Trigger */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="category-dropdown flex items-center gap-2 bg-gray-700 hover:bg-gray-900 text-white px-4 md:px-6 py-2 md:py-4 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-xs md:text-sm"
                  title="Filter services by category - click to select multiple categories"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedCategories.includes('all')
                      ? 'All Listings'
                      : selectedCategories.length === 1
                        ? categories.find(cat => cat.id === selectedCategories[0])?.name || 'Filter'
                        : `${selectedCategories.length} Selected`}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="category-dropdown absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-medium text-gray-900 text-xs">Choose Your Travel Needs</h3>
                      <p className="text-xs text-gray-500">Select one or more of choice</p>
                    </div>

                    {/* Categories List */}
                    <div className="max-h-60 overflow-y-auto">
                      {/* All Categories Option */}
                      <button
                        onClick={() => {
                          setSelectedCategories(['all'])
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          selectedCategories.includes('all') ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            selectedCategories.includes('all')
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedCategories.includes('all') && (
                              <Check className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          <span className={`text-sm ${selectedCategories.includes('all') ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                            Show All Travel Needs ({allServices.length})
                          </span>
                        </div>
                      </button>

                      {/* Individual Categories */}
                      {categories.slice(1).map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id)}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                            selectedCategories.includes(category.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                              selectedCategories.includes(category.id)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedCategories.includes(category.id) && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
                            </div>
                            <span className={`text-sm ${selectedCategories.includes(category.id) ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                              {category.name} ({categoryCounts[category.id] || 0})
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {selectedCategories.includes('all') ? 'All Listings' : `${selectedCategories.length} selected`}
                        </span>
                        <button
                          onClick={() => setIsDropdownOpen(false)}
                          className="text-xs text-blue-600 font-medium hover:text-blue-700"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed search bar */}
      <div className="h-4"></div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 md:pb-12">

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : selectedCategories.includes('all')
                  ? 'Eveything Safari'
                  : selectedCategories.length === 1
                    ? categories.find(cat => cat.id === selectedCategories[0])?.name || selectedCategories[0]
                    : `${selectedCategories.length} categories selected`}
            </h2>
            <p className="text-gray-600">
              {currentItemCount} {searchQuery ? 'result' : 'Listing'}{currentItemCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentItems.map((service: Service) => (
              <ServiceCard 
                key={service.id} 
                service={service}
                formatCurrency={formatCurrency}
                onClick={() => navigate(`/service/${service.slug || service.id}`)}
              />
            ))}
          </div>
        )}

        {!isLoading && currentItemCount === 0 && (
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

  const imageUrl = service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'

  // Helper function to render icons (handles both string and component icons)
  const renderIcon = (icon: any, className: string = "h-4 w-4") => {
    if (typeof icon === 'string') {
      return <span className={className}>{icon}</span>
    }
    if (typeof icon === 'function') {
      const IconComponent = icon
      return <IconComponent className={className} />
    }
    return null
  }

  // Get category-specific information
  const getCategoryInfo = () => {
    switch (service.category_id) {
      case 'cat_hotels':
        return {
          icon: Hotel,
          label: 'Accommodation',
          primaryInfo: service.duration_hours ? `${service.duration_hours} nights` : 'Accommodation',
          secondaryInfo: service.max_capacity ? `Up to ${service.max_capacity} guests` : null,
          priceUnit: 'per day'
        }
      case 'cat_tour_packages':
        return {
          icon: Map,
          label: 'Tour Package',
          primaryInfo: service.duration_hours ? `${service.duration_hours}h tour` : 'Full day tour',
          secondaryInfo: service.max_capacity ? `Max ${service.max_capacity} people` : null,
          priceUnit: 'per person'
        }
      case 'cat_transport':
        return {
          icon: Car,
          label: 'Transport',
          primaryInfo: service.duration_hours ? `${service.duration_hours}h rental` : 'Vehicle rental',
          secondaryInfo: service.max_capacity ? `Seats ${service.max_capacity}` : null,
          priceUnit: 'per day'
        }
      case 'cat_restaurants':
        return {
          icon: Utensils,
          label: 'Restaurant',
          primaryInfo: 'Dining experience',
          secondaryInfo: service.max_capacity ? `Capacity ${service.max_capacity}` : null,
          priceUnit: 'per meal'
        }
      case 'cat_activities':
        return {
          icon: Target,
          label: 'Activity',
          primaryInfo: service.duration_hours ? `${service.duration_hours}h activity` : 'Adventure',
          secondaryInfo: service.max_capacity ? `Group size ${service.max_capacity}` : null,
          priceUnit: 'per ticket'
        }
      case 'cat_flights':
        return {
          icon: Plane,
          label: 'Flight',
          primaryInfo: service.flight_number ? `${service.flight_number} - ${service.airline || 'Airline'}` : 'Flight booking',
          secondaryInfo: service.departure_city && service.arrival_city ? `${service.departure_city} → ${service.arrival_city}` : null,
          priceUnit: 'per person'
        }
      case 'cat_shops':
        return {
          icon: ShoppingBag,
          label: 'Shop',
          primaryInfo: 'Retail shopping',
          secondaryInfo: service.max_capacity ? `Store capacity ${service.max_capacity}` : null,
          priceUnit: 'per item'
        }
      default:
        return {
          icon: Package,
          label: 'Service',
          primaryInfo: 'Experience',
          secondaryInfo: null,
          priceUnit: 'per person'
        }
    }
  }

  const categoryInfo = getCategoryInfo()

  return (
    <div
      onClick={onClick}
      className="group block cursor-pointer"
    >
      <div className="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-100 h-full flex flex-col">
        {/* Image Container */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
              {renderIcon(categoryInfo.icon, "h-4 w-4")}
              <span className="text-xs font-semibold text-gray-800">{categoryInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
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
            {/* Flight-specific details */}
            {service.category_id === 'cat_flights' && service.departure_time && service.arrival_time && (
              <div className="mt-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Dep: {new Date(service.departure_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>Arr: {new Date(service.arrival_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {service.aircraft_type && (
                  <div className="mt-1">Aircraft: {service.aircraft_type}</div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
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
            <span className="text-xs text-gray-500">{categoryInfo.priceUnit}</span>
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

  const imageUrl = service.images?.[0] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'

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
          src={imageUrl}
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

              {/* Flight Details */}
              {service.category_id === 'cat_flights' && (
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Flight Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Departure</h3>
                      <div className="space-y-1">
                        <p className="text-gray-700">{service.departure_city} ({service.departure_airport})</p>
                        <p className="text-gray-600">{service.departure_time ? new Date(service.departure_time).toLocaleString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'TBD'}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Arrival</h3>
                      <div className="space-y-1">
                        <p className="text-gray-700">{service.arrival_city} ({service.arrival_airport})</p>
                        <p className="text-gray-600">{service.arrival_time ? new Date(service.arrival_time).toLocaleString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'TBD'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {service.flight_number && (
                      <div>
                        <span className="text-sm text-gray-500">Flight Number</span>
                        <p className="font-semibold">{service.flight_number}</p>
                      </div>
                    )}
                    {service.airline && (
                      <div>
                        <span className="text-sm text-gray-500">Airline</span>
                        <p className="font-semibold">{service.airline}</p>
                      </div>
                    )}
                    {service.aircraft_type && (
                      <div>
                        <span className="text-sm text-gray-500">Aircraft</span>
                        <p className="font-semibold">{service.aircraft_type}</p>
                      </div>
                    )}
                    {service.duration_minutes && (
                      <div>
                        <span className="text-sm text-gray-500">Duration</span>
                        <p className="font-semibold">{Math.floor(service.duration_minutes / 60)}h {service.duration_minutes % 60}m</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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



