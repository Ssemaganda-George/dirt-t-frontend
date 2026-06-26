import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  clearLocalAuthStorage,
  getCurrentUser,
  isEmailConfirmed,
  signOut as authSignOut,
} from '../services/AuthService'
import { Eye, EyeOff, Store } from 'lucide-react'
import CitySearchInput from '../components/CitySearchInput'
import { COUNTRIES } from '../lib/countries'

const VENDOR_DRAFT_KEY = 'dt_vendor_signup_draft'

export default function VendorLogin() {
  const [isSignUp, setIsSignUp] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [personalCity, setPersonalCity] = useState('')
  const [personalCountry, setPersonalCountry] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessPhoneCountryCode, setBusinessPhoneCountryCode] = useState('+256')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [yearsInBusiness, setYearsInBusiness] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showStepValidationErrors, setShowStepValidationErrors] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Country search state for business phone
  const [businessPhoneCountrySearch, setBusinessPhoneCountrySearch] = useState('')
  const [businessPhoneCountryDropdownOpen, setBusinessPhoneCountryDropdownOpen] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const openSignUp = searchParams.get('signup')

    if (openSignUp === 'false') {
      setIsSignUp(false)
      setCurrentStep(1)
      setError('')
      return
    }

    if (openSignUp === 'true') {
      setIsSignUp(true)
      setCurrentStep(1)
      setError('')
    }
  }, [location.search])

  // Restore draft on mount (signup form only, never restores password)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VENDOR_DRAFT_KEY)
      if (!saved) return
      const d = JSON.parse(saved)
      if (d.fullName) setFullName(d.fullName)
      if (d.email) setEmail(d.email)
      if (d.personalCity) setPersonalCity(d.personalCity)
      if (d.personalCountry) setPersonalCountry(d.personalCountry)
      if (d.businessName) setBusinessName(d.businessName)
      if (d.businessType) setBusinessType(d.businessType)
      if (d.businessDescription) setBusinessDescription(d.businessDescription)
      if (d.businessAddress) setBusinessAddress(d.businessAddress)
      if (d.businessCity) setBusinessCity(d.businessCity)
      if (d.businessPhone) setBusinessPhone(d.businessPhone)
      if (d.businessPhoneCountryCode) setBusinessPhoneCountryCode(d.businessPhoneCountryCode)
      if (d.businessEmail) setBusinessEmail(d.businessEmail)
      if (d.businessWebsite) setBusinessWebsite(d.businessWebsite)
      if (d.yearsInBusiness) setYearsInBusiness(d.yearsInBusiness)
    } catch { /* ignore — localStorage unavailable or corrupt */ }
  }, [])

  // Save draft whenever signup form fields change
  useEffect(() => {
    if (!isSignUp) return
    try {
      localStorage.setItem(VENDOR_DRAFT_KEY, JSON.stringify({
        fullName, email, personalCity, personalCountry,
        businessName, businessType, businessDescription,
        businessAddress, businessCity, businessPhone,
        businessPhoneCountryCode, businessEmail, businessWebsite, yearsInBusiness
      }))
    } catch { /* ignore — localStorage unavailable */ }
  }, [isSignUp, fullName, email, personalCity, personalCountry, businessName, businessType,
      businessDescription, businessAddress, businessCity, businessPhone,
      businessPhoneCountryCode, businessEmail, businessWebsite, yearsInBusiness])

  // Filtered countries for business phone
  const filteredBusinessPhoneCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(businessPhoneCountrySearch.toLowerCase()) ||
    country.code.includes(businessPhoneCountrySearch)
  )

  // Close business phone country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (businessPhoneCountryDropdownOpen && !(event.target as Element).closest('.business-phone-country-dropdown')) {
        setBusinessPhoneCountryDropdownOpen(false)
        setBusinessPhoneCountrySearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [businessPhoneCountryDropdownOpen])

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return fullName.trim() !== '' && email.trim() !== '' && email.includes('@')
      case 2:
        return businessName.trim() !== '' && businessType !== '' &&
               businessAddress.trim() !== '' && businessCity.trim() !== '' &&
               businessPhone.trim() !== ''
      case 3:
        return password.length >= 8 && password === confirmPassword
      default:
        return false
    }
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setError('')
      setShowStepValidationErrors(false)
      setCurrentStep(currentStep + 1)
    } else {
      setShowStepValidationErrors(true)
      setError('Please fill in all required fields correctly.')
    }
  }

  const handlePrevStep = () => {
    setError('')
    setShowStepValidationErrors(false)
    setCurrentStep(currentStep - 1)
  }

  const resetForm = () => {
    try { localStorage.removeItem(VENDOR_DRAFT_KEY) } catch { /* ignore */ }
    setCurrentStep(1)
    setFullName('')
    setEmail('')
    setPersonalCity('')
    setPersonalCountry('')
    setBusinessName('')
    setBusinessType('')
    setBusinessDescription('')
    setBusinessAddress('')
    setBusinessCity('')
    setBusinessPhone('')
    setBusinessPhoneCountryCode('+256')
    setBusinessEmail('')
    setBusinessWebsite('')
    setYearsInBusiness('')
    setPassword('')
    setConfirmPassword('')
    setAgreedToTerms(false)
    setShowStepValidationErrors(false)
    setError('')
  }

  const getFieldClass = (invalid: boolean) =>
    invalid
      ? 'w-full border border-red-400 px-4 py-3 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors'
      : 'w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors'

  const getLabelClass = (invalid: boolean) => {
    return `block text-sm font-medium mb-2 tracking-tight antialiased ${invalid ? 'text-red-600' : 'text-gray-700'}`
  }

  const stepOneHasErrors = showStepValidationErrors && currentStep === 1
  const fullNameInvalid = stepOneHasErrors && fullName.trim() === ''
  const emailInvalid = stepOneHasErrors && (email.trim() === '' || !email.includes('@'))
  const personalCityInvalid = false

  const stepTwoHasErrors = showStepValidationErrors && currentStep === 2
  const businessNameInvalid = stepTwoHasErrors && businessName.trim() === ''
  const businessTypeInvalid = stepTwoHasErrors && businessType === ''
  const businessDescriptionInvalid = false
  const businessCityInvalid = stepTwoHasErrors && businessCity.trim() === ''
  const businessAddressInvalid = stepTwoHasErrors && businessAddress.trim() === ''
  const businessPhoneInvalid = stepTwoHasErrors && businessPhone.trim() === ''

  const stepThreeHasErrors = showStepValidationErrors && currentStep === 3
  const passwordInvalid = stepThreeHasErrors && password.length < 8
  const confirmPasswordInvalid = stepThreeHasErrors && (confirmPassword === '' || password !== confirmPassword)


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      navigate('/vendor', { replace: true })
    } catch (error: any) {
      setError(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // First create the user account (this also creates profile and basic vendor record)
      await signUp(email, password, firstName, lastName, 'vendor', personalCity.trim() || undefined, personalCountry.trim() || undefined)

      // Get the current user
      const user = await getCurrentUser()
      if (user) {
        // Ensure profile exists
        const { error: profileCheckError } = await supabase.from('profiles').upsert({
          id: user.id,
          email: email,
          full_name: fullName,
          role: 'vendor',
        }, { onConflict: 'id' })
        
        if (profileCheckError) {
          console.error('Profile creation error:', profileCheckError)
        }

        // Update or create the vendor record with business details
        const { error: vendorError } = await supabase
          .from('vendors')
          .upsert({
            user_id: user.id,
            business_name: businessName,
            business_type: businessType,
            business_city: businessCity,
            business_description: businessDescription,
            business_email: businessEmail || email,
            business_address: businessAddress,
            business_phone: `${businessPhoneCountryCode}${businessPhone}`,
            business_website: businessWebsite,
            years_in_business: yearsInBusiness || null,
            status: 'pending'
          }, { onConflict: 'user_id' })

        if (vendorError) {
          console.error('Error updating business profile:', vendorError)
          setError('Account created but business profile setup failed. Please contact support.')
          return
        }
      }

      try { localStorage.removeItem(VENDOR_DRAFT_KEY) } catch { /* ignore */ }

      const currentUser = await getCurrentUser()
      if (currentUser && !isEmailConfirmed(currentUser)) {
        await authSignOut()
        clearLocalAuthStorage()
      }

      navigate('/vendor-pending')
    } catch (error: any) {
      setError(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <Store className="h-12 w-12 sm:h-14 sm:w-14 text-gray-900 mx-auto mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2 sm:mb-3 tracking-tight antialiased">Business Portal</h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto leading-relaxed antialiased">
              Join our network of trusted service providers. Manage your listings, bookings, and grow your business with DirtTrails.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Authentication Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8 mb-8 sm:mb-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 tracking-tight antialiased">
                {isSignUp ? 'Create Business Account' : 'Business Sign In'}
              </h2>
              <p className="text-gray-600 leading-snug antialiased">
                {isSignUp ? 'Join our network of trusted service providers' : 'Access your business dashboard and manage your business'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-lg mb-6 text-sm">
                {successMessage}
              </div>
            )}

            {!isSignUp ? (
              // Sign In Form
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 tracking-tight antialiased">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 tracking-tight antialiased">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 text-white py-3.5 px-4 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  {loading ? 'Signing in...' : 'Sign In to Business Portal'}
                </button>

                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true)
                      resetForm()
                    }}
                    className="text-sm text-emerald-700 font-medium hover:text-emerald-800 transition-colors"
                  >
                    Don't have an account? Create one
                  </button>
                </div>
              </form>
            ) : (
              // Sign Up Form - Multi-step Process
              <div className="space-y-5 sm:space-y-6">
                <form onSubmit={handleSignUpSubmit} className="space-y-5 sm:space-y-6">

                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep > 1) {
                        handlePrevStep()
                        return
                      }

                      setIsSignUp(false)
                      resetForm()
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    ← Back
                  </button>

                  {/* Approval gate disclosure */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
                    <p className="font-semibold">How it works</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                      <li>Verify your email (link sent on sign up)</li>
                      <li>Admin reviews your application — typically 1–3 business days</li>
                      <li>Once approved, you can create and publish listings</li>
                    </ol>
                  </div>

                  {/* Step progress indicator */}
                  <div className="flex items-center justify-between px-1">
                    {([
                      { n: 1, label: 'Your Details' },
                      { n: 2, label: 'Business' },
                      { n: 3, label: 'Security' }
                    ] as { n: number; label: string }[]).map(({ n, label }, i) => (
                      <React.Fragment key={n}>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                            currentStep > n
                              ? 'bg-emerald-600 text-white'
                              : currentStep === n
                                ? 'border-2 border-emerald-600 text-emerald-700 bg-white'
                                : 'bg-gray-200 text-gray-400'
                          }`}>
                            {currentStep > n ? '✓' : n}
                          </div>
                          <span className={`text-xs whitespace-nowrap ${currentStep === n ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>
                            {label}
                          </span>
                        </div>
                        {i < 2 && (
                          <div className={`flex-1 h-0.5 mx-3 mb-5 ${currentStep > n ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Step 1: Personal Information */}
                  {currentStep === 1 && (
                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                      <div>
                        <label className={getLabelClass(fullNameInvalid)}>Full name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={getFieldClass(fullNameInvalid)}
                          placeholder="Your full name"
                          required
                        />
                      </div>

                      <div>
                        <label className={getLabelClass(emailInvalid)}>Personal/Business Email (Used for verification)</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={getFieldClass(emailInvalid)}
                          placeholder="your@email.com"
                          required
                        />
                      </div>

                      <div>
                        <label className={getLabelClass(personalCityInvalid)}>Home city <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                        <div className={personalCityInvalid ? 'rounded-xl border border-red-400 p-0.5' : ''}>
                          <CitySearchInput
                            city={personalCity}
                            onSelect={(c, co) => { setPersonalCity(c); setPersonalCountry(co) }}
                            placeholder="Search your city..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Business Information */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight antialiased">Business Details</h4>
                        <p className="text-gray-600 text-sm antialiased">Tell us about your business</p>
                      </div>

                      <div className="space-y-5">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                          <h5 className="text-base font-semibold text-gray-900 mb-4 tracking-tight antialiased">Basic Information</h5>

                          <div className="space-y-4">
                            <div>
                              <label className={getLabelClass(businessNameInvalid)}>Business name *</label>
                              <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className={getFieldClass(businessNameInvalid)}
                                placeholder="Enter your business name"
                                required
                              />
                            </div>

                            <div>
                              <label className={getLabelClass(businessTypeInvalid)}>Business type *</label>
                              <select
                                value={businessType}
                                onChange={(e) => setBusinessType(e.target.value)}
                                className={getFieldClass(businessTypeInvalid)}
                                required
                              >
                                <option value="">Select business type</option>
                                <option value="hotel">Hotel / Resort</option>
                                <option value="restaurant">Restaurant / Café</option>
                                <option value="transport">Transport Service</option>
                                <option value="activity">Activity / Experience</option>
                                <option value="tour">Tour Operator / Safari</option>
                                <option value="shop">Shop / Retail</option>
                                <option value="event_venue">Event Venue</option>
                                <option value="other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className={getLabelClass(businessDescriptionInvalid)}>Business description <span className="text-gray-400 font-normal text-xs">(optional — you can add this later)</span></label>
                              <textarea
                                value={businessDescription}
                                onChange={(e) => setBusinessDescription(e.target.value)}
                                className={getFieldClass(businessDescriptionInvalid)}
                                placeholder="Describe your business, services offered, and what makes you unique..."
                                rows={4}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                          <h5 className="text-base font-semibold text-gray-900 mb-4 tracking-tight antialiased">Location & Contact</h5>

                          <div className="space-y-4">
                            <div>
                              <label className={getLabelClass(businessCityInvalid)}>Business city *</label>
                              <div className={businessCityInvalid ? 'rounded-xl border border-red-400 p-0.5' : ''}>
                                <CitySearchInput
                                  city={businessCity}
                                  onSelect={(c) => setBusinessCity(c)}
                                  placeholder="City"
                                />
                              </div>
                            </div>

                            <div>
                              <label className={getLabelClass(businessAddressInvalid)}>Business address *</label>
                              <input
                                type="text"
                                value={businessAddress}
                                onChange={(e) => setBusinessAddress(e.target.value)}
                                className={getFieldClass(businessAddressInvalid)}
                                placeholder="e.g. 15 Kampala Road"
                              />
                            </div>

                            <div>
                              <label className={getLabelClass(businessPhoneInvalid)}>Business phone *</label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative business-phone-country-dropdown w-full sm:w-auto sm:flex-shrink-0">
                                  <button
                                    type="button"
                                    className={`${businessPhoneInvalid ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'} border px-3 py-3 rounded-xl focus:ring-2 transition-colors bg-white flex items-center justify-between w-full sm:min-w-[90px] text-sm font-medium`}
                                    onClick={() => setBusinessPhoneCountryDropdownOpen(!businessPhoneCountryDropdownOpen)}
                                  >
                                    <span className="truncate">
                                      {businessPhoneCountryCode}
                                    </span>
                                    <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {businessPhoneCountryDropdownOpen && (
                                    <div className="absolute top-full left-0 z-50 w-full sm:w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                      <div className="p-2 border-b">
                                        <input
                                          type="text"
                                          placeholder="Search country..."
                                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-gray-400"
                                          value={businessPhoneCountrySearch}
                                          onChange={(e) => setBusinessPhoneCountrySearch(e.target.value)}
                                        />
                                      </div>
                                      <div className="max-h-40 overflow-y-auto">
                                        {filteredBusinessPhoneCountries.map((country) => (
                                          <button
                                            key={country.code + country.name}
                                            type="button"
                                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-sm"
                                            onClick={() => {
                                              setBusinessPhoneCountryCode(country.code)
                                              setBusinessPhoneCountrySearch('')
                                              setBusinessPhoneCountryDropdownOpen(false)
                                            }}
                                          >
                                            <span className="text-sm">{country.name}</span>
                                            <span className="text-sm text-gray-500 ml-auto">{country.code}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="tel"
                                  value={businessPhone}
                                  onChange={(e) => setBusinessPhone(e.target.value)}
                                  className={`${businessPhoneInvalid ? 'border-red-400 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-emerald-500 focus:border-emerald-500'} flex-1 border px-4 py-3 rounded-xl focus:ring-2 transition-colors`}
                                  placeholder="700 000 000"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 tracking-tight antialiased">Business email</label>
                              <input
                                type="email"
                                value={businessEmail}
                                onChange={(e) => setBusinessEmail(e.target.value)}
                                className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                placeholder="business@email.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 tracking-tight antialiased">Website/Social media</label>
                              <input
                                type="url"
                                value={businessWebsite}
                                onChange={(e) => setBusinessWebsite(e.target.value)}
                                className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                placeholder="https://yourwebsite.com or @socialhandle"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                          <h5 className="text-base font-semibold text-gray-900 mb-4 tracking-tight antialiased">Business Operations</h5>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 tracking-tight antialiased">Years in business</label>
                              <select
                                value={yearsInBusiness}
                                onChange={(e) => setYearsInBusiness(e.target.value)}
                                className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                              >
                                <option value="">Select years in business</option>
                                <option value="0-1">0-1 years</option>
                                <option value="2-5">2-5 years</option>
                                <option value="6-10">6-10 years</option>
                                <option value="11-20">11-20 years</option>
                                <option value="20+">20+ years</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Account Setup */}
                  {currentStep === 3 && (
                    <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                      <div>
                        <label className={getLabelClass(passwordInvalid)}>Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={getFieldClass(passwordInvalid)}
                            placeholder="Create a password (min 6 characters)"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className={getLabelClass(confirmPasswordInvalid)}>Confirm Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`${getFieldClass(confirmPasswordInvalid)} pr-12`}
                            placeholder="Confirm your password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <input
                          id="vendorAgreeTerms"
                          name="vendorAgreeTerms"
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <label htmlFor="vendorAgreeTerms" className="text-xs text-gray-600 leading-relaxed">
                          I agree to the{' '}
                          <a href="/terms" className="text-emerald-700 hover:text-emerald-800 underline">
                            Terms and Conditions
                          </a>
                          .
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex flex-row gap-3 mt-7 sm:mt-8">
                    {currentStep < 3 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="w-full min-w-0 whitespace-nowrap bg-gray-900 text-white py-3.5 px-3 sm:px-4 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading || !agreedToTerms}
                        className="w-full min-w-0 whitespace-nowrap bg-emerald-600 text-white py-3.5 px-3 sm:px-4 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {loading ? 'Creating account...' : 'Create Business Account'}
                      </button>
                    )}
                  </div>

                  <div className="text-center mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false)
                        resetForm()
                      }}
                        className="text-sm text-emerald-700 font-medium hover:text-emerald-800 transition-colors"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
