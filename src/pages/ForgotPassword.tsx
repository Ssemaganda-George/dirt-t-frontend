import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import PhoneModal from '../components/PhoneModal'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const [method, setMethod] = useState<'email' | 'sms'>('email')
  const [phoneCountry, setPhoneCountry] = useState('+256')
  const [phone, setPhone] = useState('')
  
  const [resendCountdown, setResendCountdown] = useState<number>(0)

  useEffect(() => {
    if (resendCountdown <= 0) return
    const t = setInterval(() => {
      setResendCountdown(c => {
        if (c <= 1) {
          clearInterval(t)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [resendCountdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const redirectTo = `${window.location.origin}/reset-password`
      if (method === 'email') {
        const res = await (supabase.auth as any).resetPasswordForEmail(email, { redirectTo })
        if (res?.error) throw res.error
        setMessage('We sent a reset link — check your inbox.')
        setResendCountdown(60)
      } else {
        // SMS path: send OTP to phone to allow the user to verify identity
        let country = (phoneCountry || '').trim()
        if (country && !country.startsWith('+')) country = `+${country}`
        const digits = (phone || '').replace(/[^0-9]/g, '')
        const phoneE164 = `${country}${digits}`
        if (!/^[+][0-9]{6,15}$/.test(phoneE164)) throw new Error('Phone must be in international format, e.g. +256712345678')
        const { error } = await (supabase.auth as any).signInWithOtp({ phone: phoneE164 })
        if (error) {
          const msg = (error as any).message || JSON.stringify(error)
          if (/provider|unsupported|not configured/i.test(msg)) {
            throw new Error('SMS provider not configured for this project. Configure an SMS provider in Supabase Auth settings.')
          }
          throw error
        }
        setMessage('OTP sent to your phone — check your messages.')
        setResendCountdown(60)
      }
    } catch (err: any) {
      console.error('reset password error', err)
      setMessage(err?.message || 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-500">Enter your email and we'll send a link to reset your password.</p>

        <div className="mt-6">
          <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
            <button type="button" onClick={() => setMethod('email')} className={`flex-1 py-2 text-sm rounded-lg ${method === 'email' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>Email</button>
            <button type="button" onClick={() => setMethod('sms')} className={`flex-1 py-2 text-sm rounded-lg ${method === 'sms' ? 'bg-white shadow-sm' : 'text-gray-600'}`}>SMS</button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {method === 'email' ? (
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
                {resendCountdown > 0 ? (
                  <div className="w-full px-4 py-3 border border-gray-100 rounded-lg text-sm text-gray-700 bg-gray-50">{email}</div>
                ) : (
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" />
                )}
              </div>
            ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <PhoneModal
                    phone={phone}
                    countryCode={phoneCountry}
                    onPhoneChange={(p) => setPhone(p)}
                    onCountryCodeChange={(c) => setPhoneCountry(c)}
                  />
                </div>
            )}

            {message && (
              <div className="text-sm text-gray-700">{message}</div>
            )}

            <div className="pt-2">
              <button type="submit" disabled={loading || resendCountdown > 0} className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60">
                {loading ? 'Sending…' : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : (message ? (method === 'email' ? 'Resend reset email' : 'Resend OTP via SMS') : (method === 'email' ? 'Send reset email' : 'Send OTP via SMS'))}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-4 text-center">
          <button onClick={() => navigate('/login')} className="text-sm text-gray-600 hover:underline">Back to sign in</button>
        </div>
      </div>
    </div>
  )
}
