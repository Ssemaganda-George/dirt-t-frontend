import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function Settings() {
  const { profile, updateProfile } = useAuth()
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    bookingReminders: true,
    marketingEmails: false,
    serviceUpdates: true
  })

  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'UTC',
    theme: 'light',
    currency: 'UGX'
  })

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="h-7 w-32 bg-gray-200 rounded-lg animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-11 bg-gray-200 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const notificationItems = [
    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
    { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive push notifications in browser' },
    { key: 'bookingReminders', label: 'Booking Reminders', description: 'Get reminded about new bookings' },
    { key: 'serviceUpdates', label: 'Service Updates', description: 'Notifications about service status changes' },
    { key: 'marketingEmails', label: 'Marketing Emails', description: 'Receive promotional emails and updates' },
  ]

  // Security modals
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [showLoginHistory, setShowLoginHistory] = useState(false)

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Two-factor state
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>((profile as any)?.two_factor_enabled || false)

  // MFA contact methods
  const [mfaPhone, setMfaPhone] = useState<string>((profile as any)?.phone || '')
  const [mfaPhoneCountry, setMfaPhoneCountry] = useState<string>((profile as any)?.phone_country_code || '+256')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaMessage, setMfaMessage] = useState<string | null>(null)

  // Login history
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false)
  const [loginHistory, setLoginHistory] = useState<any[] | null>(null)
  const [loginHistoryError, setLoginHistoryError] = useState<string | null>(null)
  const loginHistoryRef = useRef<any[] | null>(null)
  const pollingRef = useRef(false)

  // keep ref in sync with state for background updates
  useEffect(() => {
    loginHistoryRef.current = loginHistory
  }, [loginHistory])

  const openLoginHistory = async (background = false) => {
    if (!background) setShowLoginHistory(true)
    if (!background) setLoginHistoryLoading(true)
    setLoginHistoryError(null)
    try {
      // Try direct client-side read of public.login_history first (requires table to be readable by the user)
      try {
        const { data: clientData, error: clientErr } = await supabase
          .from('login_history')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(200)

        if (!clientErr && clientData) {
          const newRows = (clientData || []).slice(0, 3)
          if (background) {
            const prev = loginHistoryRef.current || []
            const prevTop = prev[0]?.created_at
            const newTop = newRows[0]?.created_at
            if (prevTop === newTop) return
            setLoginHistory(newRows)
          } else {
            setLoginHistory(newRows)
          }
          return
        }
        // If clientErr exists, fall through to server API (may be permissions)
      } catch (e) {
        // ignore and fall back to server API
      }

      const apiBase = (import.meta.env && (import.meta.env.VITE_API_BASE as string)) || ''
      const res = await fetch(`${apiBase}/api/get-login-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id })
      })
      const json = await res.json()
      if (!res.ok) {
        console.warn('get-login-history error', json)
        if (!background) setLoginHistory(null)
        if (!background) setLoginHistoryError(json?.error || 'No login history available. Contact support if you need access to raw session logs.')
      } else {
        const newRows = (json.sessions || []).slice(0, 3)
        if (background) {
          const prev = loginHistoryRef.current || []
          const prevTop = prev[0]?.created_at
          const newTop = newRows[0]?.created_at
          if (prevTop === newTop) return
          setLoginHistory(newRows)
        } else {
          setLoginHistory(newRows)
        }
      }
    } catch (err: any) {
      console.error('Error fetching login history:', err)
      if (!background) setLoginHistoryError('Could not fetch login history')
    } finally {
      if (!background) setLoginHistoryLoading(false)
    }
  }

  // Subscribe to realtime inserts to login_history while modal is open
  useEffect(() => {
    if (!showLoginHistory || !profile?.id) return
    let chan: any = null
    try {
      chan = supabase
        .channel('public:login_history')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'login_history', filter: `user_id=eq.${profile.id}` }, (payload: any) => {
          try {
            const newRow = payload.new
            setLoginHistory(prev => {
              const prevArr = prev || []
              // if top entry is same created_at, ignore
              if (prevArr[0] && prevArr[0].created_at === newRow.created_at) return prevArr
              // merge and dedupe by created_at
              const merged = [newRow, ...prevArr]
              const seen = new Set<string>()
              const deduped: any[] = []
              for (const it of merged) {
                const key = it.id || it.created_at || JSON.stringify(it)
                if (!seen.has(key)) {
                  seen.add(key)
                  deduped.push(it)
                }
                if (deduped.length >= 3) break
              }
              return deduped
            })
          } catch (e) {
            console.warn('error handling login_history realtime payload', e)
          }
        })
        .subscribe()
    } catch (e) {
      console.warn('Could not subscribe to login_history realtime:', e)
      chan = null
    }

    return () => {
      try {
        if (chan) chan.unsubscribe()
      } catch (e) {
        // ignore
      }
    }
  }, [showLoginHistory, profile?.id])

  // Polling fallback: refresh login history every 5s while modal is open
  useEffect(() => {
    if (!showLoginHistory) return
    let id: any = null
    // initial fetch (show loader)
    openLoginHistory(false)
    try {
      id = setInterval(() => {
        if (pollingRef.current) return
        pollingRef.current = true
        openLoginHistory(true).finally(() => {
          pollingRef.current = false
        })
      }, 5000)
    } catch (e) {
      console.warn('login history polling failed to start', e)
    }
    return () => {
      if (id) clearInterval(id)
    }
  }, [showLoginHistory, profile?.id])

  const submitChangePassword = async () => {
    setPasswordMessage(null)
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('Please fill all fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match')
      return
    }
    setPasswordLoading(true)
    try {
      // Re-authenticate to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword })
      if (signInError) {
        setPasswordMessage('Current password is incorrect')
        return
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) {
        setPasswordMessage('Could not update password')
      } else {
        setPasswordMessage('Password updated successfully')
        setShowChangePassword(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      console.error('change password error', err)
      setPasswordMessage('An unexpected error occurred')
    } finally {
      setPasswordLoading(false)
    }
  }

  const toggleTwoFactor = async () => {
    setTwoFactorLoading(true)
    try {
      // Best-effort: persist to profile if backend supports this field
      try {
        if (updateProfile) await updateProfile({ two_factor_enabled: !twoFactorEnabled } as any)
      } catch (e) {
        // ignore — best-effort only
      }
      setTwoFactorEnabled(prev => !prev)
    } finally {
      setTwoFactorLoading(false)
    }
  }

  const savePhoneToProfile = async () => {
    setMfaMessage(null)
    setMfaLoading(true)
    try {
      if (updateProfile) await updateProfile({ phone: mfaPhone, phone_country_code: mfaPhoneCountry } as any)
      setMfaMessage('Phone saved')
    } catch (e: any) {
      console.error('save phone error', e)
      setMfaMessage('Could not save phone')
    } finally {
      setMfaLoading(false)
    }
  }

  const sendMfaOtp = async (method: 'email' | 'sms') => {
    setMfaMessage(null)
    setMfaLoading(true)
    try {
      if (method === 'email') {
        const { error } = await supabase.auth.signInWithOtp({ email: profile.email }) as any
        if ((error as any)) throw error
        setMfaMessage('OTP/email sent to your email address')
      } else {
        if (!mfaPhone) throw new Error('No phone number set')
        // Ensure E.164 formatting: country code should include +, e.g. +256
        let country = (mfaPhoneCountry || '').trim()
        if (country && !country.startsWith('+')) country = `+${country}`
        // remove non-digit chars from phone
        const digits = (mfaPhone || '').replace(/[^0-9]/g, '')
        const phone = `${country}${digits}`
        if (!/^[+][0-9]{6,15}$/.test(phone)) throw new Error('Phone must be in international format, e.g. +256712345678')

        const { error } = await supabase.auth.signInWithOtp({ phone }) as any
        if ((error as any)) {
          // detect common provider misconfiguration
          const msg = (error as any).message || (error as any).error_description || JSON.stringify(error)
          if (/provider|unsupported|not configured/i.test(msg)) {
            throw new Error('SMS provider not configured for this project. Configure an SMS provider (e.g., Twilio) in Supabase Auth settings.')
          }
          throw error
        }
        setMfaMessage('OTP sent to your phone')
      }
    } catch (e: any) {
      console.error('send mfa otp error', e)
      setMfaMessage(e?.message || 'Could not send OTP — check Supabase Auth SMS provider settings')
    } finally {
      setMfaLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your notifications, preferences, and security</p>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Notifications</h3>
        <div className="space-y-4">
          {notificationItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
              <button
                onClick={() => handleNotificationChange(item.key, !(notifications as any)[item.key])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                  (notifications as any)[item.key] ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    (notifications as any)[item.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              value={preferences.language}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
              className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 bg-white"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={preferences.timezone}
              onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
              className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 bg-white"
            >
              <option value="UTC">UTC</option>
              <option value="EAT">East Africa Time</option>
              <option value="EST">Eastern Time</option>
              <option value="PST">Pacific Time</option>
              <option value="GMT">Greenwich Mean Time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <select
              value={preferences.theme}
              onChange={(e) => handlePreferenceChange('theme', e.target.value)}
              className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 bg-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={preferences.currency}
              onChange={(e) => handlePreferenceChange('currency', e.target.value)}
              className="w-full min-h-[40px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 bg-white"
            >
              <option value="UGX">UGX (Ugandan Shilling)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (British Pound)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Security</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowChangePassword(true)} className="min-h-[40px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20">
            Change Password
          </button>
          <button onClick={() => setShowTwoFactor(true)} className="min-h-[40px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20">
            Enable Two-Factor Authentication
          </button>
          <button onClick={openLoginHistory} className="min-h-[40px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20">
            View Login History
          </button>
        </div>
      </div>
      {/* MFA Contacts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact methods for MFA</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div className="sm:col-span-1">
              <label className="block text-xs text-gray-600 mb-1">Country</label>
              <input value={mfaPhoneCountry} onChange={(e) => setMfaPhoneCountry(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Phone number</label>
              <div className="flex gap-2">
                <input value={mfaPhone} onChange={(e) => setMfaPhone(e.target.value)} placeholder="712345678" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <button onClick={savePhoneToProfile} disabled={mfaLoading} className="px-3 py-2 rounded-lg bg-gray-900 text-white">{mfaLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-sm font-medium">Email (primary)</p>
              <p className="text-xs text-gray-500">{profile.email}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => sendMfaOtp('email')} disabled={mfaLoading} className="px-3 py-2 rounded-lg bg-white border">Send test email</button>
              <button onClick={() => sendMfaOtp('sms')} disabled={mfaLoading} className="px-3 py-2 rounded-lg bg-white border">Send OTP to phone</button>
            </div>
          </div>
          {mfaMessage && <p className="text-xs text-gray-600">{mfaMessage}</p>}
        </div>
      </div>
      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Change Password</h3>
            <p className="text-xs text-gray-500 mb-4">Enter your current password and choose a new secure password.</p>
            <div className="space-y-3">
              <div className="relative">
                <input type={showCurrentPassword ? 'text' : 'password'} placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10" />
                <button type="button" onClick={() => setShowCurrentPassword(v => !v)} aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <input type={showNewPassword ? 'text' : 'password'} placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10" />
                <button type="button" onClick={() => setShowNewPassword(v => !v)} aria-label={showNewPassword ? 'Hide new password' : 'Show new password'} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-10" />
                <button type="button" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {passwordMessage && <p className="text-xs text-red-600 mt-2">{passwordMessage}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowChangePassword(false)} className="px-3 py-2 rounded-lg bg-white border">Cancel</button>
              <button onClick={submitChangePassword} disabled={passwordLoading} className="px-4 py-2 rounded-lg bg-gray-900 text-white">{passwordLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Modal */}
      {showTwoFactor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Two-Factor Authentication</h3>
            <p className="text-xs text-gray-500 mb-4">Two-factor authentication adds extra security to your account. If your backend supports it, enabling will require a second factor at sign-in.</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                <p className="text-xs text-gray-500">{twoFactorEnabled ? '2FA is enabled for your account' : '2FA is not enabled'}</p>
              </div>
              <div>
                <button onClick={toggleTwoFactor} disabled={twoFactorLoading} className="px-4 py-2 rounded-lg bg-gray-900 text-white">{twoFactorLoading ? '...' : twoFactorEnabled ? 'Disable' : 'Enable'}</button>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowTwoFactor(false)} className="px-3 py-2 rounded-lg bg-white border">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Login History Modal */}
      {showLoginHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Login History</h3>
                <p className="text-xs text-gray-500">Recent sign-ins for this account</p>
              </div>
              <button onClick={() => setShowLoginHistory(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="mt-4">
              {loginHistoryLoading && <p className="text-sm text-gray-500">Loading…</p>}
              {loginHistoryError && <p className="text-sm text-red-600">{loginHistoryError}</p>}
              {!loginHistoryLoading && loginHistory && loginHistory.length === 0 && <p className="text-sm text-gray-500">No recent logins found</p>}
              {!loginHistoryLoading && loginHistory && loginHistory.length > 0 && (
                <ul className="space-y-2 max-h-64 overflow-y-auto mt-2">
                  {loginHistory.map((h) => (
                      <li key={h.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                          <p className="text-sm font-medium">{h.user_agent ? h.user_agent.slice(0, 60) : 'Unknown device'}</p>
                          <p className="text-xs text-gray-500">{new Date(h.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          {h.country ? h.country : ''}
                        </div>
                      </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}