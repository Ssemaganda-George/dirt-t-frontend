import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { BookingProvider } from './contexts/BookingContext'
import { CartProvider } from './contexts/CartContext'
import PublicLayout from './components/PublicLayout'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import VendorLayout from './components/VendorLayout'
import { PageTransition } from './components/PageTransition'
import { SmoothLoader } from './components/SmoothLoader'

// Lazy load all page components for better UX with loading states
const Home = lazy(() => import('./pages/Home'))
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'))
const BookingFlow = lazy(() => import('./pages/BookingFlow'))
const ServiceInquiry = lazy(() => import('./pages/ServiceInquiry'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ServiceCategories = lazy(() => import('./pages/Services'))
const Profile = lazy(() => import('./pages/Profile'))
const Login = lazy(() => import('./pages/Login'))
const VendorLogin = lazy(() => import('./pages/VendorLogin'))
const VendorPending = lazy(() => import('./pages/VendorPending'))
const VendorDashboard = lazy(() => import('./pages/vendor/Dashboard'))
const VendorServices = lazy(() => import('./pages/vendor/Services'))
const VendorBookings = lazy(() => import('./pages/vendor/Bookings'))
const VendorMessages = lazy(() => import('./pages/vendor/Messages'))
const VendorInquiries = lazy(() => import('./pages/vendor/Inquiries'))
const VendorTransactions = lazy(() => import('./pages/vendor/Transactions'))
const VendorProfile = lazy(() => import('./pages/vendor/Profile'))
const VendorSettings = lazy(() => import('./pages/vendor/Settings'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Users = lazy(() => import('./pages/admin/Users'))
const Vendors = lazy(() => import('./pages/admin/Vendors'))
const Messages = lazy(() => import('./pages/admin/Messages'))
const AdminProfile = lazy(() => import('./pages/admin/Profile'))
const AdminSettings = lazy(() => import('./pages/admin/Settings'))
const AdminServices = lazy(() => import('./pages/admin/Services').then(module => ({ default: module.Services })))
const AdminBookings = lazy(() => import('./pages/admin/Bookings').then(module => ({ default: module.Bookings })))
const Transactions = lazy(() => import('./pages/admin/Wallets').then(module => ({ default: module.Transactions })))
const Finance = lazy(() => import('./pages/admin/Finance').then(module => ({ default: module.Finance })))
const HeroVideoManager = lazy(() => import('./pages/admin/HeroVideoManager'))
const AdminVendorMessages = lazy(() => import('./pages/vendor/AdminVendorMessages'))
const Partnerships = lazy(() => import('./pages/admin/Partnerships'))
const PartnerWithUs = lazy(() => import('./pages/PartnerWithUs'))
const ConnectionTest = lazy(() => import('./pages/ConnectionTest'))

// Preload critical routes
const preloadCriticalRoutes = () => {
  // Preload login and common pages that users might visit
  import('./pages/Login')
  import('./pages/Profile')
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
      <CartProvider>
        <BookingProvider>
          <Router>
            <ScrollToTop />
            <Suspense fallback={<SmoothLoader type="home" message="Loading page..." />}>
              <Routes>
          {/* Public Routes */}
          <Route path="/connection-test" element={<ConnectionTest />} />
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="service/:slug" element={<ServiceDetail />} />
            <Route path="service/:slug/book/:category" element={<BookingFlow />} />
            <Route path="service/:slug/inquiry" element={<ServiceInquiry />} />
            <Route path="services" element={<ServiceCategories />} />
            <Route path="profile" element={<Profile />} />
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
                <TouristBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute requiredRole="tourist">
                <Saved />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole="tourist">
                <UserSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <ProtectedRoute requiredRole="tourist">
                <EditProfile />
              </ProtectedRoute>
            }
          />
          
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
            <Route path="bookings" element={<VendorBookings />} />
            <Route path="messages" element={<VendorMessages />} />
            <Route path="inquiries" element={<VendorInquiries />} />
            <Route path="transactions" element={<VendorTransactions />} />
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
            <Route path="users" element={<Users />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="messages" element={<Messages />} />
            <Route path="partnerships" element={<Partnerships />} />
            <Route path="wallets" element={<Transactions />} />
            <Route path="finance" element={<Finance />} />
            <Route path="vendor-messages" element={
              <ProtectedRoute requiredRole="admin">
                <AdminVendorMessages />
              </ProtectedRoute>
            } />
            <Route path="hero-video" element={<HeroVideoManager />} />
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
  </AuthProvider>
  );
}

export default App