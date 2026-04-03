import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { format } from 'date-fns'
import { Search, MapPin, Calendar, Users, Hotel, Map, Car, Utensils, ShoppingBag, Target, Minus, Plus, Loader2, SlidersHorizontal, LayoutGrid, ChevronDown } from 'lucide-react'
import { usePreferences } from '../contexts/PreferencesContext'
import { supabase } from '../lib/supabaseClient'

interface Location {
  id: number
  title: string
}

interface LambulaSearchBarProps {
  className?: string
  onCategoryChange?: (category: string) => void
  onLocationChange?: (location: string) => void
  onDatesChange?: (dates: { checkIn: string; checkOut: string }) => void
  activeCategory?: string
}

// Map service types to category slugs
const SERVICE_TAB_MAP: Record<string, string> = {
  'hotels': 'cat_hotels',
  'tours': 'cat_tour_packages',
  'transport': 'cat_transport',
  'events': 'cat_activities',
  'restaurants': 'cat_restaurants',
  'shops': 'cat_shops'
}

// Category configurations - which fields to show
const CATEGORY_CONFIG: Record<string, { showDates: boolean; showGuests: boolean; dateLabel: string; guestsLabel: string }> = {
  'all': { showDates: false, showGuests: false, dateLabel: '', guestsLabel: '' },
  'hotels': { showDates: true, showGuests: true, dateLabel: 'Check In - Out', guestsLabel: 'Guests' },
  'tours': { showDates: true, showGuests: true, dateLabel: 'From - To', guestsLabel: 'Guests' },
  'transport': { showDates: true, showGuests: true, dateLabel: 'From - To', guestsLabel: 'Passengers' },
  'events': { showDates: true, showGuests: false, dateLabel: 'Date', guestsLabel: '' },
  'restaurants': { showDates: false, showGuests: true, dateLabel: '', guestsLabel: 'Party Size' },
  'shops': { showDates: false, showGuests: false, dateLabel: '', guestsLabel: '' }
}

// Price ranges for filtering
const PRICE_RANGES = [
  { id: 'budget', label: 'Budget', min: 0, max: 50000 },
  { id: 'moderate', label: 'Moderate', min: 50000, max: 200000 },
  { id: 'premium', label: 'Premium', min: 200000, max: 500000 },
  { id: 'luxury', label: 'Luxury', min: 500000, max: 999999999 }
]

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { id: 'easy', label: 'Easy' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'challenging', label: 'Challenging' },
  { id: 'difficult', label: 'Difficult' }
]

