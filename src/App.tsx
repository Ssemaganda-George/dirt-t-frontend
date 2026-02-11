import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { BookingProvider } from './contexts/BookingContext'
import { CartProvider } from './contexts/CartContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import PublicLayout from './components/PublicLayout'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import VendorLayout from './components/VendorLayout'
import { PageTransition } from './components/PageTransition'
import { SmoothLoader } from './components/SmoothLoader'
import { AppVisitorTracker } from './components/AppVisitorTracker'

// Lazy load all page components for better UX with loading states
const Home = lazy(() => import('./pages/Home'))
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'))
const BookingFlow = lazy(() => import('./pages/BookingFlow'))
const ServiceInquiry = lazy(() => import('./pages/ServiceInquiry'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ServiceCategories = lazy(() => import('./pages/Services'))
const UserDashboard = lazy(() => import('./pages/Dashboard'))
const Login = lazy(() => import('./pages/Login'))
const VendorLogin = lazy(() => import('./pages/VendorLogin'))
const VendorPending = lazy(() => import('./pages/VendorPending'))
const VendorDashboard = lazy(() => import('./pages/vendor/Dashboard'))
const VendorServices = lazy(() => import('./pages/vendor/Services'))
const VendorBookings = lazy(() => import('./pages/vendor/Bookings'))
const VendorAvailability = lazy(() => import('./pages/vendor/Availability'))
const VendorMessages = lazy(() => import('./pages/vendor/Messages'))
const VendorInquiries = lazy(() => import('./pages/vendor/Inquiries'))
const VendorTransactions = lazy(() => import('./pages/vendor/Transactions'))
const VendorProfile = lazy(() => import('./pages/vendor/Profile'))
const VendorSettings = lazy(() => import('./pages/vendor/Settings'))
const VendorTickets = lazy(() => import('./pages/vendor/Tickets'))
const VendorEvents = lazy(() => import('./pages/vendor/Events'))
const VendorVisitorActivity = lazy(() => import('./pages/vendor/VisitorActivity'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Businesses = lazy(() => import('./pages/admin/Businesses'))
const Messages = lazy(() => import('./pages/admin/Messages'))
const AdminProfile = lazy(() => import('./pages/admin/Profile'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const AdminServices = lazy(() => import('./pages/admin/Services').then(module => ({ default: module.Services })))
const AdminBookings = lazy(() => import('./pages/admin/Bookings').then(module => ({ default: module.Bookings })))
const Transactions = lazy(() => import('./pages/admin/Wallets').then(module => ({ default: module.Transactions })))
const DirtTrailsWallet = lazy(() => import('./pages/admin/DirtTrailsWallet').then(module => ({ default: module.DirtTrailsWallet })))
const Finance = lazy(() => import('./pages/admin/Finance').then(module => ({ default: module.Finance })))
const HeroVideoManager = lazy(() => import('./pages/admin/HeroVideoManager'))
const AdminVendorMessages = lazy(() => import('./pages/vendor/AdminVendorMessages'))
const Partnerships = lazy(() => import('./pages/admin/Partnerships'))
const PartnerWithUs = lazy(() => import('./pages/PartnerWithUs'))
const ConnectionTest = lazy(() => import('./pages/ConnectionTest'))
const ScanEvent = lazy(() => import('./pages/ScanEvent'))
const TicketReceipt = lazy(() => import('./pages/TicketReceipt'))
const VerifyTicket = lazy(() => import('./pages/VerifyTicket'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Payment = lazy(() => import('./pages/Payment'))
const AdminTickets = lazy(() => import('./pages/admin/Tickets'))
const BookingDetail = lazy(() => import('./pages/BookingDetail'))
const Tourists = lazy(() => import('./pages/admin/Tourists'))
const ActivitiesServices = lazy(() => import('./pages/admin/ActivitiesServices').then(module => ({ default: module.ActivitiesServices })))
const HotelsServices = lazy(() => import('./pages/admin/HotelsServices').then(module => ({ default: module.HotelsServices })))
const RestaurantsServices = lazy(() => import('./pages/admin/RestaurantsServices').then(module => ({ default: module.RestaurantsServices })))
const ShopsServices = lazy(() => import('./pages/admin/ShopsServices').then(module => ({ default: module.ShopsServices })))
const ToursServices = lazy(() => import('./pages/admin/ToursServices').then(module => ({ default: module.ToursServices })))
const TransportServices = lazy(() => import('./pages/admin/TransportServices').then(module => ({ default: module.TransportServices })))
const EventsBookings = lazy(() => import('./pages/admin/EventsBookings').then(module => ({ default: module.EventsBookings })))
const FlightsBookings = lazy(() => import('./pages/admin/FlightsBookings').then(module => ({ default: module.FlightsBookings })))
const HotelsBookings = lazy(() => import('./pages/admin/HotelsBookings').then(module => ({ default: module.HotelsBookings })))
const RestaurantsBookings = lazy(() => import('./pages/admin/RestaurantsBookings').then(module => ({ default: module.RestaurantsBookings })))
const ShopsBookings = lazy(() => import('./pages/admin/ShopsBookings').then(module => ({ default: module.ShopsBookings })))
const ToursBookings = lazy(() => import('./pages/admin/ToursBookings').then(module => ({ default: module.ToursBookings })))
const TransportBookings = lazy(() => import('./pages/admin/TransportBookings').then(module => ({ default: module.TransportBookings })))
const VisitorActivity = lazy(() => import('./pages/admin/VisitorActivity').then(module => ({ default: module.VisitorActivity })))
const AdminReviews = lazy(() => import('./pages/admin/Reviews').then(module => ({ default: module.Reviews })))
const ReviewFromEmail = lazy(() => import('./pages/ReviewFromEmail'))

// Preload critical routes
const preloadCriticalRoutes = () => {
  // Preload login and common pages that users might visit
  import('./pages/Login')
  import('./pages/Dashboard')
  import('./pages/ServiceDetail')
  import('./pages/CategoryPage')
}

// Support pages
const HelpCenter = lazy(() => import('./pages/HelpCenter'))
const ContactUs = lazy(() => import('./pages/ContactUs'))
const Safety = lazy(() => import('./pages/Safety'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const TravelInsurance = lazy(() => import('./pages/TravelInsurance'))
const VisaProcessing = lazy(() => import('./pages/VisaProcessing'))
const InternetConnectivity = lazy(() => import('./pages/InternetConnectivity'))
const ReferBusiness = lazy(() => import('./pages/ReferBusiness'))
const ReferralForm = lazy(() => import('./pages/ReferralForm'))
const HospitalityClass = lazy(() => import('./pages/HospitalityClass'))

// Tourist pages
const TouristBookings = lazy(() => import('./pages/Bookings'))
const Saved = lazy(() => import('./pages/Saved'))
const UserSettings = lazy(() => import('./pages/Settings'))
const EditProfile = lazy(() => import('./pages/EditProfile'))

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function App() {
  // Preload critical routes on app initialization
  useEffect(() => {
    preloadCriticalRoutes()
  }, [])

  return (
    <AuthProvider>
      <PreferencesProvider>
        <CartProvider>
          <BookingProvider>
            <Router>
              <AppVisitorTracker />
              <ScrollToTop />
              <Suspense fallback={<SmoothLoader type="home" message="Loading page..." />}>
              <Routes>
          {/* Public Routes */}
          <Route path="/connection-test" element={<ConnectionTest />} />
          <Route path="/review/:token" element={<ReviewFromEmail />} />
          <Route path="/" element={<PublicLayout />}>
            <Route path="booking/:id" element={<BookingDetail />} />
            <Route index element={<Home />} />
            <Route path="scan/:id" element={<ScanEvent />} />
            <Route path="tickets/:orderId" element={<TicketReceipt />} />
            <Route path="verify-ticket/:ticketCode" element={<VerifyTicket />} />
            <Route path="checkout/:orderId" element={<Checkout />} />
            <Route path="checkout/:orderId/payment" element={<Payment />} />
            <Route path="service/:slug" element={<ServiceDetail />} />
            <Route path="service/:slug/book/:category" element={<BookingFlow />} />
            <Route path="service/:slug/inquiry" element={<ServiceInquiry />} />
            <Route path="services" element={<ServiceCategories />} />
            <Route path="profile" element={<UserDashboard />} />
            <Route path="category/:category" element={<PageTransition delay={300} skeletonType="service"><CategoryPage /></PageTransition>} />
            {/* Support Pages */}
            <Route path="help" element={<HelpCenter />} />
            <Route path="contact" element={<ContactUs />} />
            <Route path="safety" element={<Safety />} />
            <Route path="terms" element={<TermsOfService />} />
            <Route path="travel-insurance" element={<TravelInsurance />} />
            <Route path="visa-processing" element={<VisaProcessing />} />
            <Route path="internet-connectivity" element={<InternetConnectivity />} />
            <Route path="refer-business" element={<ReferBusiness />} />
            <Route path="referral-form" element={<ReferralForm />} />
            <Route path="hospitality-class" element={<HospitalityClass />} />
            {/* Partner and Vendor Login Pages */}
            <Route path="partner" element={<PartnerWithUs />} />
            <Route path="vendor-login" element={<VendorLogin />} />
          </Route>
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/vendor-pending" element={<VendorPending />} />
          
          {/* Tourist Routes */}
          <Route
            path="/bookings"
            element={
              <ProtectedRoute requiredRole="tourist">
                <PublicLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TouristBookings />} />
          </Route>
          <Route
            path="/saved"
            element={
              <ProtectedRoute requiredRole="tourist">
                <PublicLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Saved />} />
          </Route>
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole="tourist">
                <PublicLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<UserSettings />} />
          </Route>
          <Route
            path="/edit-profile"
            element={
              <ProtectedRoute requiredRole="tourist">
                <PublicLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EditProfile />} />
          </Route>
          
          {/* Vendor Routes */}
          <Route
            path="/vendor/*"
            element={
              <ProtectedRoute requiredRole="vendor">
                <VendorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<VendorDashboard />} />
            <Route path="profile" element={<VendorProfile />} />
            <Route path="settings" element={<VendorSettings />} />
            <Route path="services" element={<VendorServices />} />
            <Route path="events" element={<VendorEvents />} />
            <Route path="bookings" element={<VendorBookings />} />
            <Route path="availability" element={<VendorAvailability />} />
            <Route path="tickets" element={<VendorTickets />} />
            <Route path="messages" element={<VendorMessages />} />
            <Route path="inquiries" element={<VendorInquiries />} />
            <Route path="transactions" element={<VendorTransactions />} />
            <Route path="visitor-activity" element={<VendorVisitorActivity />} />
          </Route>
          
          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="businesses" element={<Businesses />} />
            <Route path="tourists" element={<Tourists />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="services/activities" element={<ActivitiesServices />} />
            <Route path="services/hotels" element={<HotelsServices />} />
            <Route path="services/restaurants" element={<RestaurantsServices />} />
            <Route path="services/shops" element={<ShopsServices />} />
            <Route path="services/tours" element={<ToursServices />} />
            <Route path="services/transport" element={<TransportServices />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="bookings/events" element={<EventsBookings />} />
            <Route path="bookings/flights" element={<FlightsBookings />} />
            <Route path="bookings/hotels" element={<HotelsBookings />} />
            <Route path="bookings/restaurants" element={<RestaurantsBookings />} />
            <Route path="bookings/shops" element={<ShopsBookings />} />
            <Route path="bookings/tours" element={<ToursBookings />} />
            <Route path="bookings/transport" element={<TransportBookings />} />
            <Route path="messages" element={<Messages />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="partnerships" element={<Partnerships />} />
            <Route path="wallets" element={<Transactions />} />
            <Route path="dirt-trails-wallet" element={<DirtTrailsWallet />} />
            <Route path="finance" element={<Finance />} />
            <Route path="vendor-messages" element={
              <ProtectedRoute requiredRole="admin">
                <AdminVendorMessages />
              </ProtectedRoute>
            } />
            <Route path="hero-video" element={<HeroVideoManager />} />
            <Route path="visitor-activity" element={<VisitorActivity />} />
            <Route path="reviews" element={<AdminReviews />} />
          </Route>
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Unauthorized</h1>
                <p className="text-gray-600">You don't have permission to access this page.</p>
              </div>
            </div>
          } />
        </Routes>
            </Suspense>
          </Router>
        </BookingProvider>
      </CartProvider>
    </PreferencesProvider>
  </AuthProvider>
  );
}

export default App