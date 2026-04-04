import React from 'react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { format } from 'date-fns'
import { Search, MapPin, Users, Hotel, Map, Car, Utensils, ShoppingBag, Target, Minus, Plus, Loader2, LayoutGrid, ChevronDown } from 'lucide-react'
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
  const [showCheckInPicker, setShowCheckInPicker] = useState(false)
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false)
  const [checkInPickerPosition, setCheckInPickerPosition] = useState({ top: 0, left: 0 })
  const [checkOutPickerPosition, setCheckOutPickerPosition] = useState({ top: 0, left: 0 })

  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  

  
  const locationRef = useRef<HTMLDivElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const guestRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const checkInInputRef = useRef<HTMLInputElement>(null)
  const checkOutInputRef = useRef<HTMLInputElement>(null)

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
        setShowCheckInPicker(false)
        setShowCheckOutPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    
    // Navigate to services page with search params
    navigate(`/services?${params.toString()}`)
  }

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

  // Toggle check-in date picker
  const toggleCheckInPicker = () => {
    if (!showCheckInPicker && checkInInputRef.current) {
      const rect = checkInInputRef.current.getBoundingClientRect()
      setCheckInPickerPosition({
        top: rect.top + window.scrollY - 10,
        left: rect.left + window.scrollX
      })
    }
    setShowCheckInPicker(!showCheckInPicker)
    if (showCheckInPicker) setShowCheckOutPicker(false)
  }

  // Toggle check-out date picker
  const toggleCheckOutPicker = () => {
    if (!showCheckOutPicker && checkOutInputRef.current) {
      const rect = checkOutInputRef.current.getBoundingClientRect()
      setCheckOutPickerPosition({
        top: rect.top + window.scrollY - 10,
        left: rect.left + window.scrollX
      })
    }
    setShowCheckOutPicker(!showCheckOutPicker)
    if (showCheckOutPicker) setShowCheckInPicker(false)
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

            {/* Date Fields - Separate Check-in and Check-out like Airbnb */}
            {categoryConfig.showDates && (
              <div className="flex-1 flex border-b md:border-b-0 md:border-r border-gray-100">
                {/* Check-in Field */}
                <div 
                  className="flex-1 p-3 relative" 
                  ref={datePickerRef}
                  onClick={() => toggleCheckInPicker()}
                  style={{ cursor: 'pointer', borderRight: '1px solid #f3f4f6' }}
                >
                  <label className="block text-xs font-semibold text-gray-900 mb-0.5">
                    {activeTab === 'events' ? t('date') || 'Date' : t('check_in') || 'Check-in'}
                  </label>
                  <input
                    ref={checkInInputRef}
                    type="text"
                    className="w-full text-gray-500 placeholder-gray-400 focus:outline-none text-sm bg-transparent cursor-pointer"
                    placeholder={t('add_date') || 'Add date'}
                    value={checkIn ? format(new Date(checkIn), 'MMM d') : ''}
                    readOnly
                  />
                  
                  {/* Check-in Date Picker */}
                  {showCheckInPicker && createPortal(
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      style={{
                        position: 'fixed',
                        top: `${checkInPickerPosition.top}px`,
                        left: `${checkInPickerPosition.left}px`,
                        zIndex: 99998,
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                        padding: '12px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <DatePicker
                        selected={checkInDate}
                        onChange={(date: Date | null) => {
                          console.log('Check-in date selected:', date)
                          if (date) {
                            console.log('Setting checkIn to:', format(date, 'yyyy-MM-dd'))
                            setCheckInDate(date)
                            setCheckIn(format(date, 'yyyy-MM-dd'))
                            if (onDatesChange) {
                              onDatesChange({ checkIn: format(date, 'yyyy-MM-dd'), checkOut })
                            }
                            // Don't close the picker - let user see selection and choose check-out
                            // Auto-open check-out after selecting check-in
                            setTimeout(() => toggleCheckOutPicker(), 200)
                          }
                        }}
                        minDate={new Date()}
                        inline
                        monthsShown={1}
                        forceShowMonthNavigation={true}
                      />
                    </div>,
                    document.body
                  )}
                </div>

                {/* Check-out Field */}
                {activeTab !== 'events' && (
                  <div 
                    className="flex-1 p-3 relative"
                    onClick={() => toggleCheckOutPicker()}
                    style={{ cursor: 'pointer' }}
                  >
                    <label className="block text-xs font-semibold text-gray-900 mb-0.5">
                      {t('check_out') || 'Check-out'}
                    </label>
                    <input
                      ref={checkOutInputRef}
                      type="text"
                      className="w-full text-gray-500 placeholder-gray-400 focus:outline-none text-sm bg-transparent cursor-pointer"
                      placeholder={t('add_date') || 'Add date'}
                      value={checkOut ? format(new Date(checkOut), 'MMM d') : ''}
                      readOnly
                    />
                    
                    {/* Check-out Date Picker */}
                    {showCheckOutPicker && createPortal(
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        style={{
                          position: 'fixed',
                          top: `${checkOutPickerPosition.top}px`,
                          left: `${checkOutPickerPosition.left}px`,
                          zIndex: 99998,
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                          padding: '12px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <DatePicker
                          selected={checkOutDate}
                          onChange={(date: Date | null) => {
                            console.log('Check-out date selected:', date)
                            if (date) {
                              console.log('Setting checkOut to:', format(date, 'yyyy-MM-dd'))
                              setCheckOutDate(date)
                              setCheckOut(format(date, 'yyyy-MM-dd'))
                              if (onDatesChange && checkIn) {
                                onDatesChange({ checkIn, checkOut: format(date, 'yyyy-MM-dd') })
                              }
                            }
                            // Don't close the picker - let user see selection
                          }}
                          minDate={checkInDate || new Date()}
                          inline
                          monthsShown={1}
                          forceShowMonthNavigation={true}
                        />
                      </div>,
                      document.body
                    )}
                  </div>
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

                {/* Guests Dropdown - Modal Style */}
                {showGuestDropdown && (
                  <div 
                    className="fixed inset-0 bg-black/50 z-40"
                    style={{ zIndex: 99997 }}
                    onClick={() => setShowGuestDropdown(false)}
                  >
                    <div 
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-80"
                      onClick={(e) => e.stopPropagation()}
                    >
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


              {/* Search Button */}
              <button
                type="submit"
                className="btn-search flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Search className="w-5 h-5" />
                <span>{t('search') || 'Search'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

