import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import CitySearchInput from './CitySearchInput'
import { Eye, EyeOff } from 'lucide-react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { getServiceById } from '../lib/database'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  restrictToScanPage?: boolean
  serviceId?: string
}

export default function LoginModal({ isOpen, onClose, onSuccess, restrictToScanPage = false, serviceId }: LoginModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showAccountTypePrompt, setShowAccountTypePrompt] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [homeCountry, setHomeCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const resetAuthFields = () => {
    setError('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFirstName('')
    setLastName('')
    setHomeCity('')
    setHomeCountry('')
    setAgreedToTerms(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userProfile = await signIn(email, password)

      if (userProfile) {
        // Check authorization for scan pages
        if (restrictToScanPage && serviceId) {
          const isAdmin = userProfile.role === 'admin'
          let isEventOwner = false

          if (!isAdmin) {
            // Check if user is the vendor who owns this service
            try {
              const service = await getServiceById(serviceId)
              isEventOwner = service && service.vendor_id === userProfile.id
            } catch (serviceError) {
              console.error('Error checking service ownership:', serviceError)
            }
          }

          if (!isAdmin && !isEventOwner) {
            setError('This is Secure mode, high level authorisation access required. Contact Admin!')
            setLoading(false)
            return
          }
        }

        if (onSuccess) {
          // Custom success callback provided - call it instead of navigating
          onSuccess()
        } else {
          // Default behavior - navigate based on role
          if (userProfile.role === 'admin') {
            navigate('/admin')
          } else if (userProfile.role === 'vendor') {
            if (userProfile.status === 'pending') {
              navigate('/vendor-pending')
            } else {
              navigate('/vendor')
            }
          } else {
            navigate('/')
          }
        }
        onClose()
      } else {
        setError('Failed to load user profile. Please try again.')
      }
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
      await signUp(email, password, firstName, lastName, 'tourist', homeCity.trim() || undefined, homeCountry.trim() || undefined)
      navigate('/')
      onClose()
    } catch (error: any) {
      setError(error.message || 'Failed to sign up')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    // Implement Google Sign In logic
    console.log('Google Sign In clicked')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-4">
      <div className="max-w-md w-full max-h-[92vh] sm:max-h-[90vh] bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close modal"
        >
          <XMarkIcon className="h-5 w-5 text-gray-600" />
        </button>
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">

        {/* Header */}
        <div className="text-center mb-4 sm:mb-5">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 text-heading">
            Dirt Trails
          </h2>
          <p className="text-gray-600 text-sm text-elegant">
            Welcome Back!
          </p>
        </div>

        {showAccountTypePrompt ? (
          <div className="space-y-4 pb-2">
            <p className="text-sm text-gray-700 text-center font-medium">Select the account to create</p>

            <button
              type="button"
              onClick={() => {
                setShowAccountTypePrompt(false)
                setIsSignUp(true)
                resetAuthFields()
              }}
              className="w-full min-h-[48px] rounded-xl border border-gray-900 bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-gray-800 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            >
              Tourist
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAccountTypePrompt(false)
                onClose()
                navigate('/vendor-login?signup=true')
              }}
              className="w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            >
              Business
            </button>

            <button
              type="button"
              onClick={() => setShowAccountTypePrompt(false)}
              className="w-full text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 rounded-md py-1"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
        <>
        {/* Form */}
        <form className="space-y-4 sm:space-y-5" onSubmit={isSignUp ? handleSignUpSubmit : handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isSignUp && (
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setShowAccountTypePrompt(true)
                resetAuthFields()
              }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ← Back
            </button>
          )}

          {isSignUp && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-colors"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-colors"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-colors"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Home city
              </label>
              <CitySearchInput
                city={homeCity}
                onSelect={(c, co) => { setHomeCity(c); setHomeCountry(co) }}
                placeholder="Search your city (optional)..."
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  className="text-xs text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                className="w-full px-4 py-3 pr-10 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-colors"
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
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full px-4 py-3 pr-10 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-colors"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="flex items-start gap-2">
              <input
                id="agreeTerms"
                name="agreeTerms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              />
              <label htmlFor="agreeTerms" className="text-xs text-gray-600 leading-relaxed">
                I agree to the{' '}
                <a href="/terms" className="text-gray-900 hover:text-gray-700 underline">
                  Terms and Conditions
                </a>
                .
              </label>
            </div>
          )}

          {/* Sign in button */}
          <div>
            <button
              type="submit"
              disabled={loading || (isSignUp && !agreedToTerms)}
              className="w-full min-h-[48px] px-4 py-3.5 text-sm bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </div>

          {!isSignUp && (
            <button
              type="button"
              onClick={() => setShowAccountTypePrompt(true)}
              className="w-full min-h-[48px] rounded-xl border border-gray-900 bg-white px-4 py-3.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
            >
              New here? Create your account — Sign up
            </button>
          )}

        </form>

        {/* Divider */}
        <div className="relative mt-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Continue with Google */}
        <div className="mt-4">
          <button
            onClick={handleGoogleSignIn}
            className="w-full min-h-[48px] flex items-center justify-center px-4 py-3.5 text-sm border border-gray-300 rounded-xl font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
          >
            Continue with Google
          </button>
        </div>

        {/* Toggle between sign in and sign up */}
        {isSignUp && (
          <div className="mt-4 pb-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setShowAccountTypePrompt(false)
                resetAuthFields()
              }}
              className="w-full text-center text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 rounded-md py-1"
            >
              Already have an account? Sign in
            </button>
          </div>
        )}
        </>
        )}
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-100">
            <p className="text-[11px] leading-4 text-center text-gray-500">
              By continuing you agree to our{' '}
              <a href="/terms" className="underline hover:text-gray-600">Terms</a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}