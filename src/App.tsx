import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PublicLayout from './components/PublicLayout'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import ServiceDetail from './pages/ServiceDetail'
import CategoryPage from './pages/CategoryPage'
import Login from './pages/Login'
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
            <Route path="hotels" element={<CategoryPage />} />
            <Route path="tours" element={<CategoryPage />} />
            <Route path="restaurants" element={<CategoryPage />} />
            <Route path="transport" element={<CategoryPage />} />
            <Route path="activities" element={<CategoryPage />} />
          </Route>
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          
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