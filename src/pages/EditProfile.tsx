import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, User, Phone, Camera, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import type { Tourist } from '../lib/database'

export default function EditProfile() {
  const { user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [touristData, setTouristData] = useState<Tourist | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    emergency_contact: '',
    emergency_phone: '',
    emergency_relationship: '',
    emergency_email: '',
    emergency_address: '',
    travel_preferences: '',
    dietary_restrictions: '',
    medical_conditions: ''
  })

  useEffect(() => {
    const fetchTouristData = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('tourists')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error('Error fetching tourist data:', error)
        } else if (data) {
          setTouristData(data)
        }
      } catch (error) {
        console.error('Error fetching tourist data:', error)
      }
    }

    fetchTouristData()
  }, [user])

  useEffect(() => {
    if (profile || touristData) {
      setFormData({
        full_name: profile?.full_name || '',
        phone: touristData?.phone || '',
        emergency_contact: touristData?.emergency_contact || '',
        emergency_phone: touristData?.emergency_phone || '',
        emergency_relationship: touristData?.emergency_relationship || '',
        emergency_email: touristData?.emergency_email || '',
        emergency_address: touristData?.emergency_address || '',
        travel_preferences: touristData?.travel_preferences || '',
        dietary_restrictions: touristData?.dietary_restrictions || '',
        medical_conditions: touristData?.medical_conditions || ''
      })
    }
  }, [profile, touristData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfilePicture(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async () => {
    if (!profilePicture || !user) return

    setUploadingImage(true)
    setError('')

    try {
      // Convert base64 to blob
      const response = await fetch(profilePicture)
      const blob = await response.blob()
      
      // Create file name
      const fileName = `profile-${user.id}-${Date.now()}.jpg`
      
      // Upload to Supabase storage
      const { error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      await updateProfile({ avatar_url: publicUrl })
      setSuccess('Profile picture updated successfully!')
      
    } catch (error) {
      console.error('Error uploading image:', error)
      setError('Failed to upload profile picture. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = () => {
    setProfilePicture(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!user) throw new Error('No user logged in')

      // Update basic profile fields
      await updateProfile({
        full_name: formData.full_name
      })

      // Update or create tourist record
      const touristUpdates = {
        user_id: user.id,
        phone: formData.phone,
        emergency_contact: formData.emergency_contact,
        emergency_phone: formData.emergency_phone,
        emergency_relationship: formData.emergency_relationship,
        emergency_email: formData.emergency_email,
        emergency_address: formData.emergency_address,
        travel_preferences: formData.travel_preferences,
        dietary_restrictions: formData.dietary_restrictions,
        medical_conditions: formData.medical_conditions,
        updated_at: new Date().toISOString()
      }

      if (touristData) {
        // Update existing tourist record
        const { error: touristError } = await supabase
          .from('tourists')
          .update(touristUpdates)
          .eq('user_id', user.id)

        if (touristError) throw touristError
      } else {
        // Create new tourist record
        const { error: touristError } = await supabase
          .from('tourists')
          .insert(touristUpdates)

        if (touristError) throw touristError
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => navigate('/profile'), 2000)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Profile
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
            <p className="text-gray-600 mt-1">Update your personal information and travel preferences</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="relative">
                {profilePicture ? (
                  <div className="relative">
                    <img
                      src={profilePicture}
                      alt="Profile preview"
                      className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Current profile"
                    className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="h-24 w-24 bg-blue-600 flex items-center justify-center text-white text-3xl font-bold rounded-full">
                    {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 hover:bg-blue-700 transition-colors rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="ml-6">
                <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                <p className="text-gray-600">Upload a new profile picture</p>
                <p className="text-sm text-gray-500 mt-1">JPG, PNG or GIF. Max size 5MB.</p>
                {profilePicture && (
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={uploadingImage}
                    className="mt-2 bg-green-600 text-white px-4 py-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Picture'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide detailed information about your emergency contact person.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="emergency_contact" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="emergency_contact"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name of emergency contact"
                />
              </div>

              <div>
                <label htmlFor="emergency_relationship" className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship *
                </label>
                <select
                  id="emergency_relationship"
                  name="emergency_relationship"
                  value={formData.emergency_relationship}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="relative">Other Relative</option>
                  <option value="friend">Friend</option>
                  <option value="colleague">Colleague</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="emergency_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="emergency_phone"
                  name="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label htmlFor="emergency_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="emergency_email"
                  name="emergency_email"
                  value={formData.emergency_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="emergency_address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  id="emergency_address"
                  name="emergency_address"
                  rows={3}
                  value={formData.emergency_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter complete address of emergency contact"
                />
              </div>
            </div>
          </div>

          {/* Travel Preferences */}
          <div className="bg-white shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Travel Preferences</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="travel_preferences" className="block text-sm font-medium text-gray-700 mb-2">
                  Travel Preferences
                </label>
                <textarea
                  id="travel_preferences"
                  name="travel_preferences"
                  rows={3}
                  value={formData.travel_preferences}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your travel preferences (e.g., adventure, relaxation, cultural experiences)"
                />
              </div>

              <div>
                <label htmlFor="dietary_restrictions" className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Restrictions
                </label>
                <textarea
                  id="dietary_restrictions"
                  name="dietary_restrictions"
                  rows={2}
                  value={formData.dietary_restrictions}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="List any dietary restrictions or preferences"
                />
              </div>

              <div>
                <label htmlFor="medical_conditions" className="block text-sm font-medium text-gray-700 mb-2">
                  Medical Conditions
                </label>
                <textarea
                  id="medical_conditions"
                  name="medical_conditions"
                  rows={2}
                  value={formData.medical_conditions}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="List any medical conditions or allergies (optional)"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="h-5 w-5 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}