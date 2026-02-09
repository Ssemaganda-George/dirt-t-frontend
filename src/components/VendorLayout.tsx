import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BarChart3, ShoppingBag, CreditCard, LogOut, Menu, X, Map, ChevronLeft, MessageSquare, User, Settings, ChevronDown, Ticket, Search, Globe, ChevronRight, Eye, Calendar } from 'lucide-react'
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white border-r border-gray-200">
          <div className="flex h-14 items-center justify-between px-4 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900 tracking-tight">DirtTrails</span>
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
                          key={item.name}
                          to={item.href}
                          className={`flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition ${
                            isActive
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon className={`h-4 w-4 ${isActive ? 'text-gray-300' : 'text-gray-400'}`} />
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
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'
      }`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100">
            {!sidebarCollapsed && (
              <span className="text-sm font-semibold text-gray-900 tracking-tight">DirtTrails Business</span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((category) => (
              <div key={category.category} className="space-y-0.5">
                {!sidebarCollapsed && (
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
                )}
                {sidebarCollapsed && (
                  <div className="px-2 py-1.5 text-[10px] font-medium text-gray-400 text-center uppercase">
                    {category.category.charAt(0)}
                  </div>
                )}
                {expandedCategories.has(category.category) && (
                  <div className={`${sidebarCollapsed ? 'space-y-1' : 'space-y-0.5'}`}>
                    {category.items.map((item) => {
                      const isActive = location.pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition ${
                            isActive
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                          title={sidebarCollapsed ? item.name : ''}
                        >
                          <item.icon className={`${sidebarCollapsed ? 'mx-auto' : ''} h-4 w-4 ${
                            isActive ? 'text-gray-300' : 'text-gray-400'
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
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
      }`}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              {/* Global Search */}
              <button
                onClick={() => setShowGlobalSearch(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
                title="Search (⌘K)"
              >
                <Search className="h-4 w-4 text-gray-500" />
              </button>

              {/* Preferences */}
              <button
                onClick={() => setShowPreferences(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
                title="Preferences"
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
                  <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">{profile?.full_name?.charAt(0).toUpperCase() || 'V'}</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{profile?.full_name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">{profile?.role === 'vendor' ? 'Business' : profile?.role}</p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                      <p className="text-xs text-gray-500 truncate" title={profile?.email}>{profile?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/vendor/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        Profile
                      </Link>
                      <Link
                        to="/vendor/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        Settings
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
                        Log out
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

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelSignOut} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 w-full">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Log out?</h3>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to log out of your account?</p>
            <div className="flex gap-2">
              <button
                onClick={cancelSignOut}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSignOut}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
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
