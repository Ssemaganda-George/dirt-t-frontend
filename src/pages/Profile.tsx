import { Link } from 'react-router-dom'
import { User, Mail, Calendar, Settings, Heart, ArrowRight, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatCurrency } from '../lib/utils'

export default function Profile() {
  const { profile } = useAuth()
  const { t, selectedCurrency } = usePreferences()

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 p-8 text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('welcome_to_app')}</h2>
          <p className="text-gray-600 mb-6">{t('sign_in_prompt') || 'Sign in to access your profile, bookings, and personalized recommendations.'}</p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="w-full min-h-[48px] bg-gray-900 text-white py-3 px-4 rounded-xl hover:bg-gray-800 transition-all duration-200 ease-out block font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            >
              {t('sign_in')}
            </Link>
            <Link
              to="/vendor-login"
              className="w-full min-h-[48px] border border-gray-300 bg-white text-gray-800 py-3 px-4 rounded-xl hover:bg-gray-50 transition-all duration-200 ease-out block font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            >
              {t('vendor_sign_in')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Profile Header - Hero Section */}
        <div className="bg-white shadow-sm border border-gray-200 p-5 sm:p-8 mb-6 sm:mb-8 rounded-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            <div className="relative">
              <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gray-900 flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold rounded-full shadow-sm">
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">{profile.full_name || 'User'}</h1>
              <p className="text-sm sm:text-base text-gray-600 mb-1">{profile.email}</p>
              <p className="text-sm text-gray-500 mb-4">
                Member since {new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  <User className="h-4 w-4 mr-1" />
                  {profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1) || 'Tourist'}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <Calendar className="h-4 w-4 mr-1" />
                  Active Member
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <div className="bg-white shadow-sm border border-gray-200 p-5 sm:p-6 rounded-2xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 text-gray-700 mr-2" />
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="text-gray-900 font-medium">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Account Type</p>
                    <p className="text-gray-900 font-medium capitalize">{profile.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Recent Bookings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white shadow-sm border border-gray-200 p-5 sm:p-6 rounded-2xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="h-4 w-4 text-gray-700" />
                </div>
                Quick Stats
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                <Link
                  to="/bookings"
                  className="bg-gray-50 p-3 sm:p-4 rounded-xl text-center border border-gray-200 hover:shadow-sm transition-all duration-200 group"
                >
                  <Calendar className="h-5 w-5 text-gray-700 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">1</div>
                  <div className="text-gray-700 font-medium text-sm">{t('my_bookings')}</div>
                  <div className="text-xs text-gray-500 mt-1">View all</div>
                </Link>
                <Link
                  to="/saved"
                  className="bg-gray-50 p-3 sm:p-4 rounded-xl text-center border border-gray-200 hover:shadow-sm transition-all duration-200 group"
                >
                  <Heart className="h-5 w-5 text-gray-700 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">0</div>
                  <div className="text-gray-700 font-medium text-sm">{t('saved_items')}</div>
                  <div className="text-xs text-gray-500 mt-1">Favorites</div>
                </Link>
                <Link
                  to="/bookings?filter=upcoming"
                  className="bg-gray-50 p-3 sm:p-4 rounded-xl text-center border border-gray-200 hover:shadow-sm transition-all duration-200 group"
                >
                  <Calendar className="h-5 w-5 text-gray-700 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">0</div>
                  <div className="text-gray-700 font-medium text-sm">Upcoming</div>
                  <div className="text-xs text-gray-500 mt-1">Next 30 days</div>
                </Link>
                <Link
                  to="/reviews"
                  className="bg-gray-50 p-3 sm:p-4 rounded-xl text-center border border-gray-200 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="h-5 w-5 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <span className="text-white text-xs">★</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">0</div>
                  <div className="text-gray-700 font-medium text-sm">{t('reviews_given')}</div>
                  <div className="text-xs text-gray-500 mt-1">Total reviews</div>
                </Link>
                <Link
                  to="/settings"
                  className="bg-gray-50 p-3 sm:p-4 rounded-xl text-center border border-gray-200 hover:shadow-sm transition-all duration-200 group"
                >
                  <Settings className="h-5 w-5 text-gray-700 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-gray-700">Settings</div>
                  <div className="text-xs text-gray-500 mt-1">Account</div>
                </Link>
                <Link
                  to="/wallet"
                  className="bg-gray-50 p-3 sm:p-4 rounded-xl text-center border border-gray-200 hover:shadow-sm transition-all duration-200 group"
                >
                  <Wallet className="h-5 w-5 text-gray-700 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-gray-700">My Wallet</div>
                  <div className="text-xs text-gray-500 mt-1">Save & Track</div>
                </Link>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white shadow-sm border border-gray-200 p-5 sm:p-6 rounded-2xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="h-4 w-4 text-gray-700" />
                </div>
                Recent Bookings
              </h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-xl border border-gray-200 hover:shadow-sm transition-shadow duration-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 sm:h-14 sm:w-14 bg-gray-100 flex items-center justify-center rounded-xl shadow-sm">
                        <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Super Custom Van</h3>
                        <p className="text-sm sm:text-base text-gray-600">Booked on 28/01/2026</p>
                        <p className="text-sm text-gray-500">Transport Service</p>
                      </div>
                    </div>
                    <div className="text-right md:text-center">
                      <p className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{formatCurrency(450000, selectedCurrency || 'UGX')}</p>
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                        <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                        Confirmed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Link
                  to="/bookings"
                  className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors duration-200 shadow-sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View All Bookings
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}