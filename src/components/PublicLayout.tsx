import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { User, Heart, ShoppingBag, Globe, ChevronDown, Settings, LogOut, Home, HelpCircle, Search, Wallet, MessageSquare, Twitter, Instagram, Facebook, Linkedin } from 'lucide-react'
import useUnreadMessages from '../hooks/useUnreadMessages'
import { useState, useEffect, useRef } from 'react'
import PreferencesModal from './PreferencesModal'
import MobileBottomNav from './MobileBottomNav'
import GlobalSearchModal from './GlobalSearchModal'
import SupportModal from './SupportModal'
import LoginModal from './LoginModal'
import { usePreferences } from '../contexts/PreferencesContext'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { getActivePartners, Partner } from '../lib/database'
// import '../i18n';
// import { useTranslation } from 'react-i18next';

const getRegionName = (code: string) => {
  const regionMap: { [key: string]: string } = {
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
  return regionMap[code] || code
}

export default function PublicLayout() {
  const { unreadCount } = useUnreadMessages()
  const [showPreferences, setShowPreferences] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showGuestDropdown, setShowGuestDropdown] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [partners, setPartners] = useState<Partner[]>([])
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [partnersError, setPartnersError] = useState<string | null>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false)
  const partnersRowRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  const navigate = useNavigate()

  const isHomePage = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const guestDropdownRef = useRef<HTMLDivElement>(null)
  // const { categories } = useServiceCategories() // Temporarily commented out
  const { getCartCount } = useCart()
  const { user, profile, signOut } = useAuth()
  const { selectedRegion, selectedCurrency, t } = usePreferences()

  // Map category IDs to navigation items
  const getNavigationItems = (): Array<{name: string, href: string}> => {
    // Show Conservation only on home page
    if (location.pathname === '/') {
      return [
        { name: 'home', href: '/' },
        { name: 'Conservation', href: '/conservation/geotagging' }
      ];
    }
    return [
      { name: 'home', href: '/' }
    ];
  }

  const navigation = getNavigationItems()
  const marqueePartners = shouldAutoScroll && partners.length > 1 ? [...partners, ...partners] : partners

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if click is outside BOTH the ref container and the button
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

  useEffect(() => {
    let mounted = true

    const loadPartners = async () => {
      setPartnersLoading(true)
      setPartnersError(null)

      try {
        const data = await getActivePartners()
        if (!mounted) return
        setPartners(data)
      } catch (error) {
        if (!mounted) return
        setPartnersError(error instanceof Error ? error.message : 'Failed to load partners')
      } finally {
        if (mounted) setPartnersLoading(false)
      }
    }

    loadPartners()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const updateScroll = () => {
      const el = partnersRowRef.current
      if (!el) return
      setShouldAutoScroll(el.scrollWidth > el.clientWidth + 1)
    }

    updateScroll()
    window.addEventListener('resize', updateScroll)
    return () => {
      window.removeEventListener('resize', updateScroll)
    }
  }, [partners])

  /**
   * Task 9: Single search funnel.
   * On the home page, focus the hero "Where" input (the primary booking search).
   * On all other pages, open the global site-search modal.
   * This avoids two competing entry points without merging fundamentally different
   * search experiences (booking-context vs site-wide content search).
   */
  const handleSearchClick = () => {
    if (isHomePage) {
      const heroInput = document.getElementById('hero-search-where') as HTMLInputElement | null
      if (heroInput) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        // Small delay to let the scroll settle before focusing
        setTimeout(() => heroInput.focus(), 250)
        return
      }
    }
    setShowGlobalSearch(true)
  }

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

  const isTransparent = isHomePage && !scrolled
  const iconCls = isTransparent ? 'text-white' : 'text-gray-600'
  const iconHover = isTransparent ? 'hover:bg-white/15' : 'hover:bg-gray-100'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-300${typeof window !== 'undefined' && document.body.classList.contains('hide-main-navbar') ? ' hidden' : ''}`}>
        <div className={`transition-all duration-300 overflow-visible ${isTransparent ? '' : 'bg-white border-b border-gray-200 shadow-sm'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
            <div className="flex items-center justify-between h-16 md:h-[72px] overflow-visible">

              {/* Logo */}
              <Link to="/" className={`flex flex-col items-end justify-center transition-all duration-300 rounded-xl px-2 py-1 ${isTransparent ? 'bg-white/10 backdrop-blur-sm' : 'bg-white border border-gray-200'} shadow-sm`}>
                <span className={`text-lg font-bold tracking-tight transition-colors ${isTransparent ? 'text-white' : 'text-gray-900'}`}>
                  DirtTrails<span className="text-emerald-500 ml-0.5">.</span>
                </span>
                <span className={`self-end text-[7px] font-semibold uppercase tracking-[0.16em] mt-0.5 transition-colors ${isTransparent ? 'text-white/70' : 'text-slate-500'}`}>
                  Safari intel
                </span>
                {location.pathname.includes('/scan/') && (
                  <span className="mt-2 text-sm font-semibold text-white/90 drop-shadow-lg">
                    Event Verification
                  </span>
                )}
              </Link>

              {/* Desktop Navigation — clean text links, no pill borders */}
              {!location.pathname.includes('/scan/') && (
                <nav className="hidden md:flex items-center gap-1">
                  {navigation.map((item) => {
                    const isActive = item.name.toLowerCase() === 'home'
                      ? location.pathname === '/'
                      : location.pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? isTransparent
                              ? 'text-white bg-white/15'
                              : 'text-gray-900 bg-gray-100'
                            : isTransparent
                              ? 'text-white/80 hover:text-white hover:bg-white/10'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {t(item.name)}
                      </Link>
                    )
                  })}
                </nav>
              )}

              {/* Right side actions — borderless icon buttons */}
              {!location.pathname.includes('/scan/') && (
                <div className="flex items-center gap-1 overflow-visible">

                  {/* Search — focuses hero on home, opens modal elsewhere (Task 9) */}
                  <button
                    onClick={handleSearchClick}
                    className={`hidden md:flex items-center justify-center w-9 h-9 rounded-full transition-colors ${iconHover}`}
                    title={t('search')}
                  >
                    <Search className={`h-5 w-5 ${iconCls}`} />
                  </button>

                  {/* Messages — authenticated only */}
                  {user && (
                    <Link
                      to="/messages"
                      className={`hidden md:flex items-center justify-center w-9 h-9 rounded-full transition-colors relative ${iconHover}`}
                      title={t('messages')}
                    >
                      <MessageSquare className={`h-5 w-5 ${iconCls}`} />
                      {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  )}

                  {/* Globe / preferences */}
                  <button
                    onClick={() => setShowPreferences(true)}
                    className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${iconHover}`}
                    title={t('preferences')}
                  >
                    <Globe className={`h-4 w-4 ${iconCls}`} />
                    <span className="sr-only">{getRegionName(selectedRegion)} • {selectedCurrency}</span>
                  </button>

                  {/* Cart / saved */}
                  <Link
                    to="/saved"
                    className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-colors ${iconHover}`}
                  >
                    <ShoppingBag className={`h-5 w-5 ${iconCls}`} />
                    {getCartCount() > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white">
                        {getCartCount()}
                      </span>
                    )}
                  </Link>

                  {/* User account / sign-in */}
                  {user && profile?.role === 'tourist' ? (
                    <div className="relative z-[1002]" ref={userDropdownRef}>
                      <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className={`flex items-center gap-1 pl-1 pr-2 py-1 rounded-full transition-colors ${iconHover}`}
                      >
                        <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                          <span className="text-xs font-bold text-white">
                            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <ChevronDown className={`h-3 w-3 transition-transform ${isTransparent ? 'text-white/70' : 'text-gray-500'} ${showUserDropdown ? 'rotate-180' : ''}`} />
                      </button>

                    {/* User Dropdown Menu */}
                    {showUserDropdown && (
                      <div className="absolute right-0 top-14 min-w-48 max-w-64 bg-white rounded-md shadow-lg border border-gray-200 z-[1001]">
                        <div className="py-1">
                          <div className="px-4 py-2 border-b border-gray-200">
                            <p className="text-sm font-medium text-gray-900">{t('my_account')}</p>
                            <p className="text-xs text-gray-500 truncate" title={profile?.email}>{profile?.email}</p>
                          </div>
                          <Link
                            to="/"
                            onClick={() => setShowUserDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Home className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('home')}
                          </Link>
                          <Link
                            to="/profile"
                            onClick={() => setShowUserDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <User className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('profile')}
                          </Link>
                          <Link
                            to="/bookings"
                            onClick={() => setShowUserDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <ShoppingBag className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('bookings')}
                          </Link>
                          <Link
                            to="/saved"
                            onClick={() => setShowUserDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Heart className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('saved_items') || 'Saved Items'}
                          </Link>
                          <Link
                            to="/wallet"
                            onClick={() => setShowUserDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Wallet className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            My Wallet
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setShowUserDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Settings className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('settings')}
                          </Link>
                          <Link
                            to="/help"
                            onClick={() => setShowUserDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <HelpCircle className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('help_center')}
                          </Link>

                          {/* Divider */}
                          <div className="border-t border-gray-100 my-1"></div>

                          <button
                            onClick={() => {
                              setShowUserDropdown(false)
                              handleSignOut()
                            }}
                            className="flex items-center w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('sign_out')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  ) : (
                    <div className="relative z-[1002]" ref={guestDropdownRef}>
                      <button
                        onClick={() => setShowGuestDropdown(!showGuestDropdown)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-full transition-colors ${iconHover}`}
                      >
                        <User className={`h-4 w-4 ${iconCls}`} />
                        <ChevronDown className={`h-3 w-3 transition-transform ${isTransparent ? 'text-white/70' : 'text-gray-500'} ${showGuestDropdown ? 'rotate-180' : ''}`} />
                      </button>

                    {/* Guest Dropdown Menu */}
                    {showGuestDropdown && (
                      <div className="absolute right-0 top-14 min-w-56 max-w-64 bg-white rounded-md shadow-lg border border-gray-200 z-[1001] max-h-96 overflow-y-auto">
                        <div className="py-2">
                          {/* Account Section */}
                          <div className="px-3 py-1.5">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('my_account')}</h4>
                          </div>
                          <Link
                            to="/"
                            onClick={() => setShowGuestDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                          >
                            <Home className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('home')}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setShowGuestDropdown(false)
                              setShowLoginModal(true)
                            }}
                            className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                          >
                            <User className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('log_in')}
                          </button>
                          <button
                            onClick={() => {
                              setShowGuestDropdown(false)
                              setShowPreferences(true)
                            }}
                            className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                          >
                            <Globe className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('currency_region')}
                          </button>
                          <Link
                            to="/help"
                            onClick={() => setShowGuestDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                          >
                            <HelpCircle className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('help_center')}
                          </Link>

                          {/* Divider */}
                          <div className="border-t border-gray-100 my-2"></div>

                          {/* Business Section */}
                          <div className="px-3 py-1.5">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('for_businesses')}</h4>
                          </div>
                          <Link
                            to="/vendor-login"
                            onClick={() => setShowGuestDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                          >
                            <ShoppingBag className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('list_my_business')}
                          </Link>
                          <Link
                            to="/partner"
                            onClick={() => setShowGuestDropdown(false)}
                            className="flex items-center px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer rounded"
                          >
                            <ShoppingBag className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                            {t('partner_with')}
                          </Link>
                        </div>
                      </div>
                    )}
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
      {/* Add top padding equal to header height so fixed header doesn't overlap content */}
      <main className={`${location.pathname === '/' ? 'pt-0 pb-16' : location.pathname.includes('/scan/') ? 'pt-0 pb-0' : 'pt-16 pb-16'}`}>
        <div key={location.pathname} className="smooth-fade-in smooth-transition">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation - Hidden on scan pages, service detail pages, and checkout/payment pages */}
      {!location.pathname.includes('/scan/') &&
        !location.pathname.startsWith('/service/') &&
        !location.pathname.match(/^\/checkout\/[^/]+(\/payment)?$/) && (
          <MobileBottomNav
            onSupportClick={() => setShowSupportModal(true)}
            onSearchClick={() => setShowGlobalSearch(true)}
          />
      )}

      {/* Footer */}
      <footer className="hidden md:block text-slate-900">
        {/* Top CTA strip */}
        <div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 rounded-[28px] border border-slate-200/70 bg-white/80 backdrop-blur-sm shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-1">For Businesses</p>
              <p className="text-lg font-bold text-slate-900">Reach thousands of travellers around the world.</p>
            </div>
            <Link
              to="/vendor-login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              List your business
            </Link>
          </div>
        </div>

        {/* Main footer grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Brand column */}
            <div className="md:col-span-4">
              <p className="text-2xl font-bold tracking-tight mb-1">DirtTrails<span className="text-emerald-500">.</span></p>
              <p className="text-slate-500 text-sm leading-relaxed mt-3 max-w-xs">
                Intelligent bookings, trusted hosts, and journeys built for sustainability.
              </p>
              
            </div>

            {/* Links */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Explore</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/" className="text-slate-600 hover:text-slate-900 transition-colors">Home</Link></li>
                <li><Link to="/category/hotels" className="text-slate-600 hover:text-slate-900 transition-colors">Stays</Link></li>
                <li><Link to="/category/tours" className="text-slate-600 hover:text-slate-900 transition-colors">Tours</Link></li>
                <li><Link to="/category/events" className="text-slate-600 hover:text-slate-900 transition-colors">Events</Link></li>
                <li><Link to="/category/restaurants" className="text-slate-600 hover:text-slate-900 transition-colors">Restaurants</Link></li>
                <li><Link to="/category/transport" className="text-slate-600 hover:text-slate-900 transition-colors">Transport</Link></li>
                <li><Link to="/category/shops" className="text-slate-600 hover:text-slate-900 transition-colors">Shops</Link></li>
              </ul>
            </div>

            {/* Conservation column */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Conservation</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/conservation/geotagging" className="text-slate-600 hover:text-slate-900 transition-colors">Geotagging &amp; Monitoring</Link></li>
                <li><Link to="/conservation/tree-planting" className="text-gray-400 hover:text-white transition-colors">Tree Planting Initiatives</Link></li>
                <li><Link to="/conservation/carbon" className="text-gray-400 hover:text-white transition-colors">Calculate My Carbon</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Support</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="https://2www.dirt-trails.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Visit Our Website
                  </a>
                </li>
                <li><Link to="/help" className="text-slate-600 hover:text-slate-900 transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="text-slate-600 hover:text-slate-900 transition-colors">Contact Us</Link></li>
                <li><Link to="/safety" className="text-slate-600 hover:text-slate-900 transition-colors">Safety</Link></li>
                <li><Link to="/terms" className="text-slate-600 hover:text-slate-900 transition-colors">Terms of Service</Link></li>
                <li><Link to="/travel-insurance" className="text-slate-600 hover:text-slate-900 transition-colors">Travel Insurance</Link></li>
                <li><Link to="/visa-processing" className="text-slate-600 hover:text-slate-900 transition-colors">Visa Processing</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Business</h4>
              <ul className="space-y-3 text-sm">
                <li><Link to="/vendor-login" className="text-slate-600 hover:text-slate-900 transition-colors">List My Business</Link></li>
                <li><Link to="/refer-business" className="text-slate-600 hover:text-slate-900 transition-colors">Refer a Business</Link></li>
                <li><Link to="/hospitality-class" className="text-slate-600 hover:text-slate-900 transition-colors">Hospitality Class</Link></li>
                <li><Link to="/partner" className="text-slate-600 hover:text-slate-900 transition-colors">Our Partners</Link></li>
              </ul>
            </div>
          </div>

          {partnersLoading && !partners.length && (
            <div className="mt-14 rounded-3xl border border-gray-200 bg-slate-50 py-8 text-center text-sm text-slate-600">
              Loading partner highlights...
            </div>
          )}

          {partnersError && !partners.length && (
            <div className="mt-14 rounded-3xl border border-gray-200 bg-slate-50 py-8 text-center text-sm text-red-600">
              {partnersError}
            </div>
          )}

          {partners.length > 0 && (
            <div className="mt-10 mx-auto max-w-5xl p-4">
              <div className="mb-4 flex flex-col items-center gap-1 text-center">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Our Partners</h4>
              </div>

              <div
                ref={partnersRowRef}
                className={`relative w-full py-1 ${shouldAutoScroll ? 'overflow-x-hidden' : 'flex justify-center'}`}
              >
                <div className={`${shouldAutoScroll ? 'marquee' : 'inline-flex'} min-w-max items-center gap-4 px-1`}>
                  {marqueePartners.map((partner, index) => {
                    const partnerUrl = partner.website ? (partner.website.startsWith('http') ? partner.website : `https://${partner.website}`) : undefined;
                    const cardContent = (
                      <>
                        {partner.logo_url ? (
                          <img
                            src={partner.logo_url}
                            alt={`${partner.name} logo`}
                            className="h-12 w-12 rounded-full object-cover bg-gray-800 shadow-sm"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-[10px] text-white uppercase font-semibold shadow-sm">
                            {partner.name.slice(0, 2)}
                          </div>
                        )}
                        <span className="text-xs font-medium text-slate-900">{partner.name}</span>
                      </>
                    );

                    return (
                      <div key={`${partner.id}-${index}`} className="shrink-0 flex flex-col items-center gap-2 px-2 py-2 text-center">
                        {partnerUrl ? (
                          <a href={partnerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex flex-col items-center gap-2">
                            {cardContent}
                          </a>
                        ) : cardContent}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bottom bar */}
          <div className="mt-14 pt-8 flex flex-col gap-4">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <a href="https://x.com/DirtTrails_Ug" target="_blank" rel="noopener noreferrer" className="rounded-full p-2 text-slate-500 hover:text-slate-900 transition-colors" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://www.instagram.com/dirttrailssafaris/" target="_blank" rel="noopener noreferrer" className="rounded-full p-2 text-slate-500 hover:text-slate-900 transition-colors" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="https://www.facebook.com/people/DirtTrails-Safaris/100081666093047/" target="_blank" rel="noopener noreferrer" className="rounded-full p-2 text-slate-500 hover:text-slate-900 transition-colors" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="https://www.linkedin.com/company/dirt-trails-safaris/" target="_blank" rel="noopener noreferrer" className="rounded-full p-2 text-slate-500 hover:text-slate-900 transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-slate-500">
              <p className="text-center sm:text-left">&copy; {new Date().getFullYear()} DirtTrails. All rights reserved.</p>
              <div className="flex items-center gap-6 justify-center sm:justify-start">
                <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
                <Link to="/cookies" className="hover:text-slate-900 transition-colors">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

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
