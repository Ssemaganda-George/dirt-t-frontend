import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getServiceClient } from '../lib/serviceClient'

/** -------------------- Types -------------------- */
interface VendorSignupEmailPayload {
  userId: string
  email: string
  fullName: string
}

interface User {
  id: string
  email: string
  created_at: string
}

interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: 'admin' | 'vendor' | 'tourist'
  status?: 'active' | 'pending' | 'approved' | 'rejected' | 'suspended'
  created_at: string
  updated_at: string
}

interface Vendor {
  id: string
  user_id: string
  business_name: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  vendor: Vendor | null
  loading: boolean
  loadProfileData: () => Promise<Profile | null>
  signIn: (email: string, password: string) => Promise<Profile | null>
  signUp: (email: string, password: string, fullName: string, role?: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  confirmSignOut: () => Promise<void>
}

/** -------------------- Context -------------------- */
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

/** -------------------- Utility Functions -------------------- */
async function sendVendorSignupEmail(payload: VendorSignupEmailPayload) {
  const url =
    (import.meta.env && (import.meta.env.VITE_VENDOR_EMAIL_ENDPOINT as string)) || '/api/send-vendor-email'

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vendor email request failed: ${res.status} ${text}`)
  }

  return res.json()
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** -------------------- Auth Provider -------------------- */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)

  /** -------------------- Fetch Vendor -------------------- */
  const fetchVendor = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('vendors').select('*').eq('user_id', userId).single()
      if (!error && data) setVendor(data as Vendor)
    } catch (err) {
      console.error('Error fetching vendor:', err)
      setVendor(null)
    }
  }

  /** -------------------- Fetch Profile -------------------- */
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error || !data) throw error || new Error('Profile not found')
      setProfile(data as Profile)

      // If vendor, fetch vendor asynchronously
      if (data.role === 'vendor') {
        fetchVendor(userId).catch(console.error)
      } else {
        setVendor(null)
      }

      return data as Profile
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
      setVendor(null)
      return null
    }
  }

  /** -------------------- Lazy Load Profile -------------------- */
  const loadProfileData = async (): Promise<Profile | null> => {
    if (!user?.id || profileLoaded) return profile
    const p = await fetchProfile(user.id)
    setProfileLoaded(true)
    return p
  }

  /** -------------------- Vendor Post Verify Email (async) -------------------- */
  const handleVendorPostVerify = async (u: any, p: Profile) => {
    if (p.role !== 'vendor') return
    try {
      const { data: vendorData, error: vErr } = await supabase.from('vendors').select('*').eq('user_id', u.id).single()
      if (!vErr && vendorData?.status === 'pending') {
        const confirmedAt = u.email_confirmed_at || u.confirmed_at
        const flagKey = `vendorPostVerifySent:${u.id}`
        if (confirmedAt && !localStorage.getItem(flagKey)) {
          sendVendorSignupEmail({ userId: u.id, email: u.email ?? '', fullName: p.full_name }).catch(console.error)
          try { localStorage.setItem(flagKey, '1') } catch {}
        }
      }
    } catch (e) {
      console.error('Error checking vendor post-verify criteria:', e)
    }
  }

  /** -------------------- Auth State Change -------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (session?.user) {
          const u = session.user
          setUser({ id: u.id, email: u.email ?? '', created_at: u.created_at ?? new Date().toISOString() })
          // Load profile data on initialization to avoid stuck loader on refresh
          try {
            await fetchProfile(u.id)
            setProfileLoaded(true)
          } catch (e) {
            console.error('Error loading profile on init:', e)
            setProfileLoaded(true) // Mark as loaded even on error to prevent infinite loading
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setLoading(false)
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user
        setUser({ id: u.id, email: u.email ?? '', created_at: u.created_at ?? new Date().toISOString() })
        
        // Only reload profile if it's not already loaded for this user
        // This prevents unnecessary reloads on page refresh when init() already loaded it
        setProfile((currentProfile) => {
          if (!currentProfile || currentProfile.id !== u.id) {
            setProfileLoaded(false) // Reset profile loaded state
            // Load profile data and mark as loaded
            fetchProfile(u.id)
              .then((userProfile) => {
                setProfileLoaded(true) // Mark as loaded after fetching
                // Handle vendor post verify if profile loaded successfully
                if (userProfile) handleVendorPostVerify(u, userProfile).catch(console.error)
              })
              .catch((e) => {
                console.error('Error loading profile:', e)
                setProfileLoaded(true) // Mark as loaded even on error
              })
          }
          return currentProfile // Return current, will be updated by fetchProfile
        })
      } else {
        setUser(null)
        setProfile(null)
        setVendor(null)
        setProfileLoaded(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /** -------------------- Sign In -------------------- */
  const signIn = async (email: string, password: string): Promise<Profile | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const u = data.user
    if (!u) return null

    const normalizedUser: User = { id: u.id, email: u.email ?? '', created_at: u.created_at ?? new Date().toISOString() }
    setUser(normalizedUser)

    // Load profile immediately
    const userProfile = await fetchProfile(u.id)
    setProfileLoaded(true) // Mark as loaded after fetching

    // Vendor post verify runs async (does not block dashboard)
    if (userProfile) handleVendorPostVerify(u, userProfile).catch(console.error)

    // Check for suspension
    if (userProfile?.status === 'suspended') {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setVendor(null)
      throw new Error('Your account has been suspended. Please contact support.')
    }

    return userProfile
  }

  /** -------------------- Sign Up -------------------- */
  const signUp = async (email: string, password: string, fullName: string, role: string = 'tourist') => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const u = data.user
    if (!u) return

    setUser({ id: u.id, email: u.email ?? '', created_at: u.created_at ?? new Date().toISOString() })
    await delay(100) // ensure user is created

    const serviceClient = getServiceClient()
    try {
      const { error: profileError } = await serviceClient
        .from('profiles')
        .upsert({ id: u.id, email, full_name: fullName, role }, { onConflict: 'id' })
      if (profileError) {
        console.error('Error creating profile during sign up:', profileError)
      }
    } catch (err) {
      console.error('Unexpected error creating profile during sign up:', err)
    }

    if (role === 'vendor') {
      try {
        const { error: vendorError } = await serviceClient
          .from('vendors')
          .upsert({ user_id: u.id, business_name: '', status: 'pending' }, { onConflict: 'user_id' })
        if (vendorError) {
          console.error('Error creating vendor during sign up:', vendorError)
        }
      } catch (err) {
        console.error('Unexpected error creating vendor during sign up:', err)
      }
      sendVendorSignupEmail({ userId: u.id, email, fullName }).catch(console.error)
    }

    // Fetch profile in background (non-blocking)
    fetchProfile(u.id).catch(console.error)
  }

  /** -------------------- Sign Out -------------------- */
  const signOut = async () => {
    try {
      // Kill session
      await supabase.auth.signOut()

      // Hard remove leftover token
      localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL + '-auth-token')

      // Reset state
      setUser(null)
      setProfile(null)
      setVendor(null)
      setProfileLoaded(false)

      // Force reload
      window.location.href = '/'
    } catch (err) {
      console.error('Error signing out:', err)
      window.location.reload()
    }
  }

  /** -------------------- Update Profile -------------------- */
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data as Profile)
  }

  const value: AuthContextType = {
    user,
    profile,
    vendor,
    loading,
    loadProfileData,
    signIn,
    signUp,
    signOut,
    updateProfile,
    confirmSignOut: signOut, // alias for convenience
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
