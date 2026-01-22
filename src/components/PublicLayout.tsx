import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { User, Menu, X, Heart, ShoppingBag, Globe, ChevronDown, Settings, LogOut } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import PreferencesModal from './PreferencesModal'
import MobileBottomNav from './MobileBottomNav'
import GlobalSearchModal from './GlobalSearchModal'
import SupportModal from './SupportModal'
import LoginModal from './LoginModal'
import { useServiceCategories } from '../hooks/hook'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('UG')
  const [selectedCurrency, setSelectedCurrency] = useState('UGX')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const { categories } = useServiceCategories()
  const { getCartCount } = useCart()
  const { user, profile, signOut } = useAuth()

  // Map category IDs to navigation items
  const getNavigationItems = () => {
    const baseNavigation = [
      { name: 'Home', href: '/' }
    ]

    // Map database categories to navigation items
    const categoryNavigation = categories
      .map(cat => {
        // Map category IDs to URL-friendly names
        const urlMapping: { [key: string]: string } = {
          'cat_hotels': 'hotels',
          'cat_tour_packages': 'tours',
          'cat_restaurants': 'restaurants',
          'cat_transport': 'transport',
          'cat_flights': 'flights',
          'cat_activities': 'activities'
        }

        const urlSlug = urlMapping[cat.id] || cat.id.replace('cat_', '')
        return {
          name: cat.id === 'cat_activities' ? 'Events' : cat.id === 'cat_hotels' ? 'Accommodation' : cat.name,
          href: `/category/${urlSlug}`
        }
      })
      .sort((a, b) => {
        // Custom sorting: flights first, events last, others alphabetical
        const order = { 'flights': 0, 'events': 2 }
        const aPriority = order[a.href.split('/').pop() as keyof typeof order] ?? 1
        const bPriority = order[b.href.split('/').pop() as keyof typeof order] ?? 1
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        // If same priority, sort alphabetically
        return a.name.localeCompare(b.name)
      })

    return [...baseNavigation, ...categoryNavigation]
  }

  const navigation = getNavigationItems()

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // No dropdown to close anymore
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    const confirmed = window.confirm('Are you sure you want to log out?')
    if (!confirmed) return

    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">DirtTrails</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Currency/Region Button */}
              <button
                onClick={() => setShowPreferences(true)}
                className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              >
                <Globe className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{selectedCurrency}</span>
              </button>

              <button className="hidden md:flex items-center text-gray-700 hover:text-blue-600">
                <Heart className="h-4 w-4 mr-1.5" />
                <span className="text-sm">Saved</span>
              </button>
              
              <button className="hidden md:flex items-center text-gray-700 hover:text-blue-600 relative">
                <ShoppingBag className="h-4 w-4 mr-1.5" />
                <span className="text-sm">Cart</span>
                {getCartCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getCartCount()}
                  </span>
                )}
              </button>

              {/* Sign In Button or User Account Dropdown */}
              {user && profile?.role === 'tourist' ? (
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
                      <span className="text-sm font-bold text-white">
                        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ml-1 ${showUserDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute right-0 mt-2 min-w-48 max-w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900">My Account</p>
                          <p className="text-xs text-gray-500 truncate" title={profile?.email}>{profile?.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <User className="h-4 w-4 mr-3" />
                          Profile
                        </Link>
                        <Link
                          to="/bookings"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <ShoppingBag className="h-4 w-4 mr-3" />
                          My Bookings
                        </Link>
                        <Link
                          to="/saved"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Heart className="h-4 w-4 mr-3" />
                          Saved Items
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                        </Link>
                        <button
                          onClick={() => {
                            setShowUserDropdown(false)
                            handleSignOut()
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center px-3 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="ml-2 text-sm font-medium hidden md:inline">Sign In</span>
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-700 hover:text-blue-600"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="max-h-[80vh] overflow-y-auto">
              {/* Navigation Section */}
              <div className="px-4 py-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Explore</h3>
                <nav className="space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        location.pathname === item.href
                          ? 'text-blue-600 bg-blue-50 border border-blue-100'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* User Actions Section */}
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setShowPreferences(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center px-3 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200"
                  >
                    <Globe className="h-4 w-4 mr-3 text-gray-500" />
                    <span className="flex-1 text-left">Currency & Region</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">{selectedCurrency}</span>
                  </button>

                  <Link
                    to="/saved"
                    className="flex items-center px-3 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart className="h-4 w-4 mr-3 text-gray-500" />
                    Saved Items
                  </Link>

                  <Link
                    to="/bookings"
                    className="flex items-center px-3 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShoppingBag className="h-4 w-4 mr-3 text-gray-500" />
                    My Bookings
                  </Link>
                </div>
              </div>

              {/* Business Section */}
              <div className="px-4 py-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">For Businesses</h3>
                <a
                  href="http://localhost:5173/vendor-login"
                  className="flex items-center px-3 py-3 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingBag className="h-4 w-4 mr-3 text-gray-500" />
                  List Your Business
                </a>
              </div>

              {/* Authentication Section */}
              <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/30">
                {user && profile?.role === 'tourist' ? (
                  <>
                    <div className="px-3 py-3 mb-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                          <span className="text-sm font-bold text-white">
                            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">My Account</p>
                          <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link
                        to="/profile"
                        className="flex items-center px-3 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3 text-gray-500" />
                        Profile
                      </Link>

                      <Link
                        to="/settings"
                        className="flex items-center px-3 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-500" />
                        Settings
                      </Link>

                      <button
                        onClick={() => {
                          setMobileMenuOpen(false)
                          handleSignOut()
                        }}
                        className="w-full flex items-center px-3 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setShowLoginModal(true)
                    }}
                    className="w-full flex items-center px-3 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border-2 border-dashed border-gray-300"
                  >
                    <User className="h-4 w-4 mr-3 text-gray-500" />
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        selectedRegion={selectedRegion}
        selectedCurrency={selectedCurrency}
        onRegionChange={setSelectedRegion}
        onCurrencyChange={setSelectedCurrency}
      />

      {/* Support Modal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />

      {/* Main Content */}
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        onSupportClick={() => setShowSupportModal(true)} 
        onSearchClick={() => setShowGlobalSearch(true)}
      />

      {/* Footer */}
      <footer className="hidden md:block bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <span className="text-xl font-bold">DirtTrails</span>
              </div>
              <p className="text-gray-400 text-sm">
                Discover Uganda's hidden gems and create unforgettable experiences with local service providers.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Explore</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/category/hotels" className="hover:text-white">Hotels</Link></li>
                <li><Link to="/category/tours" className="hover:text-white">Tours</Link></li>
                <li><Link to="/category/restaurants" className="hover:text-white">Restaurants</Link></li>
                <li><Link to="/category/transport" className="hover:text-white">Transport</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link to="/safety" className="hover:text-white">Safety</Link></li>
                <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">For Businesses</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="http://localhost:5173/vendor-login" className="hover:text-white">List Your Business</a></li>
                <li><Link to="/vendor-login" className="hover:text-white">Vendor Portal</Link></li>
                <li><Link to="/partner" className="hover:text-white">Partner with Us</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} DirtTrails. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}