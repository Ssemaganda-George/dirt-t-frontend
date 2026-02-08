import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BarChart3, ShoppingBag, CreditCard, LogOut, Menu, X, MapPin, Map, ChevronLeft, MessageSquare, User, Settings, ChevronDown, Ticket, Search, Globe, ChevronRight, Eye, Calendar } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import PanelSearchModal from './PanelSearchModal'
import PreferencesModal from './PreferencesModal'
import { usePreferences } from '../contexts/PreferencesContext'

const navigation = [
  {
    category: 'Overview',
    items: [
      { name: 'My Dashboard', href: '/vendor', icon: BarChart3 },
      { name: 'Visitor Activity', href: '/vendor/visitor-activity', icon: Eye }
    ]
  },
  {
    category: 'Business Management',
    items: [
      { name: 'My Services', href: '/vendor/services', icon: ShoppingBag },
      { name: 'Events', href: '/vendor/events', icon: Calendar },
      { name: 'Availability', href: '/vendor/availability', icon: Calendar }
    ]
  },
  {
    category: 'Bookings & Orders',
    items: [
      { name: 'Bookings', href: '/vendor/bookings', icon: Map },
      { name: 'Tickets', href: '/vendor/tickets', icon: Ticket }
    ]
  },
  {
    category: 'Communication',
    items: [
      { name: 'Inquiries', href: '/vendor/inquiries', icon: MessageSquare },
      { name: 'Messages', href: '/vendor/messages', icon: MessageSquare }
    ]
  },
  {
    category: 'Finance',
    items: [
      { name: 'My Wallet', href: '/vendor/transactions', icon: CreditCard }
    ]
  }
]

export default function VendorLayout() {
  const { profile, signOut } = useAuth()
  const { selectedRegion, selectedCurrency } = usePreferences()
  const location = useLocation()
  const [showPreferences, setShowPreferences] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Overview', 'Business Management']))
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Global search keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setShowGlobalSearch(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getRegionShort = (code: string) => {
    const map: { [key: string]: string } = {
      'UG': 'UGA',
      'US': 'USA',
      'GB': 'GBR',
      'KE': 'KEN',
      'TZ': 'TZA',
      'RW': 'RWA',
      'ZA': 'ZAF',
      'NG': 'NGA',
      'GH': 'GHA',
      'CA-EN': 'CAN',
      'CA-FR': 'CAN',
      'AU': 'AUS',
      'FR': 'FRA',
      'DE': 'DEU',
      'ES': 'ESP',
      'IT': 'ITA',
      'IN': 'IND',
      'SG': 'SGP',
      'MY': 'MYS',
      'ID': 'IDN'
    }
    return map[code] || code
  }

  const handleSignOut = async () => {
    setShowLogoutConfirm(true)
  }

  const confirmSignOut = async () => {
    setShowLogoutConfirm(false)
    try {
      await signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const cancelSignOut = () => {
    setShowLogoutConfirm(false)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">DirtTrails</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((category) => (
              <div key={category.category} className="space-y-1">
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md group"
                >
                  <span className="font-semibold text-gray-900">{category.category}</span>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      expandedCategories.has(category.category) ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedCategories.has(category.category) && (
                  <div className="ml-4 space-y-1">
                    {category.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                            isActive ? 'bg-primary-100 text-primary-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            {!sidebarCollapsed && (
              <span className="text-xl font-bold text-gray-900">DirtTrails Business</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <MapPin className="h-8 w-8 text-primary-600" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((category) => (
              <div key={category.category} className="space-y-1">
                {!sidebarCollapsed && (
                  <button
                    onClick={() => toggleCategory(category.category)}
                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-none group"
                  >
                    <span className="font-semibold text-gray-900">{category.category}</span>
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        expandedCategories.has(category.category) ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                )}
                {sidebarCollapsed && (
                  <div className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">
                    {category.category.charAt(0)}
                  </div>
                )}
                {expandedCategories.has(category.category) && (
                  <div className={`${sidebarCollapsed ? 'space-y-2' : 'ml-4 space-y-1'}`}>
                    {category.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-none transition-colors ${
                            isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          title={sidebarCollapsed ? item.name : ''}
                        >
                          <item.icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 ${
                            isActive ? 'text-blue-200' : 'text-gray-400 group-hover:text-gray-500'
                          }`} />
                          {!sidebarCollapsed && item.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all  duration-300 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      }`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-600 lg:hidden">
              <Menu className="h-6 w-6" />
            </button>

            {/* Spacer to push account details to far right */}
            <div className="flex-1"></div>

            <div className="flex items-center space-x-4 ml-auto">
              {/* Global Search Button */}
              <button
                onClick={() => setShowGlobalSearch(true)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600"
                title="Global Search (⌘K)"
              >
                <Search className="h-5 w-5 text-gray-600" />
              </button>

              <button
                onClick={() => setShowPreferences(true)}
                className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                title="Preferences"
              >
                <Globe className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{getRegionShort(selectedRegion)} • {selectedCurrency}</span>
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600"
                >
                  <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center shadow-md">
                    <span className="text-sm font-bold text-white">{profile?.full_name?.charAt(0).toUpperCase() || 'V'}</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{profile?.role === 'vendor' ? 'Business' : profile?.role}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 min-w-48 max-w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">My Account</p>
                        <p className="text-xs text-gray-500 truncate" title={profile?.email}>{profile?.email}</p>
                      </div>
                      <Link
                        to="/vendor/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile
                      </Link>
                      <Link
                        to="/vendor/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false)
                          handleSignOut()
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      <PanelSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />

      {/* Preferences Modal */}
      <PreferencesModal isOpen={showPreferences} onClose={() => setShowPreferences(false)} />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Are you sure you want to log out?</h3>
            <div className="flex space-x-3">
              <button
                onClick={cancelSignOut}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSignOut}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
