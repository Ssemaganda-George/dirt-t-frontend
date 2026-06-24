import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { updateAuthUser } from '../../services/AuthService'
import CitySearchInput from '../../components/CitySearchInput'
import PhoneModal from '../../components/PhoneModal'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, user } = useAuth()
  const paymentSectionRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (location.state?.openPaymentSection) {
      setIsEditing(true)
      setTimeout(() => {
        paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate])

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

      // Update vendor data. If an encryption passphrase is provided via
      // VITE_ENCRYPTION_PASSPHRASE the code will also write encrypted blobs
      // into *_encrypted columns. This is optional; plain JSON is still written
      // to existing JSONB columns for backward compatibility.

      let bank_details_encrypted: string | null = null
      let mobile_money_accounts_encrypted: string | null = null
      let crypto_accounts_encrypted: string | null = null

      const passphrase = (import.meta as any).env?.VITE_ENCRYPTION_PASSPHRASE as string | undefined
      if (passphrase) {
        try {
          const cryptoLib = await import('../../lib/crypto')
          bank_details_encrypted = await cryptoLib.encryptJSON(passphrase, {
            name: formData.bank_name,
            account_name: formData.bank_account_name,
            account_number: formData.bank_account_number,
            branch: formData.bank_branch,
            swift: formData.bank_swift
          })
          mobile_money_accounts_encrypted = await cryptoLib.encryptJSON(passphrase, formData.mobile_money_accounts)
          crypto_accounts_encrypted = await cryptoLib.encryptJSON(passphrase, formData.crypto_accounts || [])
        } catch (err) {
          // If encryption fails, log and continue — do not block save.
          console.error('Encryption failed:', err)
        }
      }

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
          // Optional encrypted columns
          bank_details_encrypted: bank_details_encrypted,
          mobile_money_accounts_encrypted: mobile_money_accounts_encrypted,
          crypto_accounts_encrypted: crypto_accounts_encrypted,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (vendorError) throw vendorError

      // Update email if changed (requires auth update)
      if (formData.email !== profile?.email) {
        const { error: authError } = await updateAuthUser({
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
    }

    // reset the newPayment form
    setNewPayment({ type: 'bank' })

    // clear message after 4s
    setTimeout(() => setMessage(''), 4000)
  }

  if (!profile || !vendorData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-slate-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
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
          <h1 className="text-xl font-semibold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal and business information</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="min-h-[40px] px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
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
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center text-white text-2xl font-semibold shrink-0">
            {profile.full_name?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{formData.first_name && formData.last_name ? `${formData.first_name} ${formData.last_name}` : profile?.full_name || 'Vendor'}</h2>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <p className="text-xs text-slate-400 mt-1">
              Business · Member since {new Date(profile.created_at || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="business_name" className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
            <input
              type="text"
              name="business_name"
              id="business_name"
              value={formData.business_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Enter your business name"
            />
          </div>
          <div>
            <label htmlFor="business_email" className="block text-sm font-medium text-slate-700 mb-1">Business Email</label>
            <input
              type="email"
              name="business_email"
              id="business_email"
              value={formData.business_email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Enter business email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Phone *</label>
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
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Business Phones</label>
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
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <label htmlFor="business_website" className="block text-sm font-medium text-slate-700 mb-1">Business Website</label>
            <input
              type="url"
              name="business_website"
              id="business_website"
              value={formData.business_website}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>

        {/* Payment / Payout Details */}
        <div ref={paymentSectionRef} className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-3">Payment Details</h3>

          <div className="space-y-4">
            {/* Bank details - stacked on mobile, two columns on >=sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full min-h-[40px] border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="e.g., Stanbic"
                />
              </div>

              <div>
                <label htmlFor="bank_account_name" className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
                <input
                  type="text"
                  name="bank_account_name"
                  id="bank_account_name"
                  value={formData.bank_account_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  placeholder="Name on the account"
                />
              </div>

              <div>
                <label htmlFor="bank_account_number" className="block text-sm font-medium text-slate-700 mt-1 mb-1">Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., 1234567890"
                />
              </div>

              <div>
                <label htmlFor="bank_branch" className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <input
                  type="text"
                  name="bank_branch"
                  id="bank_branch"
                  value={formData.bank_branch}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  placeholder="Branch name (optional)"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bank_swift" className="block text-sm font-medium text-slate-700 mb-1">SWIFT / BIC (optional)</label>
                <input
                  type="text"
                  name="bank_swift"
                  id="bank_swift"
                  value={formData.bank_swift}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  placeholder="e.g., SBICUGKX"
                />
              </div>
            </div>

            {/* Mobile money accounts - compact list optimized for mobile */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Money Accounts</label>
              <div className="space-y-3">
                {formData.mobile_money_accounts.map((acct, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-md p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-600">Provider</label>
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
                          className="w-full border border-slate-200 rounded-md px-2 py-2 text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">e.g., MTN Mobile Money, Airtel Money</p>
                      </div>

                      <div>
                        <label className="text-xs text-slate-600">Account name</label>
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
                          className="w-full border border-slate-200 rounded-md px-2 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs text-slate-600">Mobile money phone</label>
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
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Payment Method */}
            <div className="mt-1 border-t pt-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Add a Payment Method</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                  <select
                    value={newPayment.type}
                    onChange={(e) => setNewPayment({ type: e.target.value })}
                    disabled={!isEditing}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="bank">Bank</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  {/* bank fields */}
                  {newPayment.type === 'bank' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" value={newPayment.bank_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_name: e.target.value }))} disabled={!isEditing} placeholder="Bank Name — e.g., Stanbic" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.bank_account_name || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_account_name: e.target.value }))} disabled={!isEditing} placeholder="Account Name" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.bank_account_number || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_account_number: e.target.value }))} disabled={!isEditing} placeholder="Account Number — e.g., 1234567890" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.bank_branch || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_branch: e.target.value }))} disabled={!isEditing} placeholder="Branch (optional)" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                      <input type="text" value={newPayment.bank_swift || ''} onChange={(e) => setNewPayment((prev:any) => ({ ...prev, bank_swift: e.target.value }))} disabled={!isEditing} placeholder="SWIFT / BIC — e.g., SBICUGKX (optional)" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm sm:col-span-2" />
                    </div>
                   )}

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-slate-500">Bank and Mobile Money methods will be saved to your account.</p>
                    <button onClick={handleAddPayment} disabled={!isEditing} className="min-h-[36px] px-3 py-2 bg-slate-900 text-white rounded-md text-sm hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:opacity-50">Add</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              id="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Enter your first name"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              id="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Enter your last name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full min-h-[40px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
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
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Home City</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <input
              type="text"
              value="Business"
              disabled
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
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
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

    </div>
  )
}