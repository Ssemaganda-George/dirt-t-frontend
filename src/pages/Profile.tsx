import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Calendar, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { profile, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    const confirmed = window.confirm('Are you sure you want to sign out?')
    if (!confirmed) return

    setIsLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to DirtTrails</h2>
          <p className="text-gray-600 mb-6">
            Sign in to access your profile, bookings, and personalized recommendations.
          </p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors block font-medium"
            >
              Sign In
            </Link>
            <Link
              to="/vendor-login"
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors block font-medium"
            >
              Vendor Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center">
            <div className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-6">
              {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.full_name || 'User'}</h1>
              <p className="text-gray-600">{profile.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Member since {new Date(profile.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="text-gray-900 capitalize">{profile.role}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Actions</h2>
            <div className="space-y-3">
              <Link
                to="/bookings"
                className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">My Bookings</span>
              </Link>
              <Link
                to="/saved"
                className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">Saved Items</span>
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="flex items-center w-full p-3 border border-red-200 rounded-md hover:bg-red-50 transition-colors text-red-600 disabled:opacity-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>{isLoading ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-gray-600">Total Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-gray-600">Saved Items</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">0</div>
              <div className="text-gray-600">Reviews Given</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}