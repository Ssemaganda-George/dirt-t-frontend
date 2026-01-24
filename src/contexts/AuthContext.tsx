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

  /** -------------------- Fetch Profile & Vendor -------------------- */
  const fetchVendor = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('vendors').select('*').eq('user_id', userId).single()
      if (error) {
        setVendor(null)
        return null
      }
      setVendor(data as Vendor)
      return data as Vendor
    } catch (err) {
      console.error('Error fetching vendor:', err)
      setVendor(null)
      return null
    }
  }

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) throw error

      setProfile(data as Profile)

      if (data.role === 'vendor') {
        await fetchVendor(userId)
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
    try {
      const p = await fetchProfile(user.id)
      setProfileLoaded(true)
      return p
    } catch (err) {
      console.error('Error loading profile data:', err)
      setProfileLoaded(true)
      return null
    }
  }

  /** -------------------- Vendor Post Verify Email -------------------- */
  const handleVendorPostVerify = async (u: any, p: Profile) => {
    if (p.role !== 'vendor') return
    try {
      const { data: vendorData, error: vErr } = await supabase.from('vendors').select('*').eq('user_id', u.id).single()
      if (!vErr && vendorData?.status === 'pending') {
        const confirmedAt = u.email_confirmed_at || u.confirmed_at
        const flagKey = `vendorPostVerifySent:${u.id}`
        try {
          if (confirmedAt && !localStorage.getItem(flagKey)) {
            sendVendorSignupEmail({ userId: u.id, email: u.email ?? '', fullName: p.full_name }).catch(console.error)
            localStorage.setItem(flagKey, '1')
          }
        } catch (e) {
          console.error('LocalStorage error for vendor post verify:', e)
        }
      }
    } catch (e) {
      console.error('Error checking vendor post-verify criteria:', e)
    }
  }

  /** -------------------- Auth State Change -------------------- */
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      const session = data.session
      if (session?.user) {
        const u = session.user
        const normalizedUser: User = {
          id: u.id,
          email: u.email ?? '',
          created_at: u.created_at ?? new Date().toISOString(),
        }
        setUser(normalizedUser)
      }
      setLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user
        const normalizedUser: User = {
          id: u.id,
          email: u.email ?? '',
          created_at: u.created_at ?? new Date().toISOString(),
        }
        setUser(normalizedUser)
        setProfileLoaded(false)

        const userProfile = await fetchProfile(u.id)
        if (userProfile) await handleVendorPostVerify(u, userProfile)
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

    const normalizedUser: User = {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at ?? new Date().toISOString(),
    }
    setUser(normalizedUser)
    setProfileLoaded(true)

    const userProfile = await fetchProfile(u.id)

    if (userProfile?.status === 'suspended') {
      await confirmSignOut()
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

    const normalizedUser: User = {
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at ?? new Date().toISOString(),
    }

    await delay(100)

    const serviceClient = getServiceClient()
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert({ id: u.id, email, full_name: fullName, role }, { onConflict: 'id' })
    if (profileError) console.error('Profile creation error:', profileError)

    if (role === 'vendor') {
      const { error: vendorError } = await serviceClient
        .from('vendors')
        .upsert({ user_id: u.id, business_name: '', status: 'pending' }, { onConflict: 'user_id' })
      if (vendorError) console.error('Vendor creation error:', vendorError)

      sendVendorSignupEmail({ userId: u.id, email, fullName }).catch(console.error)
    }

    setUser(normalizedUser)
    await fetchProfile(u.id)
  }

  /** -------------------- Sign Out -------------------- */
  const signOut = async () => {
    await confirmSignOut()
  }

  /** -------------------- Confirm Sign Out -------------------- */
  const confirmSignOut = async () => {
    try {
      // Kill Supabase session
      await supabase.auth.signOut()

      // Hard clear local storage auth token
      localStorage.removeItem('sb-' + import.meta.env.VITE_SUPABASE_URL + '-auth-token')

      // Reset state
      setUser(null)
      setProfile(null)
      setVendor(null)
      setProfileLoaded(false)

      // Force reload
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
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
    confirmSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
