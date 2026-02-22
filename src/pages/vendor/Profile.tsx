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
    ,
    // Payment / payout fields
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    bank_swift: '',
    // Up to 2 mobile money payout accounts
    mobile_money_accounts: [] as { provider: string; phone: string; country_code: string; name?: string }[],
    // Local-only crypto / other payout accounts (not yet persisted server-side)
    crypto_accounts: [] as { currency?: string; address?: string; label?: string }[]
  })
  const [newPayment, setNewPayment] = useState<any>({ type: 'bank' })
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
        ,
        bank_name: (vendorData.bank_details && vendorData.bank_details.name) || vendorData.bank_name || '',
        bank_account_name: (vendorData.bank_details && vendorData.bank_details.account_name) || vendorData.bank_account_name || '',
        bank_account_number: (vendorData.bank_details && vendorData.bank_details.account_number) || vendorData.bank_account_number || '',
        bank_branch: (vendorData.bank_details && vendorData.bank_details.branch) || vendorData.bank_branch || '',
        bank_swift: (vendorData.bank_details && vendorData.bank_details.swift) || vendorData.bank_swift || '',
        mobile_money_accounts: (() => {
          const accounts = Array.isArray(vendorData.mobile_money_accounts)
            ? vendorData.mobile_money_accounts.map((m: any) => ({
                provider: m.provider || '',
                phone: String(m.phone || ''),
                country_code: String(m.country_code || '+256'),
                name: m.name || m.account_name || ''
              }))
            : (Array.isArray(vendorData.business_phones) ? vendorData.business_phones.map((p: any) => ({ provider: p.provider || '', phone: String(p.phone || ''), country_code: String(p.country_code || '+256'), name: '' })) : [])

          while (accounts.length < 2) accounts.push({ provider: '', phone: '', country_code: '+256', name: '' })
          return accounts.slice(0, 2)
        })()
        ,
        crypto_accounts: Array.isArray(vendorData.crypto_accounts) ? vendorData.crypto_accounts : []
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
          // Persist new payment fields
          bank_details: {
            name: formData.bank_name,
            account_name: formData.bank_account_name,
            account_number: formData.bank_account_number,
            branch: formData.bank_branch,
            swift: formData.bank_swift
          },
          mobile_money_accounts: formData.mobile_money_accounts,
          crypto_accounts: formData.crypto_accounts,
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
        ,
        bank_name: (vendorData.bank_details && vendorData.bank_details.name) || vendorData.bank_name || '',
        bank_account_name: (vendorData.bank_details && vendorData.bank_details.account_name) || vendorData.bank_account_name || '',
        bank_account_number: (vendorData.bank_details && vendorData.bank_details.account_number) || vendorData.bank_account_number || '',
        bank_branch: (vendorData.bank_details && vendorData.bank_details.branch) || vendorData.bank_branch || '',
        bank_swift: (vendorData.bank_details && vendorData.bank_details.swift) || vendorData.bank_swift || '',
        mobile_money_accounts: (() => {
          const accounts = Array.isArray(vendorData.mobile_money_accounts)
            ? vendorData.mobile_money_accounts.map((m: any) => ({
                provider: m.provider || '',
                phone: String(m.phone || ''),
                country_code: String(m.country_code || '+256'),
                name: m.name || m.account_name || ''
              }))
            : (Array.isArray(vendorData.business_phones) ? vendorData.business_phones.map((p: any) => ({ provider: p.provider || '', phone: String(p.phone || ''), country_code: String(p.country_code || '+256'), name: '' })) : [])

          while (accounts.length < 2) accounts.push({ provider: '', phone: '', country_code: '+256', name: '' })
          return accounts.slice(0, 2)
        })()
        ,
        crypto_accounts: Array.isArray(vendorData.crypto_accounts) ? vendorData.crypto_accounts : []
      })
    }
    setIsEditing(false)
    setMessage('')
  }

  const handleAddPayment = () => {
    if (!isEditing) return

    const type = newPayment.type

    if (type === 'bank') {
      setFormData(prev => ({
        ...prev,
        bank_name: newPayment.bank_name || prev.bank_name,
        bank_account_name: newPayment.bank_account_name || prev.bank_account_name,
        bank_account_number: newPayment.bank_account_number || prev.bank_account_number,
        bank_branch: newPayment.bank_branch || prev.bank_branch,
        bank_swift: newPayment.bank_swift || prev.bank_swift
      }))
      setMessage('Bank details added to the form. Save changes to persist.')
    } else if (type === 'mobile_money') {
      setFormData(prev => ({
        ...prev,
        mobile_money_accounts: [
          ...prev.mobile_money_accounts.filter(Boolean),
          {
            provider: newPayment.provider || '',
            phone: newPayment.phone || '',
            country_code: newPayment.country_code || '+256',
            name: newPayment.account_name || ''
          }
        ].slice(0, 4) // limit how many are kept in UI
      }))
      setMessage('Mobile money account added. Save changes to persist.')
    } else if (type === 'swift') {
      // Map swift into bank_swift field so it will be persisted with bank_details
      setFormData(prev => ({ ...prev, bank_swift: newPayment.swift_bic || prev.bank_swift, bank_name: newPayment.swift_bank_name || prev.bank_name }))
      setMessage('SWIFT/BIC noted. Save changes to persist.')
    } else if (type === 'crypto') {
      setFormData(prev => ({
        ...prev,
        crypto_accounts: [
          ...prev.crypto_accounts,
          { currency: newPayment.crypto_currency || '', address: newPayment.crypto_address || '', label: newPayment.crypto_label || '' }
        ]
      }))
      setMessage('Crypto account added locally. Backend support for persisting crypto is required before it will be stored server-side.')
    }

    // reset the newPayment form
    setNewPayment({ type: 'bank' })

    // clear message after 4s
    setTimeout(() => setMessage(''), 4000)
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone *</label>
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

        {/* Payment / Payout Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Payment Details</h3>

          <div className="space-y-4">
            {/* Bank details - stacked on mobile, two columns on >=sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="e.g., Stanbic"
                />
              </div>

              <div>
                <label htmlFor="bank_account_name" className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  name="bank_account_name"
                  id="bank_account_name"
                  value={formData.bank_account_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  placeholder="Name on the account"
                />
              </div>

              <div>
                <label htmlFor="bank_account_number" className="block text-sm font-medium text-gray-700 mt-1 mb-1">Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., 1234567890"
                />
              </div>

              <div>
                <label htmlFor="bank_branch" className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <input
                  type="text"
                  name="bank_branch"
                  id="bank_branch"
                  value={formData.bank_branch}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  placeholder="Branch name (optional)"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bank_swift" className="block text-sm font-medium text-gray-700 mb-1">SWIFT / BIC (optional)</label>
                <input
                  type="text"
                  name="bank_swift"
                  id="bank_swift"
                  value={formData.bank_swift}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., SBICUGKX"
                />
              </div>
            </div>

            {/* Mobile money accounts - compact list optimized for mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Accounts</label>
              <div className="space-y-3">
                {formData.mobile_money_accounts.map((acct, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-100 rounded-md p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600">Provider</label>
                        <input
                          type="text"
                          name={`mm_provider_${idx}`}
                          value={acct.provider}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            mobile_money_accounts: prev.mobile_money_accounts.map((m, i) => i === idx ? { ...m, provider: e.target.value } : m)
                          }))}
                          disabled={!isEditing}
                          placeholder="Provider (e.g., MTN, Airtel)"
                          className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">e.g., MTN Mobile Money, Airtel Money</p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600">Account name</label>
                        <input
                          type="text"
                          name={`mm_name_${idx}`}
                          value={acct.name || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            mobile_money_accounts: prev.mobile_money_accounts.map((m, i) => i === idx ? { ...m, name: e.target.value } : m)
                          }))}
                          disabled={!isEditing}
                          placeholder="Name on the account"
                          className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs text-gray-600">Mobile money phone</label>
                      {isEditing ? (
                        <PhoneModal
                          phone={acct.phone}
                          countryCode={acct.country_code || '+256'}
                          onPhoneChange={(phone) => setFormData(prev => ({
                            ...prev,
                            mobile_money_accounts: prev.mobile_money_accounts.map((m, i) => i === idx ? { ...m, phone } : m)
                          }))}
                          onCountryCodeChange={(countryCode) => setFormData(prev => ({
                            ...prev,
                            mobile_money_accounts: prev.mobile_money_accounts.map((m, i) => i === idx ? { ...m, country_code: countryCode } : m)
                          }))}
                          placeholder="700 000 000"
                        />
                      ) : (
                        <input
                          type="text"
                          value={acct.phone ? `${acct.country_code} ${acct.phone} ${acct.provider ? `(${acct.provider})` : ''} ${acct.name ? `- ${acct.name}` : ''}` : ''}
                          readOnly
                          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Payment Method */}
            <div className="mt-1 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Add a Payment Method</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <select
                    value={newPayment.type}
                    onChange={(e) => setNewPayment({ type: e.target.value })}
                    disabled={!isEditing}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="bank">Bank</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="swift">SWIFT / BIC</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  {/* bank fields */}
                  {newPayment.type === 'bank' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" value={newPayment.bank_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_name: e.target.value }))} disabled={!isEditing} placeholder="Bank Name — e.g., Stanbic" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.bank_account_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_account_name: e.target.value }))} disabled={!isEditing} placeholder="Account Name" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.bank_account_number || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_account_number: e.target.value }))} disabled={!isEditing} placeholder="Account Number — e.g., 1234567890" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.bank_branch || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_branch: e.target.value }))} disabled={!isEditing} placeholder="Branch (optional)" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.bank_swift || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_swift: e.target.value }))} disabled={!isEditing} placeholder="SWIFT / BIC — e.g., SBICUGKX (optional)" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm sm:col-span-2" />
                    </div>
                  )}

                  {/* mobile money fields */}
                  {newPayment.type === 'mobile_money' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" value={newPayment.provider || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, provider: e.target.value }))} disabled={!isEditing} placeholder="Provider — e.g., MTN" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.account_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, account_name: e.target.value }))} disabled={!isEditing} placeholder="Account name — e.g., ssemaganda George" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <div>
                        {isEditing ? (
                          <PhoneModal
                            phone={newPayment.phone || ''}
                            countryCode={newPayment.country_code || '+256'}
                            onPhoneChange={(phone) => setNewPayment((prev:any) => ({ ...prev, phone }))}
                            onCountryCodeChange={(countryCode) => setNewPayment((prev:any) => ({ ...prev, country_code: countryCode }))}
                            placeholder="700 000 000"
                          />
                        ) : (
                          <input type="text" value={newPayment.phone ? `${newPayment.country_code} ${newPayment.phone}` : ''} readOnly className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* swift */}
                  {newPayment.type === 'swift' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" value={newPayment.swift_bank_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, swift_bank_name: e.target.value }))} disabled={!isEditing} placeholder="Bank Name (optional)" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.swift_bic || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, swift_bic: e.target.value }))} disabled={!isEditing} placeholder="SWIFT / BIC — e.g., SBICUGKX" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                    </div>
                  )}

                  {/* crypto */}
                  {newPayment.type === 'crypto' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" value={newPayment.crypto_currency || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, crypto_currency: e.target.value }))} disabled={!isEditing} placeholder="Currency / Network — e.g., BTC" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.crypto_address || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, crypto_address: e.target.value }))} disabled={!isEditing} placeholder="Wallet address" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.crypto_label || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, crypto_label: e.target.value }))} disabled={!isEditing} placeholder="Label (optional)" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm sm:col-span-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-gray-500">Bank and Mobile Money methods will be saved to your account. Crypto/Swift are stored locally until backend support is added.</p>
                    <button onClick={handleAddPayment} disabled={!isEditing} className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50">Add</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Money Accounts</label>
          <div className="space-y-3">
            {formData.mobile_money_accounts.map((acct, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                      <input
                        type="text"
                        name={`mm_provider_${idx}`}
                        value={acct.provider}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          mobile_money_accounts: prev.mobile_money_accounts.map((m, i) => i === idx ? { ...m, provider: e.target.value } : m)
                        }))}
                        disabled={!isEditing}
                        placeholder="Provider (e.g., MTN, Airtel)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">e.g., MTN Mobile Money, Airtel Money</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account name</label>
                      <input
                        type="text"
                        name={`mm_name_${idx}`}
                        value={acct.name || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          mobile_money_accounts: prev.mobile_money_accounts.map((m, i) => i === idx ? { ...m, name: e.target.value } : m)
                        }))}
                        disabled={!isEditing}
                        placeholder="Name on the account"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile money phone</label>
                      {isEditing ? (
                        <PhoneModal
                          phone={acct.phone}
                          countryCode={acct.country_code || '+256'}
                          onPhoneChange={(phone) => setFormData(prev => ({
                            ...prev,
                            mobile_money_accounts: prev.mobile_money_accounts.map((m, i) => i === idx ? { ...m, phone } : m)
                          }))}
                          onCountryCodeChange={(countryCode) => setFormData(prev => ({
                            ...prev,
                            mobile_money_accounts: prev.mobile_money_accounts.map((m, i) => i === idx ? { ...m, country_code: countryCode } : m)
                          }))}
                          placeholder="700 000 000"
                        />
                      ) : (
                        <input
                          type="text"
                          value={acct.phone ? `${acct.country_code} ${acct.phone} ${acct.provider ? `(${acct.provider})` : ''} ${acct.name ? `- ${acct.name}` : ''}` : ''}
                          readOnly
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      )}
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Add flexible payment method */}
        <div className="mt-6 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Add a Payment Method</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select
                value={newPayment.type}
                onChange={(e) => setNewPayment({ type: e.target.value })}
                disabled={!isEditing}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="bank">Bank</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="swift">SWIFT / BIC</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              {newPayment.type === 'bank' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input type="text" value={newPayment.bank_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_name: e.target.value }))} disabled={!isEditing} placeholder="e.g., Stanbic" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input type="text" value={newPayment.bank_account_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_account_name: e.target.value }))} disabled={!isEditing} placeholder="Name on the account" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input type="text" value={newPayment.bank_account_number || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_account_number: e.target.value }))} disabled={!isEditing} placeholder="e.g., 1234567890" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <input type="text" value={newPayment.bank_branch || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_branch: e.target.value }))} disabled={!isEditing} placeholder="Branch name (optional)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT / BIC (optional)</label>
                    <input type="text" value={newPayment.bank_swift || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_swift: e.target.value }))} disabled={!isEditing} placeholder="e.g., SBICUGKX" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {newPayment.type === 'mobile_money' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                    <input type="text" value={newPayment.provider || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, provider: e.target.value }))} disabled={!isEditing} placeholder="Provider (e.g., MTN, Airtel)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    <p className="text-xs text-gray-400 mt-1">e.g., MTN Mobile Money, Airtel Money</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account name</label>
                    <input type="text" value={newPayment.account_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, account_name: e.target.value }))} disabled={!isEditing} placeholder="Name on the account" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile money phone</label>
                    {isEditing ? (
                      <PhoneModal
                        phone={newPayment.phone || ''}
                        countryCode={newPayment.country_code || '+256'}
                        onPhoneChange={(phone) => setNewPayment((prev:any) => ({ ...prev, phone }))}
                        onCountryCodeChange={(countryCode) => setNewPayment((prev:any) => ({ ...prev, country_code: countryCode }))}
                        placeholder="700 000 000"
                      />
                    ) : (
                      <input type="text" value={newPayment.phone ? `${newPayment.country_code} ${newPayment.phone}` : ''} readOnly className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                    )}
                  </div>
                </div>
              )}

              {newPayment.type === 'swift' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name (optional)</label>
                    <input type="text" value={newPayment.swift_bank_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, swift_bank_name: e.target.value }))} disabled={!isEditing} placeholder="Bank name (optional)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT / BIC</label>
                    <input type="text" value={newPayment.swift_bic || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, swift_bic: e.target.value }))} disabled={!isEditing} placeholder="e.g., SBICUGKX" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              {newPayment.type === 'crypto' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency / Network</label>
                    <input type="text" value={newPayment.crypto_currency || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, crypto_currency: e.target.value }))} disabled={!isEditing} placeholder="e.g., BTC, ETH" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" value={newPayment.crypto_address || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, crypto_address: e.target.value }))} disabled={!isEditing} placeholder="Wallet address" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label (optional)</label>
                    <input type="text" value={newPayment.crypto_label || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, crypto_label: e.target.value }))} disabled={!isEditing} placeholder="e.g., Main BTC wallet" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500">Bank and Mobile Money methods will be saved to your account. Crypto/Swift are stored locally until backend support is added.</p>
                <button onClick={handleAddPayment} disabled={!isEditing} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">Add</button>
              </div>
            </div>
          </div>

          {formData.crypto_accounts && formData.crypto_accounts.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-800">Crypto (local)</h5>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {formData.crypto_accounts.map((c, i) => (
                  <li key={i} className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2">
                    <div>
                      <div className="font-medium">{c.currency || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{c.address}</div>
                    </div>
                    <div className="text-xs text-gray-400">{c.label}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

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