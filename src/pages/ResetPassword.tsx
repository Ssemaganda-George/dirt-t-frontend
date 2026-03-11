import React, { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Try to detect an active session established by the reset link.
    // If there's no session, instruct the user to open the link from their email in the same browser.
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        if (data?.session?.user) {
          setReady(true)
        } else {
          setReady(false)
          setMessage('Open the password reset link from your email in this browser to continue.')
        }
      } catch (e) {
        if (!mounted) return
        setReady(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!newPassword || !confirmPassword) return setMessage('Please fill both fields')
    if (newPassword !== confirmPassword) return setMessage('Passwords do not match')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setMessage('Password updated. You can now sign in with your new password.')
      setSuccess(true)
      // Sign out to clear any recovery session
      try { await supabase.auth.signOut() } catch {}
    } catch (err: any) {
      console.error('reset password submit error', err)
      const msg = err?.message || ''
      if (/different from the old password/i.test(msg) || /same as old password/i.test(msg)) {
        setMessage('New password must be different from your current password. Choose a different password.')
      } else {
        setMessage(msg || 'Could not update password')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Set a new password</h2>
        <p className="text-sm text-gray-500 mt-1">Choose a secure password for your account.</p>

        {message && <div className={`mt-3 text-sm ${/different from your current password|different from the old password|same as old password/i.test(message) ? 'text-red-600' : 'text-gray-700'}`}>{message}</div>}

        {!success ? (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-gray-700 mb-1">New password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10" />
              <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Confirm new password</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10" />
              <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading || !ready} className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-50">
              {loading ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </form>
        ) : (
          <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-100 text-sm">
            <p className="font-medium text-green-700">Password reset successful</p>
            <p className="mt-2 text-gray-700">You can now sign in with your new password.</p>
            <div className="mt-4">
              <button onClick={() => navigate('/login')} className="px-4 py-2 rounded-lg bg-gray-900 text-white">Go to sign in</button>
            </div>
          </div>
        )}

        {!ready && !success && (
          <p className="mt-3 text-xs text-gray-500">If the link does not open this page automatically, open the password reset link from your email in the same browser.</p>
        )}
      </div>
    </div>
  )
}
