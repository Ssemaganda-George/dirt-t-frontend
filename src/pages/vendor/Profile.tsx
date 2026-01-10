import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { User, Mail, Phone, MapPin, Save, X, Edit, Building, FileText } from 'lucide-react'

export default function Profile() {
  const { profile, user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [vendorData, setVendorData] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    business_name: '',
    business_description: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    business_website: '',
    operating_hours: ''
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!error && data) {
          setVendorData(data)
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error)
      }
    }

    fetchVendorData()
  }, [user?.id])

  useEffect(() => {
    if (profile && vendorData) {
      setFormData({
        full_name: profile.full_name || '',
        phone: (profile as any).phone || '',
        email: profile.email || '',
        business_name: vendorData.business_name || '',
        business_description: vendorData.business_description || '',
        business_address: vendorData.business_address || '',
        business_phone: vendorData.business_phone || '',
        business_email: vendorData.business_email || '',
        business_website: vendorData.business_website || '',
        operating_hours: vendorData.operating_hours || ''
      })
    }
  }, [profile, vendorData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    if (!user?.id) return

    setIsLoading(true)
    setMessage('')

    try {
      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update vendor data
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({
          business_name: formData.business_name,
          business_description: formData.business_description,
          business_address: formData.business_address,
          business_phone: formData.business_phone,
          business_email: formData.business_email,
          business_website: formData.business_website,
          operating_hours: formData.operating_hours,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (vendorError) throw vendorError

      // Update email if changed (requires auth update)
      if (formData.email !== profile?.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        })

        if (authError) throw authError

        setMessage('Profile updated successfully! Please check your email to confirm the email change.')
      } else {
        setMessage('Profile updated successfully!')
      }

      setIsEditing(false)

      // Refresh vendor data
      const { data: updatedVendor } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (updatedVendor) {
        setVendorData(updatedVendor)
      }

      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000)

    } catch (error: any) {
      console.error('Error updating profile:', error)
      setMessage(error.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (profile && vendorData) {
      setFormData({
        full_name: profile.full_name || '',
        phone: (profile as any).phone || '',
        email: profile.email || '',
        business_name: vendorData.business_name || '',
        business_description: vendorData.business_description || '',
        business_address: vendorData.business_address || '',
        business_phone: vendorData.business_phone || '',
        business_email: vendorData.business_email || '',
        business_website: vendorData.business_website || '',
        operating_hours: vendorData.operating_hours || ''
      })
    }
    setIsEditing(false)
    setMessage('')
  }

  if (!profile || !vendorData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-6">
            <div className="h-24 w-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold mr-6 shadow-lg">
              {profile.full_name?.charAt(0).toUpperCase() || 'V'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{profile.full_name || 'Vendor'}</h2>
              <p className="text-gray-600">{profile.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Vendor • Member since {new Date(profile.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="full_name"
                    id="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              {/* Role (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value="Vendor"
                    disabled
                    className="bg-gray-50 text-gray-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Business Name */}
              <div>
                <label htmlFor="business_name" className="block text-sm font-medium text-gray-700">
                  Business Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="business_name"
                    id="business_name"
                    value={formData.business_name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter your business name"
                  />
                </div>
              </div>

              {/* Business Email */}
              <div>
                <label htmlFor="business_email" className="block text-sm font-medium text-gray-700">
                  Business Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="business_email"
                    id="business_email"
                    value={formData.business_email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter business email"
                  />
                </div>
              </div>

              {/* Business Phone */}
              <div>
                <label htmlFor="business_phone" className="block text-sm font-medium text-gray-700">
                  Business Phone
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="business_phone"
                    id="business_phone"
                    value={formData.business_phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter business phone"
                  />
                </div>
              </div>

              {/* Business Website */}
              <div>
                <label htmlFor="business_website" className="block text-sm font-medium text-gray-700">
                  Business Website
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="url"
                    name="business_website"
                    id="business_website"
                    value={formData.business_website}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="focus:ring-primary-500 focus:border-primary-500 block w-full px-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>

            {/* Business Address */}
            <div className="mt-6">
              <label htmlFor="business_address" className="block text-sm font-medium text-gray-700">
                Business Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="business_address"
                  id="business_address"
                  value={formData.business_address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Enter your business address"
                />
              </div>
            </div>

            {/* Business Description */}
            <div className="mt-6">
              <label htmlFor="business_description" className="block text-sm font-medium text-gray-700">
                Business Description
              </label>
              <div className="mt-1">
                <textarea
                  name="business_description"
                  id="business_description"
                  rows={4}
                  value={formData.business_description}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full px-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Describe your business..."
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div className="mt-6">
              <label htmlFor="operating_hours" className="block text-sm font-medium text-gray-700">
                Operating Hours
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="operating_hours"
                  id="operating_hours"
                  value={formData.operating_hours}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g., Mon-Fri 9AM-6PM, Sat-Sun 10AM-4PM"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}