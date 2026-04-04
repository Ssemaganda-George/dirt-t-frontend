import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import CitySearchInput from '../components/CitySearchInput'

export default function Login() {
  const [, setShowEmailForm] = useState(true)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signIn, signUp, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleBackOrHome = () => {
    try {
      // If there is a previous history entry, go back. Otherwise, navigate to the home URL.
      if (window.history.length > 1) {
        navigate(-1)
      } else {
        // Use absolute URL to ensure we land on the bookings home if this page was opened directly
        window.location.href = 'https://bookings.dirt-trails.com/'
      }
    } catch (err) {
      navigate('/')
    }
  }

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      navigate(from, { replace: true })
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
      await signUp(email, password, fullName, 'tourist')
      // After creating the account, sign the user out so they must verify email before logging in
      await signOut()
    } catch (error: any) {
      setError(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    // Implement Google Sign In logic
    console.log('Google Sign In clicked')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 overflow-y-auto">
      <div className="max-w-[360px] w-full bg-white rounded-2xl shadow-md relative my-auto">

        {/* Close */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="px-4 pt-4 pb-2 text-center relative">
          <button
            onClick={handleBackOrHome}
            className="absolute left-4 top-4 text-sm text-gray-600 hover:text-gray-800"
          >
            {/* icon-only back handled elsewhere; keep accessible label */}
            Back
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Dirt Trails</h1>
          <h2 className="text-lg font-medium text-gray-900 mt-1">Welcome Back!</h2>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-3">

          {isSignUp ? (
            <form className="space-y-3" onSubmit={handleSignUpSubmit}>
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150 focus-visible:outline-none rounded-md px-1"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 text-sm">{error}</div>
              )}

              <div className="space-y-3">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input
                    id="fullName" name="fullName" type="text" required
                    className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors"
                    placeholder="Jane Doe"
                    value={fullName} onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors"
                    placeholder="Enter your email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home city <span className="text-gray-400">(optional)</span></label>
                  <CitySearchInput
                    city={homeCity}
                    onSelect={(city) => {
                      setHomeCity(city)
                    }}
                    placeholder="Search your city..."
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                      className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors"
                      placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                  <input
                    id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required
                    className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors"
                    placeholder="••••••••"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full min-h-[44px] rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors duration-150"
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button type="button" onClick={() => { setIsSignUp(false); setShowEmailForm(true) }} className="text-gray-900 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 rounded-md px-1">Sign in</button>
              </p>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150 focus-visible:outline-none rounded-md px-1"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 text-sm">{error}</div>
              )}

              <div className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors"
                    placeholder="Enter your email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                    <a href="/forgot-password" className="text-xs text-gray-700 hover:underline rounded-md px-1">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <input
                      id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                      className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-500 outline-none transition-colors"
                      placeholder="Enter your password"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full min-h-[44px] rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors duration-150"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

                <p className="text-center text-sm text-gray-500">
                New here? Create your account —{' '}
                <button type="button" onClick={() => { setIsSignUp(true); setShowEmailForm(false) }} className="text-gray-900 font-medium hover:underline">Sign up</button>
              </p>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">or</span></div>
              </div>
              <button
                onClick={handleGoogleSignIn}
                className="w-full min-h-[44px] flex items-center justify-center gap-3 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-150"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </form>
          )}

        </div>

        <div className="px-6 pb-6">
          <p className="text-[11px] leading-4 text-center text-gray-400">
            By continuing you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-600">Terms</a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}