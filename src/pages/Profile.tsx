import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Calendar, Settings, LogOut, Heart, Edit } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'

export default function Profile() {
  const { profile, signOut } = useAuth()
  const { t } = usePreferences()
  const [isLoading, setIsLoading] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleSignOut = async () => {
    setShowLogoutConfirm(true)
  }

  const confirmSignOut = async () => {
    setShowLogoutConfirm(false)
    setIsLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const cancelSignOut = () => {
    setShowLogoutConfirm(false)
  }

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
              className="w-full bg-blue-600 text-white py-3 px-4 hover:bg-blue-700 transition-colors block font-medium"
            >
              {t('sign_in')}
            </Link>
            <Link
              to="/vendor-login"
              className="w-full bg-green-600 text-white py-3 px-4 hover:bg-green-700 transition-colors block font-medium"
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center">
            <div className="h-20 w-20 bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mr-6">
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
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('contact_information')}</h2>
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

          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('account_actions')}</h2>
            <div className="space-y-3">
              <Link
                to="/bookings"
                className="flex items-center p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{t('my_bookings')}</span>
              </Link>
              <Link
                to="/saved"
                className="flex items-center p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Heart className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{t('saved_items')}</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{t('settings')}</span>
              </Link>
              <Link
                to="/edit-profile"
                className="flex items-center p-3 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Edit className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900">{t('edit_profile')}</span>
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="flex items-center w-full p-3 border border-red-200 hover:bg-red-50 transition-colors text-red-600 disabled:opacity-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>{isLoading ? t('signing_out') : t('sign_out')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('quick_stats')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-gray-600">{t('total_bookings')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-gray-600">{t('saved_items')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">0</div>
              <div className="text-gray-600">{t('reviews_given')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('logout_confirm_title')}</h3>
            <div className="flex space-x-3">
              <button
                onClick={cancelSignOut}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmSignOut}
                className="flex-1 px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                {t('sign_out')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}