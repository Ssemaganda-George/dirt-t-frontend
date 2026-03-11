import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
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
      // Sign out to clear any recovery session and redirect to login
      try { await supabase.auth.signOut() } catch {}
      setTimeout(() => navigate('/'), 1200)
    } catch (err: any) {
      console.error('reset password submit error', err)
      setMessage(err?.message || 'Could not update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Set a new password</h2>
        <p className="text-sm text-gray-500 mt-1">Choose a secure password for your account.</p>

        {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-gray-700 mb-1">New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading || !ready} className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-50">
              {loading ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </form>

        {!ready && (
          <p className="mt-3 text-xs text-gray-500">If the link does not open this page automatically, open the password reset link from your email in the same browser.</p>
        )}
      </div>
    </div>
  )
}
