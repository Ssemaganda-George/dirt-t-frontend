import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { User, Heart, ShoppingBag, Globe, ChevronDown, Settings, LogOut, Home, HelpCircle, Search, Menu } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import PreferencesModal from './PreferencesModal'
import MobileBottomNav from './MobileBottomNav'
import GlobalSearchModal from './GlobalSearchModal'
import SupportModal from './SupportModal'
import LoginModal from './LoginModal'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Explore', href: '/services' },
]

export default function TouristLayout() {
  const [showPreferences, setShowPreferences] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState('UG')
  const [selectedCurrency, setSelectedCurrency] = useState('UGX')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const { getCartCount } = useCart()
  const { profile, signOut } = useAuth()

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    setShowLogoutConfirm(true)
  }

  const confirmSignOut = async () => {
    setShowLogoutConfirm(false)
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const cancelSignOut = () => {
    setShowLogoutConfirm(false)
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
              {/* Search Button */}
              <button
                onClick={() => setShowGlobalSearch(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
                title="Search"
              >
                <Search className="h-5 w-5 text-gray-600" />
              </button>

              <button
                onClick={() => setShowPreferences(true)}
                className="flex items-center space-x-2 px-3 py-1.5 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
              >
                <Globe className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{selectedCurrency}</span>
              </button>

              {/* Cart */}
              <button className="flex items-center text-gray-700 hover:text-blue-600 relative">
                <ShoppingBag className="h-5 w-5" />
                {getCartCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getCartCount()}
                  </span>
                )}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>

              {/* User Account Dropdown */}
              <div className="relative" ref={dropdownRef}>
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
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div ref={mobileMenuRef} className="md:hidden border-t border-gray-200 bg-white">
              <nav className="px-4 py-4 space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`block px-3 py-2 text-sm font-medium transition-colors ${
                      location.pathname === item.href
                        ? 'text-blue-600'
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Modals */}
      <PreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        selectedRegion={selectedRegion}
        selectedCurrency={selectedCurrency}
        onRegionChange={setSelectedRegion}
        onCurrencyChange={setSelectedCurrency}
      />

      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />

      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
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