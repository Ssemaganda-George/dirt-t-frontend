import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getServiceClient } from '../lib/serviceClient'
import { Eye, EyeOff, Store, User, Shield } from 'lucide-react'

export default function VendorLogin() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessCountry, setBusinessCountry] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [yearsInBusiness, setYearsInBusiness] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return fullName.trim() !== '' && email.trim() !== '' && email.includes('@')
      case 2:
        return businessName.trim() !== '' && businessType !== '' && businessDescription.trim() !== '' &&
               businessAddress.trim() !== '' && businessCity.trim() !== '' && businessCountry.trim() !== '' &&
               businessPhone.trim() !== ''
      case 3:
        return password.length >= 6 && password === confirmPassword
      default:
        return false
    }
  }

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setError('')
      setCurrentStep(currentStep + 1)
    } else {
      setError('Please fill in all required fields correctly.')
    }
  }

  const handlePrevStep = () => {
    setError('')
    setCurrentStep(currentStep - 1)
  }

  const resetForm = () => {
    setCurrentStep(1)
    setFullName('')
    setEmail('')
    setBusinessName('')
    setBusinessType('')
    setBusinessDescription('')
    setBusinessAddress('')
    setBusinessCity('')
    setBusinessCountry('')
    setBusinessPhone('')
    setBusinessEmail('')
    setBusinessWebsite('')
    setYearsInBusiness('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }


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
      // First create the user account (this also creates profile and basic vendor record)
      await signUp(email, password, fullName, 'vendor')

      // Get the current user
      const { data: user } = await supabase.auth.getUser()
      if (user.user) {
        // Ensure profile exists
        const { error: profileCheckError } = await supabase.from('profiles').upsert({
          id: user.user.id,
          email: email,
          full_name: fullName,
          role: 'vendor',
        }, { onConflict: 'id' })
        
        if (profileCheckError) {
          console.error('Profile creation error:', profileCheckError)
        }

        // Update or create the vendor record with business details
        const serviceClient = getServiceClient()
        const { error: vendorError } = await serviceClient
          .from('vendors')
          .upsert({
            user_id: user.user.id,
            business_name: businessName,
            business_description: businessDescription,
            business_email: businessEmail || email,
            business_address: businessAddress,
            business_city: businessCity,
            business_country: businessCountry,
            business_phone: businessPhone,
            business_website: businessWebsite,
            years_in_business: yearsInBusiness ? (() => {
              switch (yearsInBusiness) {
                case '0-1': return 0;
                case '2-5': return 3;
                case '6-10': return 8;
                case '11-20': return 15;
                case '20+': return 25;
                default: return null;
              }
            })() : null,
            status: 'pending'
          }, { onConflict: 'user_id' })

        if (vendorError) {
          console.error('Error updating business profile:', vendorError)
          setError('Account created but business profile setup failed. Please contact support.')
          return
        }
      }

      navigate('/', { replace: true })
    } catch (error: any) {
      setError(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Store className="h-20 w-20 text-white mx-auto mb-6" />
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight antialiased">Business Portal</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed antialiased">
              Join our network of trusted service providers. Manage your listings, bookings, and grow your business with DirtTrails.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Benefits Section */}
        <div className="bg-white shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-3xl font-black text-black mb-8 tracking-tight antialiased">Why Join Our Business Network?</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <User className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Easy Management</h3>
              <p className="text-gray-700 leading-snug antialiased">Simple tools to manage your listings, bookings, and customer communications all in one place.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <Store className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Grow Your Business</h3>
              <p className="text-gray-700 leading-snug antialiased">Access thousands of travelers seeking authentic Ugandan experiences and local services.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-black flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-4 tracking-tight antialiased">Secure & Reliable</h3>
              <p className="text-gray-700 leading-snug antialiased">Secure payment processing, verified customer reviews, and dedicated support for businesses.</p>
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="bg-white shadow-sm border border-gray-200 p-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-black mb-4 tracking-tight antialiased">
                {isSignUp ? 'Create Business Account' : 'Business Sign In'}
              </h2>
              <p className="text-gray-700 leading-snug antialiased">
                {isSignUp ? 'Join our network of trusted service providers' : 'Access your business dashboard and manage your business'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {!isSignUp ? (
              // Sign In Form
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors pr-12"
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
                  className="w-full bg-black text-white py-5 px-10 rounded-xl font-black text-xl hover:bg-gray-800 active:bg-gray-900 focus:bg-gray-800 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 shadow-lg hover:shadow-xl active:shadow-2xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500"
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
                    className="bg-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-700 active:bg-blue-800 focus:bg-blue-700 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl active:shadow-2xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Don't have an account? Create one
                  </button>
                </div>
              </form>
            ) : (
              // Sign Up Form - Multi-step Process
              <div className="space-y-6">
                <form onSubmit={handleSignUpSubmit} className="space-y-6">

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  {/* Step 1: Personal Information */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Your Full Names</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                          placeholder="Your full name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Your Personal Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 2: Business Information */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-4">
                        <h4 className="text-lg font-bold text-black mb-2 tracking-tight antialiased">Business Details</h4>
                        <p className="text-gray-600 text-sm antialiased">Tell us about your business</p>
                      </div>

                      <div className="space-y-4">
                        <div className="border-t pt-4">
                          <h5 className="text-md font-semibold text-black mb-4 tracking-tight antialiased">Basic Information</h5>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Business name *</label>
                              <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                placeholder="Enter your business name"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Business type *</label>
                              <select
                                value={businessType}
                                onChange={(e) => setBusinessType(e.target.value)}
                                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                required
                              >
                                <option value="">Select business type</option>
                                <option value="hotel">Hotel/Resort</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="transport">Transport Service</option>
                                <option value="activity">Activity/Experience</option>
                                <option value="other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Business description *</label>
                              <textarea
                                value={businessDescription}
                                onChange={(e) => setBusinessDescription(e.target.value)}
                                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                placeholder="Describe your business, services offered, and what makes you unique..."
                                rows={4}
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h5 className="text-md font-semibold text-black mb-4 tracking-tight antialiased">Location & Contact</h5>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Business address *</label>
                              <input
                                type="text"
                                value={businessAddress}
                                onChange={(e) => setBusinessAddress(e.target.value)}
                                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                placeholder="Street address"
                                required
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">City *</label>
                                <input
                                  type="text"
                                  value={businessCity}
                                  onChange={(e) => setBusinessCity(e.target.value)}
                                  className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                  placeholder="City"
                                  required
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Country *</label>
                                <input
                                  type="text"
                                  value={businessCountry}
                                  onChange={(e) => setBusinessCountry(e.target.value)}
                                  className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                  placeholder="Country"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Business phone *</label>
                              <input
                                type="tel"
                                value={businessPhone}
                                onChange={(e) => setBusinessPhone(e.target.value)}
                                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                placeholder="+256 XXX XXX XXX"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Business email</label>
                              <input
                                type="email"
                                value={businessEmail}
                                onChange={(e) => setBusinessEmail(e.target.value)}
                                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                placeholder="business@email.com"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Website/Social media</label>
                              <input
                                type="url"
                                value={businessWebsite}
                                onChange={(e) => setBusinessWebsite(e.target.value)}
                                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                                placeholder="https://yourwebsite.com or @socialhandle"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h5 className="text-md font-semibold text-black mb-4 tracking-tight antialiased">Business Operations</h5>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Years in business</label>
                              <select
                                value={yearsInBusiness}
                                onChange={(e) => setYearsInBusiness(e.target.value)}
                                className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
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
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
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
                        <label className="block text-sm font-bold text-black mb-2 tracking-tight antialiased">Confirm Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex space-x-4 mt-8">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="flex-1 bg-gray-300 text-gray-800 py-5 px-8 rounded-xl font-bold text-lg hover:bg-gray-400 active:bg-gray-500 focus:bg-gray-400 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 shadow-md hover:shadow-lg active:shadow-xl focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                      >
                        Previous
                      </button>
                    )}

                    {currentStep < 3 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 bg-black text-white py-5 px-8 rounded-xl font-black text-xl hover:bg-gray-800 active:bg-gray-900 focus:bg-gray-800 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl active:shadow-2xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white py-5 px-8 rounded-xl font-black text-xl hover:bg-green-700 active:bg-green-800 focus:bg-green-700 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100 shadow-lg hover:shadow-xl active:shadow-2xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      className="bg-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-700 active:bg-blue-800 focus:bg-blue-700 hover:scale-105 active:scale-95 focus:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl active:shadow-2xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
