import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { User, Heart, ShoppingBag, Globe, ChevronDown, Settings, LogOut, Home, HelpCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import PreferencesModal from './PreferencesModal'
import MobileBottomNav from './MobileBottomNav'
import GlobalSearchModal from './GlobalSearchModal'
import SupportModal from './SupportModal'
import LoginModal from './LoginModal'
// import { useServiceCategories } from '../hooks/hook' // Temporarily commented out
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

export default function PublicLayout() {
  const [showPreferences, setShowPreferences] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('UG')
  const [selectedCurrency, setSelectedCurrency] = useState('UGX')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showGuestDropdown, setShowGuestDropdown] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const guestDropdownRef = useRef<HTMLDivElement>(null)
  // const { categories } = useServiceCategories() // Temporarily commented out
  const { getCartCount } = useCart()
  const { user, profile, signOut } = useAuth()

  // Map category IDs to navigation items
  const getNavigationItems = () => {
    const baseNavigation = [
      { name: 'Home', href: '/' }
    ]

    // Temporarily hide categories - only show Home
    // const categoryNavigation = categories
    //   .map(cat => {
    //     // Map category IDs to URL-friendly names
    //     const urlMapping: { [key: string]: string } = {
    //       'cat_hotels': 'hotels',
    //       'cat_tour_packages': 'tours',
    //       'cat_restaurants': 'restaurants',
    //       'cat_transport': 'transport',
    //       'cat_flights': 'flights',
    //       'cat_activities': 'activities'
    //     }

    //     const urlSlug = urlMapping[cat.id] || cat.id.replace('cat_', '')
    //     return {
    //       name: cat.id === 'cat_activities' ? 'Events' : cat.id === 'cat_hotels' ? 'Accommodation' : cat.name,
    //       href: `/category/${urlSlug}`
    //     }
    //   })
    //   .sort((a, b) => {
    //     // Custom sorting: Accommodation, Transport, Tours, Restaurants, Shops, Events
    //     const order: { [key: string]: number } = {
    //       'hotels': 0,      // Accommodation
    //       'transport': 1,   // Transport
    //       'tours': 2,       // Tours
    //       'restaurants': 3, // Restaurants
    //       'shops': 4,       // Shops
    //       'activities': 5   // Events
    //     }
    //     const aPriority = order[a.href.split('/').pop() || ''] ?? 6
    //     const bPriority = order[b.href.split('/').pop() || ''] ?? 6
        
    //     return aPriority - bPriority
    //   })

    return baseNavigation
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
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target as Node)) {
        setShowGuestDropdown(false)
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
              <button
                onClick={() => setShowPreferences(true)}
                className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              >
                <Globe className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{selectedCurrency}</span>
              </button>

              {user && profile?.role === 'tourist' && (
                <>
                  <button className="flex items-center text-gray-700 hover:text-blue-600 relative">
                    <ShoppingBag className="h-5 w-5" />
                    {getCartCount() > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {getCartCount()}
                      </span>
                    )}
                  </button>
                </>
              )}

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
                    <div className="fixed right-4 top-28 min-w-48 max-w-64 bg-white rounded-md shadow-lg border border-gray-200 z-[200]">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900">My Account</p>
                          <p className="text-xs text-gray-500 truncate" title={profile?.email}>{profile?.email}</p>
                        </div>
                        <Link
                          to="/"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Home className="h-3.5 w-3.5 mr-2" />
                          Home
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <User className="h-3.5 w-3.5 mr-2" />
                          Profile
                        </Link>
                        <Link
                          to="/bookings"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 mr-2" />
                          My Bookings
                        </Link>
                        <Link
                          to="/saved"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Heart className="h-3.5 w-3.5 mr-2" />
                          Saved Items
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Settings className="h-3.5 w-3.5 mr-2" />
                          Settings
                        </Link>
                        <Link
                          to="/help"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <HelpCircle className="h-3.5 w-3.5 mr-2" />
                          Help Center
                        </Link>

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-1"></div>

                        {/* Business Section */}
                        <div className="px-3 py-1.5">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">For Businesses</h4>
                        </div>
                        <Link
                          to="/vendor-login"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 mr-2" />
                          List Your Business
                        </Link>
                        <Link
                          to="/partner"
                          onClick={() => setShowUserDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 mr-2" />
                          Partner with Us
                        </Link>

                        <button
                          onClick={() => {
                            setShowUserDropdown(false)
                            handleSignOut()
                          }}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5 mr-2" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative" ref={guestDropdownRef}>
                  <button
                    onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                    className="flex items-center p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <User className="h-5 w-5 text-gray-700" />
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ml-1 ${showGuestDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Guest Dropdown Menu */}
                  {showGuestDropdown && (
                    <div className="fixed right-4 top-28 min-w-56 max-w-64 bg-white rounded-md shadow-lg border border-gray-200 z-[200] max-h-96 overflow-y-auto">
                      <div className="py-2">
                        {/* Account Section */}
                        <div className="px-3 py-1.5">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</h4>
                        </div>
                        <Link
                          to="/"
                          onClick={() => setShowGuestDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                        >
                          <Home className="h-3.5 w-3.5 mr-2" />
                          Home
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setShowGuestDropdown(false)
                            setShowLoginModal(true)
                          }}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                        >
                          <User className="h-3.5 w-3.5 mr-2" />
                          Log In
                        </button>
                        <button
                          onClick={() => {
                            setShowGuestDropdown(false)
                            setShowPreferences(true)
                          }}
                          className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                        >
                          <Globe className="h-3.5 w-3.5 mr-2" />
                          Currency & Region
                        </button>
                        <Link
                          to="/help"
                          onClick={() => setShowGuestDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                        >
                          <HelpCircle className="h-3.5 w-3.5 mr-2" />
                          Help Center
                        </Link>

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-2"></div>

                        {/* Business Section */}
                        <div className="px-3 py-1.5">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">For Businesses</h4>
                        </div>
                        <Link
                          to="/vendor-login"
                          onClick={() => setShowGuestDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 mr-2" />
                          List Your Business
                        </Link>
                        <Link
                          to="/partner"
                          onClick={() => setShowGuestDropdown(false)}
                          className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 mr-2" />
                          Partner with Us
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
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
                <li><Link to="/" className="hover:text-white">Home</Link></li>
                <li><Link to="/category/flights" className="hover:text-white">Flights</Link></li>
                <li><Link to="/category/hotels" className="hover:text-white">Hotels</Link></li>
                <li><Link to="/category/tours" className="hover:text-white">Tours</Link></li>
                <li><Link to="/category/activities" className="hover:text-white">Events</Link></li>
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
                <li><Link to="/travel-insurance" className="hover:text-white">Travel Insurance</Link></li>
                <li><Link to="/visa-processing" className="hover:text-white">Visa Processing</Link></li>
                <li><Link to="/internet-connectivity" className="hover:text-white">Internet & Connectivity</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">For Businesses</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/vendor-login" className="hover:text-white">List Your Business</Link></li>
                <li><Link to="/refer-business" className="hover:text-white">Refer a Business</Link></li>
                <li><Link to="/hospitality-class" className="hover:text-white">Join a Hospitality Class</Link></li>
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