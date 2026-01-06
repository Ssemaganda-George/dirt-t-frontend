import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { User, Menu, X, Heart, ShoppingBag, Globe, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import PreferencesModal from './PreferencesModal'
import MobileBottomNav from './MobileBottomNav'

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('UG')
  const [selectedCurrency, setSelectedCurrency] = useState('UGX')
  const [showSignInDropdown, setShowSignInDropdown] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSignInDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Flights', href: '/flights' },
    { name: 'Hotels', href: '/category/hotels' },
    { name: 'Tours', href: '/category/tours' },
    { name: 'Restaurants', href: '/category/restaurants' },
    { name: 'Transport', href: '/category/transport' },
    
  ]

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
                <Heart className="h-5 w-5 mr-1" />
                <span className="text-sm">Saved</span>
              </button>
              
              <button className="hidden md:flex items-center text-gray-700 hover:text-blue-600">
                <ShoppingBag className="h-5 w-5 mr-1" />
                <span className="text-sm">Bookings</span>
              </button>

              {/* Sign In Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowSignInDropdown(!showSignInDropdown)}
                  className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  <User className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Sign In</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>

                {showSignInDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Select Account</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowSignInDropdown(false)
                          navigate('/login')
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <User className="h-4 w-4 inline mr-2" />
                        Tourist
                      </button>
                      <button
                        onClick={() => {
                          setShowSignInDropdown(false)
                          navigate('/vendor-login')
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <ShoppingBag className="h-4 w-4 inline mr-2" />
                        Business
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-700 hover:text-blue-600"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                    location.pathname === item.href
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="border-t border-gray-200 pt-2">
                <button
                  onClick={() => {
                    setShowPreferences(true)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md flex items-center"
                >
                  <Globe className="h-5 w-5 mr-2" />
                  Currency & Region ({selectedCurrency})
                </button>
                <Link
                  to="/saved"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Saved
                </Link>
                <Link
                  to="/bookings"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Bookings
                </Link>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate('/login')
                    }}
                    className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md flex items-center"
                  >
                    <User className="h-5 w-5 mr-2" />
                    Sign in as Tourist
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate('/vendor-login')
                    }}
                    className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md flex items-center"
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Sign in as Vendor
                  </button>
                </div>
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

      {/* Main Content */}
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
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
                <li><Link to="/vendor-signup" className="hover:text-white">List Your Business</Link></li>
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