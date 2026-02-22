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
  first_name?: string
  last_name?: string
  phone?: string
  phone_country_code?: string
  avatar_url?: string
  role: 'admin' | 'vendor' | 'tourist'
  status?: 'active' | 'pending' | 'approved' | 'rejected' | 'suspended'
  home_city?: string
  home_country?: string
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
  // Optional payout fields
  bank_details?: {
    name?: string
    account_name?: string
    account_number?: string
    branch?: string
    swift?: string
    [key: string]: any
  }
  mobile_money_accounts?: Array<{
    provider?: string
    phone?: string
    country_code?: string
    name?: string
    [key: string]: any
  }>
  preferred_payout?: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  vendor: Vendor | null
  loading: boolean
  loadProfileData: () => Promise<Profile | null>
  signIn: (email: string, password: string) => Promise<Profile | null>
  signUp: (email: string, password: string, firstName: string, lastName: string, role?: string, homeCity?: string, homeCountry?: string) => Promise<void>
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
          const confirmedAt = (u as any).email_confirmed_at || (u as any).confirmed_at

          // If email is not verified, immediately sign out and treat as logged out
          if (!confirmedAt) {
            try {
              await supabase.auth.signOut()
            } catch (e) {
              console.error('Error signing out unverified session on init:', e)
            }
            setUser(null)
            setProfile(null)
            setVendor(null)
            setProfileLoaded(false)
          } else {
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
        const confirmedAt = (u as any).email_confirmed_at || (u as any).confirmed_at

        // Block unverified users from ever being treated as logged in via session events
        if (!confirmedAt) {
          try {
            await supabase.auth.signOut()
          } catch (e) {
            console.error('Error signing out unverified session on change:', e)
          }
          setUser(null)
          setProfile(null)
          setVendor(null)
          setProfileLoaded(false)
          return
        }

        setUser({ id: u.id, email: u.email ?? '', created_at: u.created_at ?? new Date().toISOString() })

        // Only reload profile if it's not already loaded for this user
        // This prevents unnecessary reloads on page refresh when init() already loaded it
        setProfile(currentProfile => {
          if (!currentProfile || currentProfile.id !== u.id) {
            setProfileLoaded(false) // Reset profile loaded state
            // Load profile data and mark as loaded
            fetchProfile(u.id)
              .then(userProfile => {
                setProfileLoaded(true) // Mark as loaded after fetching
                // Handle vendor post verify if profile loaded successfully
                if (userProfile) handleVendorPostVerify(u, userProfile).catch(console.error)
              })
              .catch(e => {
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

    // Require email verification before allowing login
    const confirmedAt = (u as any).email_confirmed_at || (u as any).confirmed_at
    if (!confirmedAt) {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setVendor(null)
      throw new Error('Please verify your email before logging in. Check your inbox for a verification link.')
    }

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
  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: string = 'tourist', homeCity?: string, homeCountry?: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const u = data.user
    if (!u) return

    const fullName = `${firstName} ${lastName}`.trim()

    // Do not treat the user as logged in yet; they must verify their email first.
    await delay(100) // ensure user is created before service operations

    const serviceClient = getServiceClient()
    try {
      // Use atomic function to create/update profile
      const profileResult = await serviceClient.rpc('create_user_profile_atomic', {
        p_user_id: u.id,
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_role: role,
        p_home_city: homeCity || null,
        p_home_country: homeCountry || null
      });

      if (!profileResult.data?.success) {
        console.error('Error creating profile during sign up:', profileResult.data?.error);
      }
    } catch (err) {
      console.error('Unexpected error creating profile during sign up:', err);
    }

    if (role === 'tourist') {
      try {
        // Tourist record will be created automatically by database trigger
        // No need to manually create it here
        console.log('Tourist record will be created by database trigger');
      } catch (err) {
        console.error('Unexpected error during tourist signup:', err);
      }
    }

    if (role === 'tourist') {
      try {
        const { error: touristError } = await serviceClient
          .from('tourists')
          .upsert({ user_id: u.id, first_name: fullName }, { onConflict: 'user_id' })
        if (touristError) {
          console.error('Error creating tourist during sign up:', touristError)
        }
      } catch (err) {
        console.error('Unexpected error creating tourist during sign up:', err)
      }
    }

    if (role === 'vendor') {
      try {
        // Use atomic function to create vendor profile
        const vendorResult = await serviceClient.rpc('create_vendor_profile_atomic', {
          p_user_id: u.id,
          p_business_name: '',
          p_status: 'pending'
        });

        if (!vendorResult.data?.success) {
          console.error('Error creating vendor during sign up:', vendorResult.data?.error);
        }
      } catch (err) {
        console.error('Unexpected error creating vendor during sign up:', err);
      }
      sendVendorSignupEmail({ userId: u.id, email, fullName: `${firstName} ${lastName}` }).catch(console.error)
    }

    // Do not fetch profile into context yet; user will load it after verified sign-in.
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

    // For profile updates, we can use the standard Supabase update since profiles
    // are typically updated by the owner and race conditions are less likely.
    // However, we ensure atomicity by using a transaction-like approach.
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
