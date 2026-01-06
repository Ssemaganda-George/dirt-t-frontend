import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PublicLayout from './components/PublicLayout'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import ServiceDetail from './pages/ServiceDetail'
import CategoryPage from './pages/CategoryPage'
import ServiceCategories from './pages/Services'
import Flights from './pages/Flights'
import Profile from './pages/Profile'
import Login from './pages/Login'
import VendorLogin from './pages/VendorLogin'
import VendorLayout from './components/VendorLayout'
import VendorDashboard from './pages/vendor/Dashboard'
import VendorServices from './pages/vendor/Services'
import VendorBookings from './pages/vendor/Bookings'
import VendorTransactions from './pages/vendor/Transactions'
import Dashboard from './pages/admin/Dashboard'
import Vendors from './pages/admin/Vendors'
import { Services } from './pages/admin/Services'
import { Bookings } from './pages/admin/Bookings'
import { Transactions } from './pages/admin/Transactions'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="service/:id" element={<ServiceDetail />} />
            <Route path="services" element={<ServiceCategories />} />
            <Route path="flights" element={<Flights />} />
            <Route path="profile" element={<Profile />} />
            <Route path="hotels" element={<CategoryPage />} />
            <Route path="tours" element={<CategoryPage />} />
            <Route path="restaurants" element={<CategoryPage />} />
            <Route path="transport" element={<CategoryPage />} />
            <Route path="activities" element={<CategoryPage />} />
          </Route>
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/vendor-login" element={<VendorLogin />} />
          
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
            <Route path="services" element={<VendorServices />} />
            <Route path="bookings" element={<VendorBookings />} />
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
            <Route path="vendors" element={<Vendors />} />
            <Route path="services" element={<Services />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="users" element={<div className="p-8 text-center text-gray-500">User management coming soon...</div>} />
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
    </AuthProvider>
  )
}

export default App