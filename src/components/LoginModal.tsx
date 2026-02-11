import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import CitySearchInput from './CitySearchInput'
import { Eye, EyeOff } from 'lucide-react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
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

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const userProfile = await signIn(email, password)

      if (userProfile) {
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black p-4">
      <div className="max-w-sm w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close modal"
        >
          <XMarkIcon className="h-5 w-5 text-gray-600" />
        </button>
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-1 text-heading">
            Dirt Trails
          </h2>
          <p className="text-gray-600 text-sm text-elegant">
            Welcome Back!
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={isSignUp ? handleSignUpSubmit : handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {isSignUp && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  onClick={() => {
                    // TODO: Implement forgot password functionality
                    alert('Forgot password functionality coming soon!');
                  }}
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
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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

          {/* Sign in button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative mt-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        {/* Continue with Google */}
        <div className="mt-3">
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center px-3 py-2 text-sm border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue with Google
          </button>
        </div>

        {/* Toggle between sign in and sign up */}
        <div className="mt-3 text-center pb-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setEmail('')
              setPassword('')
              setConfirmPassword('')
              setFirstName('')
              setLastName('')
              setHomeCity('')
              setHomeCountry('')
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
          </div>
        </div>
      </div>

    </div>
  )
}