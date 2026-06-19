import { Link } from 'react-router-dom'
import { User, Mail, Calendar, Settings, Heart } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatCurrency } from '../lib/utils'

export default function Dashboard() {
  const { profile } = useAuth()
  const { t, selectedCurrency } = usePreferences()

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-sm border border-slate-200 rounded-2xl p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">{t('welcome_to_app')}</h2>
          <p className="text-slate-600 mb-6">{t('sign_in_prompt') || 'Sign in to access your profile, bookings, and personalized recommendations.'}</p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors block font-medium"
            >
              {t('sign_in')}
            </Link>
            <Link
              to="/vendor-login"
              className="w-full bg-white text-slate-700 py-3 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors block font-medium"
            >
              {t('vendor_sign_in')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header - Hero Section */}
        <div className="bg-white shadow-sm border border-slate-200 p-8 mb-8 rounded-2xl">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            <div className="relative">
              <div className="h-24 w-24 bg-emerald-50 flex items-center justify-center text-emerald-700 text-3xl font-bold rounded-full">
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{profile.full_name || 'User'}</h1>
              <p className="text-lg text-slate-600 mb-1">{profile.email}</p>
              <p className="text-sm text-slate-500 mb-4">
                Member since {new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                  <User className="h-4 w-4 mr-1" />
                  {profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1) || 'Tourist'}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
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
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 text-slate-400 mr-2" />
                Contact Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mr-3 flex-shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email Address</p>
                    <p className="text-slate-900 font-medium">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-slate-50 rounded-xl">
                  <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mr-3 flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Account Type</p>
                    <p className="text-slate-900 font-medium capitalize">{profile.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Recent Bookings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="h-4 w-4 text-emerald-700" />
                </div>
                Quick Stats
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Link
                  to="/bookings"
                  className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm transition-all duration-200 group"
                >
                  <Calendar className="h-6 w-6 text-slate-500 group-hover:text-emerald-700 mx-auto mb-2 group-hover:scale-110 transition-all" />
                  <div className="text-2xl font-bold text-slate-900 mb-1">1</div>
                  <div className="text-slate-700 font-medium text-sm">{t('my_bookings')}</div>
                  <div className="text-xs text-slate-500 mt-1">View all</div>
                </Link>
                <Link
                  to="/saved"
                  className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm transition-all duration-200 group"
                >
                  <Heart className="h-6 w-6 text-slate-500 group-hover:text-emerald-700 mx-auto mb-2 group-hover:scale-110 transition-all" />
                  <div className="text-2xl font-bold text-slate-900 mb-1">0</div>
                  <div className="text-slate-700 font-medium text-sm">{t('saved_items')}</div>
                  <div className="text-xs text-slate-500 mt-1">Favorites</div>
                </Link>
                <Link
                  to="/bookings?filter=upcoming"
                  className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm transition-all duration-200 group"
                >
                  <Calendar className="h-6 w-6 text-slate-500 group-hover:text-emerald-700 mx-auto mb-2 group-hover:scale-110 transition-all" />
                  <div className="text-2xl font-bold text-slate-900 mb-1">0</div>
                  <div className="text-slate-700 font-medium text-sm">Upcoming</div>
                  <div className="text-xs text-slate-500 mt-1">Next 30 days</div>
                </Link>
                <Link
                  to="/reviews"
                  className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm transition-all duration-200 group"
                >
                  <div className="h-6 w-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <span className="text-xs">★</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mb-1">0</div>
                  <div className="text-slate-700 font-medium text-sm">{t('reviews_given')}</div>
                  <div className="text-xs text-slate-500 mt-1">Total reviews</div>
                </Link>
                <Link
                  to="/settings"
                  className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm transition-all duration-200 group"
                >
                  <Settings className="h-6 w-6 text-slate-500 group-hover:text-emerald-700 mx-auto mb-2 group-hover:scale-110 transition-all" />
                  <div className="text-sm font-medium text-slate-700">Settings</div>
                  <div className="text-xs text-slate-500 mt-1">Account</div>
                </Link>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center mr-3">
                  <Calendar className="h-4 w-4 text-emerald-700" />
                </div>
                Recent Bookings
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all duration-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="h-14 w-14 bg-emerald-50 flex items-center justify-center rounded-xl">
                        <Calendar className="h-7 w-7 text-emerald-700" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">Super Custom Van</h3>
                        <p className="text-slate-600">Booked on 28/01/2026</p>
                        <p className="text-sm text-slate-500">Transport Service</p>
                      </div>
                    </div>
                    <div className="text-right md:text-center">
                      <p className="text-2xl font-bold text-slate-900 mb-2">{formatCurrency(450000, selectedCurrency || 'UGX')}</p>
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <div className="h-2 w-2 bg-emerald-500 rounded-full mr-2"></div>
                        Confirmed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Link
                  to="/bookings"
                  className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200 shadow-sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View All Bookings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}