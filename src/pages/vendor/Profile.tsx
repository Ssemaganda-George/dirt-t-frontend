import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import CitySearchInput from '../../components/CitySearchInput'
import PhoneModal from '../../components/PhoneModal'

export default function Profile() {
  const { profile, user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [vendorData, setVendorData] = useState<any>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    phone_country_code: '+256',
    email: '',
    home_city: '',
    home_country: '',
    business_name: '',
    business_description: '',
    business_address: '',
    business_city: '',
    business_country: '',
    business_phone: '',
    business_phone_country_code: '+256',
    business_phones: [] as { phone: string; country_code: string }[],
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
      // Split full name into first and last name
      const nameParts = (profile.full_name || '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      setFormData({
        first_name: vendorData.first_name || firstName,
        last_name: vendorData.last_name || lastName,
        phone: vendorData.vendor_phone || '',
        phone_country_code: vendorData.vendor_phone_country_code || '+256',
        email: profile.email || '',
        home_city: (profile as any).home_city || '',
        home_country: (profile as any).home_country || '',
        business_name: vendorData.business_name || '',
        business_description: vendorData.business_description || '',
        business_address: vendorData.business_address || '',
        business_city: vendorData.business_city || '',
        business_country: vendorData.business_country || '',
        business_phone: vendorData.business_phone || '',
        business_phone_country_code: vendorData.business_phone_country_code || '+256',
        business_phones: (() => {
          const phones = Array.isArray(vendorData.business_phones) 
            ? vendorData.business_phones
              .filter((phoneObj: any) => phoneObj && typeof phoneObj === 'object' && phoneObj.phone)
              .map((phoneObj: any) => ({
                phone: String(phoneObj.phone || ''),
                country_code: String(phoneObj.country_code || '+256')
              }))
            : (vendorData.business_phone ? [{
                phone: String(vendorData.business_phone),
                country_code: String(vendorData.business_phone_country_code || '+256')
              }] : []);
          
          // Ensure we have exactly 2 phone fields
          while (phones.length < 2) {
            phones.push({ phone: '', country_code: '+256' });
          }
          return phones.slice(0, 2);
        })(),
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
          full_name: `${formData.first_name} ${formData.last_name}`.trim(),
          phone: formData.phone,
          phone_country_code: formData.phone_country_code,
          home_city: formData.home_city,
          home_country: formData.home_country,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update vendor data
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          business_name: formData.business_name,
          business_description: formData.business_description,
          business_address: formData.business_address,
          business_city: formData.business_city,
          business_country: formData.business_country,
          business_phone: formData.business_phone,
          business_phone_country_code: formData.business_phone_country_code,
          business_phones: formData.business_phones,
          business_email: formData.business_email,
          business_website: formData.business_website,
          operating_hours: formData.operating_hours,
          vendor_phone: formData.phone,
          vendor_phone_country_code: formData.phone_country_code,
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
      // Split full name into first and last name
      const nameParts = (profile.full_name || '').split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      setFormData({
        first_name: vendorData.first_name || firstName,
        last_name: vendorData.last_name || lastName,
        phone: vendorData.vendor_phone || '',
        phone_country_code: vendorData.vendor_phone_country_code || '+256',
        email: profile.email || '',
        home_city: (profile as any).home_city || '',
        home_country: (profile as any).home_country || '',
        business_name: vendorData.business_name || '',
        business_description: vendorData.business_description || '',
        business_address: vendorData.business_address || '',
        business_city: vendorData.business_city || '',
        business_country: vendorData.business_country || '',
        business_phone: vendorData.business_phone || '',
        business_phone_country_code: vendorData.business_phone_country_code || '+256',
        business_phones: (() => {
          const phones = Array.isArray(vendorData.business_phones) 
            ? vendorData.business_phones
              .filter((phoneObj: any) => phoneObj && typeof phoneObj === 'object' && phoneObj.phone)
              .map((phoneObj: any) => ({
                phone: String(phoneObj.phone || ''),
                country_code: String(phoneObj.country_code || '+256')
              }))
            : (vendorData.business_phone ? [{
                phone: String(vendorData.business_phone),
                country_code: String(vendorData.business_phone_country_code || '+256')
              }] : []);
          
          // Ensure we have exactly 2 phone fields
          while (phones.length < 2) {
            phones.push({ phone: '', country_code: '+256' });
          }
          return phones.slice(0, 2);
        })(),
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
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="h-7 w-40 bg-gray-200 rounded-lg animate-pulse" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your personal and business information</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.includes('successfully') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-semibold shrink-0">
            {profile.full_name?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{formData.first_name && formData.last_name ? `${formData.first_name} ${formData.last_name}` : profile?.full_name || 'Vendor'}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Business · Member since {new Date(profile.created_at || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              type="text"
              name="business_name"
              id="business_name"
              value={formData.business_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter your business name"
            />
          </div>
          <div>
            <label htmlFor="business_email" className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
            <input
              type="email"
              name="business_email"
              id="business_email"
              value={formData.business_email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter business email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
            {isEditing ? (
              <PhoneModal
                phone={formData.business_phone}
                countryCode={formData.business_phone_country_code}
                onPhoneChange={(phone) => setFormData(prev => ({ ...prev, business_phone: phone }))}
                onCountryCodeChange={(countryCode) => setFormData(prev => ({ ...prev, business_phone_country_code: countryCode }))}
                placeholder="700 000 000"
              />
            ) : (
              <input
                type="text"
                value={formData.business_phone ? `${formData.business_phone_country_code} ${formData.business_phone}` : ''}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Business Phones</label>
            <div className="space-y-2">
              {Array.from({ length: 2 }, (_, index) => {
                const phoneObj = formData.business_phones[index] || { phone: '', country_code: '+256' }
                return (
                  <div key={index} className="flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex-1">
                        <PhoneModal
                          phone={phoneObj.phone}
                          countryCode={phoneObj.country_code}
                          onPhoneChange={(phone) => setFormData(prev => ({
                            ...prev,
                            business_phones: prev.business_phones.map((item, i) =>
                              i === index ? { ...item, phone } : item
                            )
                          }))}
                          onCountryCodeChange={(countryCode) => setFormData(prev => ({
                            ...prev,
                            business_phones: prev.business_phones.map((item, i) =>
                              i === index ? { ...item, country_code: countryCode } : item
                            )
                          }))}
                          placeholder="700 000 000"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={phoneObj.phone ? `${phoneObj.country_code} ${phoneObj.phone}` : ''}
                        readOnly
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <label htmlFor="business_website" className="block text-sm font-medium text-gray-700 mb-1">Business Website</label>
            <input
              type="url"
              name="business_website"
              id="business_website"
              value={formData.business_website}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business City</label>
            {isEditing ? (
              <CitySearchInput
                city={formData.business_city}
                onSelect={(city, country) => {
                  setFormData(prev => ({
                    ...prev,
                    business_city: city,
                    business_country: country
                  }))
                }}
                placeholder="Select business city"
              />
            ) : (
              <input
                type="text"
                value={formData.business_city}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            )}
          </div>

          <div>
            <label htmlFor="business_address" className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
            <input
              type="text"
              name="business_address"
              id="business_address"
              value={formData.business_address}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter your business address"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="business_description" className="block text-sm font-medium text-gray-700 mb-1">Business Description</label>
          <textarea
            name="business_description"
            id="business_description"
            rows={4}
            value={formData.business_description}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
            placeholder="Describe your business..."
          />
        </div>

        <div className="mt-4">
          <label htmlFor="operating_hours" className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
          <input
            type="text"
            name="operating_hours"
            id="operating_hours"
            value={formData.operating_hours}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="e.g., Mon-Fri 9AM-6PM, Sat-Sun 10AM-4PM"
          />
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter your first name"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter your last name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            {isEditing ? (
              <PhoneModal
                phone={formData.phone}
                countryCode={formData.phone_country_code}
                onPhoneChange={(phone) => setFormData(prev => ({ ...prev, phone }))}
                onCountryCodeChange={(countryCode) => setFormData(prev => ({ ...prev, phone_country_code: countryCode }))}
                placeholder="700 000 000"
              />
            ) : (
              <input
                type="text"
                value={formData.phone ? `${formData.phone_country_code} ${formData.phone}` : ''}
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Home City</label>
            <CitySearchInput
              city={formData.home_city}
              onSelect={(city, country) => {
                setFormData(prev => ({
                  ...prev,
                  home_city: city,
                  home_country: country
                }))
              }}
              placeholder="Search your city..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value="Business"
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

    </div>
  )
}