import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  ShoppingBag,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  MapPin,
  Users,
  MessageSquare,
  User,
  Settings,
  ChevronDown,
  Ticket,
  DollarSign,
  Search,
  Globe,
  ChevronRight,
  Eye,
  Star
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import PanelSearchModal from './PanelSearchModal'
import PreferencesModal from './PreferencesModal'
import { usePreferences } from '../contexts/PreferencesContext'

const navigation = [
  {
    category: 'Overview',
    items: [
      { labelKey: 'dashboard', href: '/admin', icon: BarChart3 },
      { labelKey: 'visitor_activity', href: '/admin/visitor-activity', icon: Eye }
    ]
  },
  {
    category: 'Users',
    items: [
      { labelKey: 'businesses', href: '/admin/businesses', icon: Users },
      { labelKey: 'tourists', href: '/admin/tourists', icon: User }
    ]
  },
  {
    category: 'Services',
    items: [
      { labelKey: 'services', href: '/admin/services', icon: ShoppingBag },
      { labelKey: 'activities', href: '/admin/services/activities', icon: ShoppingBag },
      { labelKey: 'hotels', href: '/admin/services/hotels', icon: ShoppingBag },
      { labelKey: 'restaurants', href: '/admin/services/restaurants', icon: ShoppingBag },
      { labelKey: 'shops', href: '/admin/services/shops', icon: ShoppingBag },
      { labelKey: 'tours', href: '/admin/services/tours', icon: ShoppingBag },
      { labelKey: 'transport', href: '/admin/services/transport', icon: ShoppingBag }
    ]
  },
  {
    category: 'Bookings',
    items: [
      { labelKey: 'bookings', href: '/admin/bookings', icon: MapPin },
      { labelKey: 'events_bookings', href: '/admin/bookings/events', icon: MapPin },
      { labelKey: 'flights_bookings', href: '/admin/bookings/flights', icon: MapPin },
      { labelKey: 'hotels_bookings', href: '/admin/bookings/hotels', icon: MapPin },
      { labelKey: 'restaurants_bookings', href: '/admin/bookings/restaurants', icon: MapPin },
      { labelKey: 'shops_bookings', href: '/admin/bookings/shops', icon: MapPin },
      { labelKey: 'tours_bookings', href: '/admin/bookings/tours', icon: MapPin },
      { labelKey: 'transport_bookings', href: '/admin/bookings/transport', icon: MapPin },
      { labelKey: 'tickets', href: '/admin/tickets', icon: Ticket }
    ]
  },
  {
    category: 'Finance',
    items: [
      { labelKey: 'dirt_trails_wallet', href: '/admin/dirt-trails-wallet', icon: CreditCard },
      { labelKey: 'business_wallets', href: '/admin/wallets', icon: CreditCard },
      { labelKey: 'finance', href: '/admin/finance', icon: DollarSign },
      { labelKey: 'vendor_tiers', href: '/admin/vendor-tiers', icon: BarChart3 }
    ]
  },
  {
    category: 'Content',
    items: [
      { labelKey: 'reviews', href: '/admin/reviews', icon: Star },
      { labelKey: 'hero_video', href: '/admin/hero-video', icon: BarChart3 }
    ]
  },
  {
    category: 'Communication',
    items: [
      { labelKey: 'messages', href: '/admin/messages', icon: MessageSquare },
      { labelKey: 'partnerships', href: '/admin/partnerships', icon: Users }
    ]
  }
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { selectedRegion, selectedCurrency, t } = usePreferences()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Overview', 'Users']))
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white border-r border-gray-200">
          <div className="flex h-14 items-center justify-between px-4 border-b border-gray-100">
            <span className="text-sm font-semibold text-blue-600 tracking-tight">DirtTrails Admin</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((category) => (
              <div key={category.category} className="space-y-0.5">
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full flex items-center justify-between px-2 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-gray-600 transition"
                >
                  <span>{category.category}</span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      expandedCategories.has(category.category) ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedCategories.has(category.category) && (
                  <div className="space-y-0.5">
                    {category.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.labelKey}
                          to={item.href}
                          className={`flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? 'text-blue-200' : 'text-gray-400'}`} />
                          {t(item.labelKey)}
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center h-14 px-4 border-b border-gray-100">
            <span className="text-sm font-semibold text-blue-600 tracking-tight">DirtTrails Admin</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((category) => (
              <div key={category.category} className="space-y-0.5">
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full flex items-center justify-between px-2 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-gray-600 transition"
                >
                  <span>{category.category}</span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      expandedCategories.has(category.category) ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedCategories.has(category.category) && (
                  <div className="space-y-0.5">
                    {category.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.labelKey}
                          to={item.href}
                          className={`flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? 'text-blue-200' : 'text-gray-400'}`} />
                          {t(item.labelKey)}
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
      <div className="lg:pl-60">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 lg:hidden transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1"></div>

            <div className="flex items-center gap-2">
              {/* Global Search */}
              <button
                onClick={() => setShowGlobalSearch(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                title={t('global_search_tooltip')}
              >
                <Search className="h-4 w-4 text-gray-500" />
              </button>

              {/* Preferences */}
              <button
                onClick={() => setShowPreferences(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
                title={t('preferences')}
              >
                <Globe className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-600">{getRegionShort(selectedRegion)} · {selectedCurrency}</span>
              </button>

              {/* Account */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{profile?.full_name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{profile?.role === 'vendor' ? 'Business' : profile?.role}</p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-[999] overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                      <p className="text-xs text-gray-500 truncate" title={profile?.email}>{profile?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/admin/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        {t('profile')}
                      </Link>
                      <Link
                        to="/admin/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        {t('settings')}
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false)
                          handleSignOut()
                        }}
                        className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('logout')}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Log out?</h3>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to log out of your account?</p>
            <div className="flex space-x-3">
              <button
                onClick={cancelSignOut}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSignOut}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}