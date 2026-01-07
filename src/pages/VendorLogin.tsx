import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Eye, EyeOff } from 'lucide-react'

export default function VendorLogin() {
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [email, setEmail] = useState('guide@dirttrails.com')
  const [password, setPassword] = useState('guide123')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [operatingHours, setOperatingHours] = useState('')
  const [yearsInBusiness, setYearsInBusiness] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()


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

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // First create the user account
      await signUp(email, password, fullName, 'vendor')
      
      // Then create the vendor profile with business details
      const { data: user } = await supabase.auth.getUser()
      if (user.user) {
        const { error: vendorError } = await supabase
          .from('vendors')
          .insert([{
            user_id: user.user.id,
            business_name: businessName,
            business_description: businessDescription,
            business_address: businessAddress,
            business_phone: businessPhone,
            business_email: businessEmail || email,
            status: 'pending'
          }])

        if (vendorError) {
          console.error('Error creating vendor profile:', vendorError)
          setError('Account created but vendor profile setup failed. Please contact support.')
        }
      }

      navigate('/', { replace: true })
    } catch (error: any) {
      setError(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    console.log('Google Sign In clicked')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 relative my-auto">
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Business Portal Sign In
          </h2>
          <p className="text-gray-600">Sign in to manage your listings and bookings.</p>
        </div>

        {!showEmailForm && !isSignUp ? (
          <div className="space-y-6">
            {/* Log In Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 text-center">Sign in</h3>
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-full text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Continue with email
              </button>
            </div>

            {/* Sign Up Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 text-center">Create Business account</h3>
              <button
                onClick={() => { setIsSignUp(true); setShowEmailForm(false); setCurrentStep(1) }}
                className="w-full flex items-center justify-center px-4 py-3 border-2 border-blue-600 rounded-full text-base font-medium text-blue-600 bg-white hover:bg-blue-50 transition-colors"
              >
                Create Business account
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Continue with Google Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 text-center">Continue with Google</h3>
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-full text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="mt-6 text-xs text-center text-gray-500">
              <p>
                By proceeding, you agree to our{' '}
                <a href="/terms" className="text-blue-600 hover:underline">Terms of Use</a> and confirm you have read our{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy and Cookie Statement</a>.
              </p>
              <p className="mt-2">
                This site is protected by reCAPTCHA and the Google{' '}
                <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> and{' '}
                <a href="https://policies.google.com/terms" className="text-blue-600 hover:underline">Terms of Service</a> apply.
              </p>
            </div>
          </div>
        ) : isSignUp ? (
          <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium">Personal</span>
              </div>
              <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Business</span>
              </div>
              <div className={`w-8 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium">Account</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Personal Details</h3>
                  <p className="text-sm text-gray-600 mt-1">Tell us about yourself</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                      Full name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Business Details</h3>
                  <p className="text-sm text-gray-600 mt-1">Tell us about your business</p>
                </div>

                <div className="space-y-6">
                  {/* Basic Business Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Basic Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
                          Business name *
                        </label>
                        <input
                          id="businessName"
                          name="businessName"
                          type="text"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your business name"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
                          Business type *
                        </label>
                        <select
                          id="businessType"
                          name="businessType"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={businessType}
                          onChange={(e) => setBusinessType(e.target.value)}
                        >
                          <option value="">Select business type</option>
                          <option value="hotel">🏨 Hotel</option>
                          <option value="restaurant">🍽️ Restaurant</option>
                          <option value="tour-guide">🗺️ Tour Guide</option>
                          <option value="transport">🚗 Transport</option>
                          <option value="activity">🎯 Activity Provider</option>
                          <option value="other">🏢 Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700">
                        Business description *
                      </label>
                      <textarea
                        id="businessDescription"
                        name="businessDescription"
                        rows={3}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe your business, services offered, and what makes you unique..."
                        value={businessDescription}
                        onChange={(e) => setBusinessDescription(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Location & Contact Information */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Location & Contact</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700">
                          Business address *
                        </label>
                        <input
                          id="businessAddress"
                          name="businessAddress"
                          type="text"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Street address, city, country"
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700">
                          Business phone *
                        </label>
                        <input
                          id="businessPhone"
                          name="businessPhone"
                          type="tel"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="+256 XXX XXX XXX"
                          value={businessPhone}
                          onChange={(e) => setBusinessPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-700">
                          Business email
                        </label>
                        <input
                          id="businessEmail"
                          name="businessEmail"
                          type="email"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="business@email.com"
                          value={businessEmail}
                          onChange={(e) => setBusinessEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="businessWebsite" className="block text-sm font-medium text-gray-700">
                          Website/Social media
                        </label>
                        <input
                          id="businessWebsite"
                          name="businessWebsite"
                          type="url"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://yourwebsite.com or @socialhandle"
                          value={businessWebsite}
                          onChange={(e) => setBusinessWebsite(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Operations */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">Business Operations</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="operatingHours" className="block text-sm font-medium text-gray-700">
                          Operating hours
                        </label>
                        <input
                          id="operatingHours"
                          name="operatingHours"
                          type="text"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Mon-Fri 9AM-6PM"
                          value={operatingHours}
                          onChange={(e) => setOperatingHours(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="yearsInBusiness" className="block text-sm font-medium text-gray-700">
                          Years in business
                        </label>
                        <select
                          id="yearsInBusiness"
                          name="yearsInBusiness"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={yearsInBusiness}
                          onChange={(e) => setYearsInBusiness(e.target.value)}
                        >
                          <option value="">Select experience</option>
                          <option value="0-1">Less than 1 year</option>
                          <option value="1-3">1-3 years</option>
                          <option value="3-5">3-5 years</option>
                          <option value="5-10">5-10 years</option>
                          <option value="10+">More than 10 years</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <form className="space-y-6" onSubmit={handleSignUpSubmit}>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Create Account</h3>
                  <p className="text-sm text-gray-600 mt-1">Set up your password</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </button>
                </div>
              </form>
            )}

            {currentStep === 1 && (
              <div className="text-center text-sm text-gray-600">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setCurrentStep(1); setShowEmailForm(true) }}
                  className="underline"
                >
                  Already have an account? Sign in
                </button>
              </div>
            )}
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <button
              type="button"
              onClick={() => setShowEmailForm(false)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
            >
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center text-sm text-gray-600">
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setShowEmailForm(false) }}
                className="underline"
              >
                Don't have an account? Create one
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
