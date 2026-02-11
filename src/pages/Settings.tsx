import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Settings as SettingsIcon, Bell, Shield, Globe, CreditCard, HelpCircle, LogOut, CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getUserPreferences } from '../lib/database'
import type { UserPreferences } from '../types'

export default function Settings() {
  const { user, signOut } = useAuth()
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailPromotions: false,
    pushBookings: true,
    pushPromotions: false,
  })
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [success, setSuccess] = useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Load user preferences on component mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return

      try {
        const data = await getUserPreferences()
        if (data) {
          setPreferences(data)
          // Coerce possibly-undefined fields from UserPreferences to booleans for the UI
          setNotifications({
            emailBookings: data.email_bookings ?? false,
            emailPromotions: data.email_promotions ?? false,
            pushBookings: data.push_bookings ?? false,
            pushPromotions: data.push_promotions ?? false,
          })
        }
      } catch (error) {
        console.error('Error loading preferences via helper:', error)
      }
    }

    loadPreferences()
  }, [user])

  const handleSignOut = async () => {
    setShowLogoutConfirm(true)
  }

  const confirmSignOut = async () => {
    setShowLogoutConfirm(false)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const cancelSignOut = () => {
    setShowLogoutConfirm(false)
  }

  const handleNotificationChange = async (key: string, value: boolean) => {
    if (!user) return

    setSuccess('')

    try {
      // Update local state immediately for UI responsiveness
      setNotifications(prev => ({
        ...prev,
        [key]: value
      }))

      // Save to database
      const updates = {
        user_id: user.id,
        email_bookings: key === 'emailBookings' ? value : notifications.emailBookings,
        email_promotions: key === 'emailPromotions' ? value : notifications.emailPromotions,
        push_bookings: key === 'pushBookings' ? value : notifications.pushBookings,
        push_promotions: key === 'pushPromotions' ? value : notifications.pushPromotions,
        updated_at: new Date().toISOString()
      }

      if (preferences) {
        // Update existing preferences
        const { error } = await supabase
          .from('user_preferences')
          .update(updates)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new preferences record
        const { error } = await supabase
          .from('user_preferences')
          .insert(updates)

        if (error) throw error
      }

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving preferences:', error)
      // Revert local state on error
      setNotifications(prev => ({
        ...prev,
        [key]: !value
      }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/profile"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account preferences and settings</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <SettingsIcon className="h-6 w-6 text-gray-400 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                  <p className="text-gray-600">Update your personal information and preferences</p>
                </div>
              </div>
              <Link
                to="/edit-profile"
                className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Bell className="h-6 w-6 text-gray-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Email notifications for bookings</p>
                  <p className="text-sm text-gray-600">Receive updates about your bookings and reservations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.emailBookings}
                    onChange={(e) => handleNotificationChange('emailBookings', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Email promotions and offers</p>
                  <p className="text-sm text-gray-600">Receive special offers and promotional emails</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.emailPromotions}
                    onChange={(e) => handleNotificationChange('emailPromotions', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Push notifications for bookings</p>
                  <p className="text-sm text-gray-600">Get instant notifications about booking updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.pushBookings}
                    onChange={(e) => handleNotificationChange('pushBookings', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Push notifications for promotions</p>
                  <p className="text-sm text-gray-600">Receive push notifications for special offers</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.pushPromotions}
                    onChange={(e) => handleNotificationChange('pushPromotions', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-6 w-6 text-gray-400 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Privacy & Security</h3>
                  <p className="text-gray-600">Manage your privacy settings and account security</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Manage
              </button>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="h-6 w-6 text-gray-400 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
                  <p className="text-gray-600">Manage your saved payment methods</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Manage
              </button>
            </div>
          </div>

          {/* Language & Region */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Globe className="h-4 w-4 md:h-5 md:w-5 text-gray-400 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Language & Region</h3>
                  <p className="text-gray-600">Change your language and regional preferences</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Change
              </button>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <HelpCircle className="h-6 w-6 text-gray-400 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Help & Support</h3>
                  <p className="text-gray-600">Get help with your account and bookings</p>
                </div>
              </div>
              <Link
                to="/help"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Get Help
              </Link>
            </div>
          </div>

          {/* Sign Out */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <LogOut className="h-6 w-6 text-red-400 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sign Out</h3>
                  <p className="text-gray-600">Sign out of your account on all devices</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

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