export default function LambulaSearchBar({ className = '', onCategoryChange, onLocationChange, onDatesChange, activeCategory }: LambulaSearchBarProps) {
  const navigate = useNavigate()
  const { t } = usePreferences()
  const [activeTab, setActiveTab] = useState('all')
  const [locationQuery, setLocationQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  // Date objects for react-datepicker
  const [checkInDate, setCheckInDate] = useState<Date | null>(null)
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null)
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [showGuestDropdown, setShowGuestDropdown] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 })
  const [showFilters, setShowFilters] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  
  // Dynamic filters from DB
  const [amenities, setAmenities] = useState<string[]>([])
  const [facilities, setFacilities] = useState<string[]>([])
  const [activityTypes, setActivityTypes] = useState<string[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('')
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('')
  const [selectedActivityType, setSelectedActivityType] = useState<string>('')
  const [duration, setDuration] = useState<string>('')
  
  const locationRef = useRef<HTMLDivElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const guestRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Get current category config
  const categoryConfig = CATEGORY_CONFIG[activeTab] || CATEGORY_CONFIG['all']
  
  // Debug log
  console.log('=== Date picker config ===')
  console.log('activeTab:', activeTab)
  console.log('categoryConfig:', categoryConfig)
  console.log('showDates:', categoryConfig.showDates)

  // Sync activeTab with activeCategory prop
  useEffect(() => {
    if (activeCategory) {
      // Find the tab ID that matches the category slug
      const matchingTab = Object.entries(SERVICE_TAB_MAP).find(([_, slug]) => slug === activeCategory)
      if (matchingTab) {
        setActiveTab(matchingTab[0])
      } else if (activeCategory === 'all') {
        setActiveTab('all')
      }
    }
  }, [activeCategory])

  // Fetch unique locations from services (filtered by active tab/category)
  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true)
      try {
        let query = supabase
          .from('services')
          .select('location, event_location, meeting_point')
          .eq('status', 'approved')
        
        // Filter by category if not 'all' tab
        if (activeTab !== 'all') {
          const categorySlug = SERVICE_TAB_MAP[activeTab]
          if (categorySlug) {
            query = query.eq('category_id', categorySlug)
          }
        }
        
        const { data, error } = await query
        
        if (error) {
          console.error('Error fetching locations:', error)
          // Fallback to basic locations
          setLocations([
            { id: 0, title: 'Kampala' },
            { id: 1, title: 'Entebbe' },
            { id: 2, title: 'Jinja' },
            { id: 3, title: 'Mbarara' },
            { id: 4, title: 'Fort Portal' },
            { id: 5, title: 'Kabale' },
            { id: 6, title: 'Lake Bunyonyi' },
            { id: 7, title: 'Kisoro' },
            { id: 8, title: 'Mukono' },
            { id: 9, title: 'Wakiso' },
            { id: 10, title: 'Muyenga' },
            { id: 11, title: 'Namugongo' }
          ])
          return
        }
        
        // Extract unique locations from all location fields and sort alphabetically
        if (data && data.length > 0) {
          const allLocations = data.flatMap(s => [
            s.location,
            s.event_location,
            s.meeting_point
          ].filter(Boolean) as string[])
          
          const uniqueLocations = [...new Set(allLocations)]
            .filter(loc => loc && loc.trim() !== '')
            .sort((a, b) => a.localeCompare(b))
          
          setLocations(uniqueLocations.map((loc, idx) => ({ id: idx, title: loc })))
        } else {
          // Fallback if no data
          setLocations([
            { id: 0, title: 'Kampala' },
            { id: 1, title: 'Entebbe' },
            { id: 2, title: 'Jinja' },
            { id: 3, title: 'Mbarara' },
            { id: 4, title: 'Fort Portal' },
            { id: 5, title: 'Kabale' },
            { id: 6, title: 'Lake Bunyonyi' },
            { id: 7, title: 'Kisoro' },
            { id: 8, title: 'Mukono' },
            { id: 9, title: 'Wakiso' },
            { id: 10, title: 'Muyenga' },
            { id: 11, title: 'Namugongo' }
          ])
        }
      } catch (error) {
        console.error('Error fetching locations:', error)
        // Fallback to basic locations
        setLocations([
          { id: 0, title: 'Kampala' },
          { id: 1, title: 'Entebbe' },
          { id: 2, title: 'Jinja' },
          { id: 3, title: 'Mbarara' },
          { id: 4, title: 'Fort Portal' },
          { id: 5, title: 'Kabale' },
          { id: 6, title: 'Lake Bunyonyi' },
          { id: 7, title: 'Kisoro' },
          { id: 8, title: 'Mukono' },
          { id: 9, title: 'Wakiso' },
          { id: 10, title: 'Muyenga' },
          { id: 11, title: 'Namugongo' }
        ])
      } finally {
        setLoadingLocations(false)
      }
    }
    
    fetchLocations()
  }, [activeTab])

  // Fetch filter options based on category
  useEffect(() => {
    const fetchFilterOptions = async () => {
      const categorySlug = SERVICE_TAB_MAP[activeTab]
      
      try {
        // Fetch amenities, facilities, and activity types from services
        const { data, error } = await supabase
          .from('services')
          .select('amenities, facilities, activity_type, difficulty_level, price')
          .eq('status', 'approved')
          .eq('category_id', categorySlug)
        
        if (error) throw error
        
        if (data) {
          // Extract unique amenities
          const allAmenities = data
            .flatMap(s => s.amenities || [])
            .filter(Boolean) as string[]
          setAmenities([...new Set(allAmenities)].sort())
          
          // Extract unique facilities
          const allFacilities = data
            .flatMap(s => s.facilities || [])
            .filter(Boolean) as string[]
          setFacilities([...new Set(allFacilities)].sort())
          
          // Extract unique activity types
          const allActivityTypes = data
            .map(s => s.activity_type)
            .filter(Boolean) as string[]
          setActivityTypes([...new Set(allActivityTypes)].sort())
        }
      } catch (error) {
        console.error('Error fetching filter options:', error)
      }
    }
    
    fetchFilterOptions()
  }, [activeTab])

  // Filter locations based on query
  const filteredLocations = locationQuery 
    ? locations.filter(loc => loc.title.toLowerCase().includes(locationQuery.toLowerCase()))
    : locations

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false)
      }
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
        setShowGuestDropdown(false)
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format date for display
  const formatDateDisplay = () => {
    if (checkIn && checkOut) {
      const startDate = new Date(checkIn)
      const endDate = new Date(checkOut)
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
      return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`
    }
    if (checkIn) {
      const date = new Date(checkIn)
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
      return date.toLocaleDateString('en-US', options)
    }
    return ''
  }

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    // If onCategoryChange callback is provided, stay on current page (home page filtering)
    if (onCategoryChange) {
      // If there's a location selected via dropdown OR typed query, pass it to onLocationChange
      if (selectedLocation && onLocationChange) {
        onLocationChange(selectedLocation.title)
      } else if (!selectedLocation && locationQuery && onLocationChange) {
        onLocationChange(locationQuery)
      }
      // Stay on current page - filtering is handled by callbacks
      return
    }
    
    // For services page or when no callbacks provided, navigate with all params
    const params = new URLSearchParams()
    
    // Add category filter based on active tab
    const categorySlug = SERVICE_TAB_MAP[activeTab]
    if (categorySlug) {
      params.set('category', categorySlug)
    }
    
    // Add location
    if (selectedLocation) {
      params.set('location', selectedLocation.title)
    } else if (locationQuery) {
      params.set('location', locationQuery)
    }
    
    // Add dates
    if (checkIn) {
      params.set('start', checkIn)
    }
    if (checkOut) {
      params.set('end', checkOut)
    }
    
    // Add guests (only for categories that need them)
    if (categoryConfig.showGuests) {
      if (adults > 1) {
        params.set('adults', adults.toString())
      }
      if (children > 0) {
        params.set('children', children.toString())
      }
    }
    
    // Add advanced filters
    if (selectedAmenities.length > 0) {
      params.set('amenities', selectedAmenities.join(','))
    }
    if (selectedFacilities.length > 0) {
      params.set('facilities', selectedFacilities.join(','))
    }
    if (selectedDifficulty) {
      params.set('difficulty', selectedDifficulty)
    }
    if (selectedPriceRange) {
      const range = PRICE_RANGES.find(r => r.id === selectedPriceRange)
      if (range) {
        params.set('min_price', range.min.toString())
        params.set('max_price', range.max.toString())
      }
    }
    if (selectedActivityType) {
      params.set('activity_type', selectedActivityType)
    }
    if (duration) {
      params.set('duration', duration)
    }
    
    // Navigate to services page with search params
    navigate(`/services?${params.toString()}`)
  }

  // Toggle amenity selection
  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    )
  }

  // Toggle facility selection
  const toggleFacility = (facility: string) => {
    setSelectedFacilities(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedAmenities([])
    setSelectedFacilities([])
    setSelectedDifficulty('')
    setSelectedPriceRange('')
    setSelectedActivityType('')
    setDuration('')
  }

  // Count active filters
  const activeFilterCount = [
    selectedAmenities.length > 0,
    selectedFacilities.length > 0,
    selectedDifficulty !== '',
    selectedPriceRange !== '',
    selectedActivityType !== '',
    duration !== ''
  ].filter(Boolean).length

  // Handle location selection
  const handleLocationSelect = (location: Location, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('=== handleLocationSelect (dropdown) ===')
    console.log('Location:', location)
    setSelectedLocation(location)
    setLocationQuery(location.title)
    setShowLocationDropdown(false)
    // Report location change to parent for immediate filtering
    if (onLocationChange) {
      console.log('Calling onLocationChange with:', location.title)
      onLocationChange(location.title)
    }
  }

  // Toggle location dropdown
  const toggleLocationDropdown = () => {
    setShowLocationDropdown(!showLocationDropdown)
  }

  // Handle react-datepicker date range selection
  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setCheckInDate(start)
    setCheckOutDate(end)
    if (start) {
      setCheckIn(format(start, 'yyyy-MM-dd'))
    } else {
      setCheckIn('')
    }
    if (end) {
      setCheckOut(format(end, 'yyyy-MM-dd'))
      // Both dates selected - notify parent component
      if (onDatesChange) {
        onDatesChange({ 
          checkIn: format(start!, 'yyyy-MM-dd'), 
          checkOut: format(end, 'yyyy-MM-dd') 
        })
      }
    } else {
      setCheckOut('')
    }
  }

  // Toggle date picker and calculate position
  const toggleDatePicker = () => {
    console.log('=== toggleDatePicker called ===')
    console.log('showDatePicker:', showDatePicker)
    if (!showDatePicker && dateInputRef.current) {
      const rect = dateInputRef.current.getBoundingClientRect()
      console.log('Date input rect:', rect)
      // Open upward to avoid being cut off at bottom
      setDatePickerPosition({
        top: rect.top + window.scrollY - 10,
        left: rect.left + window.scrollX
      })
    }
    setShowDatePicker(!showDatePicker)
  }

  // Service tabs configuration
  const tabs = [
    { id: 'all', label: t('all') || 'All', icon: LayoutGrid },
    { id: 'hotels', label: t('stays') || 'Stays', icon: Hotel },
    { id: 'tours', label: t('tours') || 'Tours', icon: Map },
    { id: 'transport', label: t('transport') || 'Transport', icon: Car },
    { id: 'events', label: t('events') || 'Events', icon: Target },
    { id: 'restaurants', label: t('dining') || 'Dining', icon: Utensils },
    { id: 'shops', label: t('shops') || 'Shops', icon: ShoppingBag }
  ]

  // Handle tab click - update category filter or navigate
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    setLocationQuery('')
    setSelectedLocation(null)
    setShowLocationDropdown(false)
    const categorySlug = SERVICE_TAB_MAP[tabId]
    
    // If onCategoryChange callback is provided, use it (stay on home page)
    if (onCategoryChange) {
      // For "all" tab, pass 'all' which will show all services
      onCategoryChange(tabId === 'all' ? 'all' : (categorySlug || tabId))
    } else {
      // Otherwise navigate to services page
      if (tabId === 'all') {
        navigate('/services')
      } else if (categorySlug) {
        navigate(`/services?category=${categorySlug}`)
      }
    }
  }

  return (
    <div className={`lambula-search-bar ${className}`}>
      {/* Service Tabs */}
      <ul className="nav-tabs flex items-center justify-center gap-1 mb-4">
        {tabs.map((tab) => (
          <li key={tab.id} className="nav-item">
            <button
              type="button"
              className={`nav-link flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all rounded-full ${
                activeTab === tab.id
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white/20 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => handleTabClick(tab.id)}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Search Form */}
      <form className="bravo_form" onSubmit={handleSearch}>
        <div className="g-field-search">
          <div className="flex flex-col md:flex-row bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Location Field - Always shown */}
            <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-gray-100 relative">
              <div className="flex items-start gap-3" ref={locationRef}>
                <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="flex-1 w-full relative">
                    <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-500">{t('location') || 'Location'}</label>
                    <button 
                      type="button"
                      onClick={toggleLocationDropdown}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 -mr-1"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  <input
                    ref={locationInputRef}
                    type="text"
                    className="w-full text-gray-900 placeholder-gray-400 focus:outline-none text-sm bg-transparent"
                    placeholder={t('where_are_you_going') || 'Where are you going?'}
                    value={selectedLocation ? selectedLocation.title : locationQuery}
                    onChange={(e) => {
                      setSelectedLocation(null)
                      setLocationQuery(e.target.value)
                      // Keep dropdown open
                      if (!showLocationDropdown) {
                        setShowLocationDropdown(true)
                      }
                    }}
                    onFocus={() => {
                      if (!showLocationDropdown) {
                        setShowLocationDropdown(true)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        // If there's a typed query but no selection, trigger search with query
                        if (locationQuery && !selectedLocation && onLocationChange) {
                          onLocationChange(locationQuery)
                          setShowLocationDropdown(false)
                        }
                      }
                    }}
                    onClick={() => {
                      // On click, if there's a typed query, treat it as location selection
                      if (locationQuery && !selectedLocation && onLocationChange) {
                        onLocationChange(locationQuery)
                      }
                    }}
                  />
                  
                  {/* Location Dropdown */}
                  {showLocationDropdown && (
                    <div 
                      className="smart-search-dropdown"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        zIndex: 99999,
                        maxHeight: '240px',
                        overflowY: 'auto'
                      }}
                    >
                      <ul style={{ listStyle: 'none', padding: '8px 0', margin: 0 }}>
                        {loadingLocations ? (
                          <li style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                            <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '14px' }}>Loading...</span>
                          </li>
                        ) : filteredLocations.length > 0 ? (
                          filteredLocations.map((location) => (
                            <li
                              key={location.id}
                              style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                              onClick={(e) => handleLocationSelect(location, e)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin style={{ width: '16px', height: '16px', color: '#9ca3af', flexShrink: 0 }} />
                                <span style={{ fontSize: '14px', color: '#374151' }}>{location.title}</span>
                              </div>
                            </li>
                          ))
                        ) : (
                          <li style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                            No locations found
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date Field - Only for certain categories */}
            {categoryConfig.showDates && (
              <div 
                className="flex-1 p-4 border-b md:border-b-0 md:border-r border-gray-100 relative" 
                ref={datePickerRef}
                onClick={() => {
                  console.log('Date field div clicked!')
                  toggleDatePicker()
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {categoryConfig.dateLabel}
                    </label>
                    <input
                      ref={dateInputRef}
                      type="text"
                      className="w-full text-gray-900 placeholder-gray-400 focus:outline-none text-sm bg-transparent cursor-pointer"
                      placeholder={t('select_dates') || 'Select dates'}
                      value={formatDateDisplay()}
                      readOnly
                    />
                  </div>
                </div>
                
                {/* Date Picker - Rendered via Portal to appear above modals */}
                {showDatePicker && createPortal(
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    style={{
                      position: 'fixed',
                      top: `${datePickerPosition.top}px`,
                      left: `${datePickerPosition.left}px`,
                      zIndex: 99998,
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      width: 'auto',
                      maxWidth: '100vw'
                    }}
                  >
                    {activeTab === 'events' ? (
                      // Single date picker for events
                      <DatePicker
                        selected={checkInDate}
                        onChange={(date: Date | null) => {
                          if (date) {
                            setCheckInDate(date)
                            setCheckIn(format(date, 'yyyy-MM-dd'))
                          }
                          setShowDatePicker(false)
                        }}
                        minDate={new Date()}
                        inline
                        monthsShown={1}
                      />
                    ) : (
                      // Date range picker for other categories
                      <DatePicker
                        selected={checkInDate}
                        startDate={checkInDate}
                        endDate={checkOutDate}
                        onChange={handleDateRangeChange}
                        minDate={new Date()}
                        selectsRange
                        monthsShown={2}
                        inline
                        showPopperArrow={false}
                        popperPlacement="bottom-start"
                        forceShowMonthNavigation={true}
                      />
                    )}
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        style={{ padding: '8px 16px', fontSize: '14px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                          setCheckIn('')
                          setCheckOut('')
                          setCheckInDate(null)
                          setCheckOutDate(null)
                          setShowDatePicker(false)
                        }}
                      >
                        {t('clear') || 'Clear'}
                      </button>
                      <button
                        type="button"
                        style={{ padding: '8px 16px', fontSize: '14px', color: '#fff', background: '#10b981', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        onClick={() => setShowDatePicker(false)}
                      >
                        {t('apply') || 'Apply'}
                      </button>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            )}

            {/* Guests Field - Only for certain categories */}
            {categoryConfig.showGuests && (
              <div className="flex-1 p-4 relative" ref={guestRef}>
                <div 
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                >
                  <Users className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">{categoryConfig.guestsLabel}</label>
                    <div className="render text-sm text-gray-900">
                      <span className="adults-render">{adults} {t('adult') || 'Adult'}{adults > 1 ? 's' : ''}</span>
                      {children > 0 && (
                        <span className="text-gray-400 mx-1">-</span>
                      )}
                      {children > 0 && (
                        <span className="children-render">{children} {t('child') || 'Child'}{children > 1 ? 'ren' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Guests Dropdown */}
                {showGuestDropdown && (
                  <div className="dropdown-menu absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                    {/* Adults */}
                    <div className="guest-selector flex items-center justify-between mb-4">
                      <div className="label font-medium text-gray-900">{t('adults') || 'Adults'}</div>
                      <div className="val flex items-center gap-2">
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (adults > 1) setAdults(adults - 1)
                          }}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          name="adults"
                          value={adults}
                          min={1}
                          max={20}
                          className="w-12 text-center py-1 border border-gray-200 rounded-lg"
                          onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (adults < 20) setAdults(adults + 1)
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Children - only for hotels, tours, transport */}
                    {(activeTab === 'hotels' || activeTab === 'tours' || activeTab === 'transport') && (
                      <div className="guest-selector flex items-center justify-between">
                        <div className="label font-medium text-gray-900">{t('children') || 'Children'}</div>
                        <div className="val flex items-center gap-2">
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (children > 0) setChildren(children - 1)
                            }}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            name="children"
                            value={children}
                            min={0}
                            max={20}
                            className="w-12 text-center py-1 border border-gray-200 rounded-lg"
                            onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (children < 20) setChildren(children + 1)
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Search Button */}
            <div className="g-button-submit p-2 flex items-center gap-2">
              {/* Advanced Filters Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setShowFilters(!showFilters)
                }}
                className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-colors relative"
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span className="hidden sm:inline">{t('filters') || 'Filters'}</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Search Button */}
              <button
                type="submit"
                className="btn-search flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Search className="w-5 h-5" />
                <span>{t('search') || 'Search'}</span>
              </button>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 z-50 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t('advanced_filters') || 'Advanced Filters'}</h3>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    {t('clear_all') || 'Clear All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('price_range') || 'Price Range'}
                    </label>
                    <div className="space-y-2">
                      {PRICE_RANGES.map(range => (
                        <label key={range.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="priceRange"
                            value={range.id}
                            checked={selectedPriceRange === range.id}
                            onChange={(e) => setSelectedPriceRange(e.target.value)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-600">{range.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('difficulty') || 'Difficulty Level'}
                    </label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">{t('any') || 'Any'}</option>
                      {DIFFICULTY_LEVELS.map(level => (
                        <option key={level.id} value={level.id}>{level.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('duration') || 'Duration'}
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">{t('any') || 'Any'}</option>
                      <option value="half_day">{t('half_day') || 'Half Day'}</option>
                      <option value="full_day">{t('full_day') || 'Full Day'}</option>
                      <option value="1_3_days">{t('1_3_days') || '1-3 Days'}</option>
                      <option value="4_7_days">{t('4_7_days') || '4-7 Days'}</option>
                      <option value="week_plus">{t('week_plus') || 'Week+'}</option>
                    </select>
                  </div>

                  {/* Activity Type */}
                  {activityTypes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('activity_type') || 'Activity Type'}
                      </label>
                      <select
                        value={selectedActivityType}
                        onChange={(e) => setSelectedActivityType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">{t('any') || 'Any'}</option>
                        {activityTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Amenities */}
                {amenities.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('amenities') || 'Amenities'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {amenities.slice(0, 12).map(amenity => (
                        <button
                          key={amenity}
                          onClick={() => toggleAmenity(amenity)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            selectedAmenities.includes(amenity)
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {amenity}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facilities */}
                {facilities.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('facilities') || 'Facilities'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {facilities.slice(0, 12).map(facility => (
                        <button
                          key={facility}
                          onClick={() => toggleFacility(facility)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            selectedFacilities.includes(facility)
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {facility}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
