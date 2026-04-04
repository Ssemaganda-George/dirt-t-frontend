import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function VerifyOtpPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const phoneFromState = (state as any)?.phone as string | undefined
  const [phone, setPhone] = useState<string>(phoneFromState || '')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState<number>(0)

  useEffect(() => {
    if (resendCountdown <= 0) return
    const t = setInterval(() => setResendCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCountdown])

  useEffect(() => {
    // If arrived without phone, try to read from query param
    if (!phone) {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('phone')
      if (q) setPhone(q)
    }
  }, [phone])

  const resend = async () => {
    if (!phone) return setMessage('Missing phone number')
    try {
      setMessage(null)
      setLoading(true)
      const { error } = await (supabase.auth as any).signInWithOtp({ phone })
      if (error) throw error
      setMessage('OTP resent')
      setResendCountdown(60)
    } catch (err: any) {
      console.error('resend otp error', err)
      setMessage(err?.message || 'Could not resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!phone) return setMessage('Missing phone number')
    if (!otp || otp.trim().length === 0) return setMessage('Enter the OTP')
    try {
      setLoading(true)
      setMessage(null)
      const { error } = await (supabase.auth as any).verifyOtp({ phone, token: otp.trim(), type: 'sms' })
      if (error) throw error
      // On success a session should be created; navigate to set password
      navigate('/reset-password')
    } catch (err: any) {
      console.error('verify otp error', err)
      setMessage(err?.message || 'Could not verify OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Enter verification code</h1>
        <p className="mt-2 text-sm text-gray-500">We sent an OTP to your phone. Enter it below to continue.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
            <div className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50">{phone}</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">One-time code</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" placeholder="123456" className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm" />
          </div>

          {message && <div className="text-sm text-gray-700">{message}</div>}

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg text-sm">{loading ? 'Verifying…' : 'Verify'}</button>
            <button type="button" disabled={resendCountdown > 0 || loading} onClick={resend} className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-60">
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <button onClick={() => navigate('/forgot-password')} className="text-sm text-gray-600 hover:underline">Change phone</button>
        </div>
      </div>
    </div>
  )
}
