import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { BookingProvider } from './contexts/BookingContext'
import { CartProvider } from './contexts/CartContext'
import PublicLayout from './components/PublicLayout'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import ServiceDetail from './pages/ServiceDetail'
import BookingFlow from './pages/BookingFlow'
import ServiceInquiry from './pages/ServiceInquiry'
import CategoryPage from './pages/CategoryPage'
import ServiceCategories from './pages/Services'
import Profile from './pages/Profile'
import Login from './pages/Login'
import VendorLogin from './pages/VendorLogin'
import VendorPending from './pages/VendorPending'
import VendorLayout from './components/VendorLayout'
import VendorDashboard from './pages/vendor/Dashboard'
import VendorServices from './pages/vendor/Services'
import VendorBookings from './pages/vendor/Bookings'
import VendorMessages from './pages/vendor/Messages'
import VendorInquiries from './pages/vendor/Inquiries'
import VendorTransactions from './pages/vendor/Transactions'
import VendorProfile from './pages/vendor/Profile'
import VendorSettings from './pages/vendor/Settings'
import Dashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Vendors from './pages/admin/Vendors'
import Messages from './pages/admin/Messages'
import AdminProfile from './pages/admin/Profile'
import AdminSettings from './pages/admin/Settings'
import { Services } from './pages/admin/Services'
import { Bookings } from './pages/admin/Bookings'
import { Transactions } from './pages/admin/Transactions'

import AdminVendorMessages from './pages/vendor/AdminVendorMessages'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BookingProvider>
          <Router>
            <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="service/:id" element={<ServiceDetail />} />
            <Route path="service/:id/book/:category" element={<BookingFlow />} />
            <Route path="service/:id/inquiry" element={<ServiceInquiry />} />
            <Route path="services" element={<ServiceCategories />} />
            <Route path="profile" element={<Profile />} />
            <Route path="category/:category" element={<CategoryPage />} />
          </Route>
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/vendor-login" element={<VendorLogin />} />
          <Route path="/vendor-pending" element={<VendorPending />} />
          
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
            <Route path="services" element={<Services />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="messages" element={<Messages />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="vendor-messages" element={
              <ProtectedRoute requiredRole="admin">
                <AdminVendorMessages />
              </ProtectedRoute>
            } />
import AdminVendorMessages from './pages/vendor/AdminVendorMessages'
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
      </Router>
    </BookingProvider>
    </CartProvider>
  </AuthProvider>
  );
}

export default App