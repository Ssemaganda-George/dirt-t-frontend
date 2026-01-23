import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getServiceClient } from '../lib/serviceClient'

interface VendorSignupEmailPayload {
  userId: string
  email: string
  fullName: string
}

/**
 * Trigger a server-side email for vendor signup onboarding.
 */
async function sendVendorSignupEmail(payload: VendorSignupEmailPayload) {
  const url = (import.meta.env && (import.meta.env.VITE_VENDOR_EMAIL_ENDPOINT as string)) || '/api/send-vendor-email'

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vendor email request failed: ${res.status} ${text}`)
  }

  return res.json()
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Lazy load profile and vendor data
  const loadProfileData = async (): Promise<Profile | null> => {
    if (!user?.id || profileLoaded) return profile // Already loaded or no user

    try {
      const p = await fetchProfile(user.id)
      setProfileLoaded(true)
      return p
    } catch (error) {
      console.error('Error loading profile data:', error)
      setProfileLoaded(true) // Mark as loaded even on error to avoid retry loops
      return null
    }
  }

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
          created_at: (u as any).created_at ?? new Date().toISOString(),
        }
        setUser(normalizedUser)
        // Don't load profile data immediately - do it lazily
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
          created_at: (u as any).created_at ?? new Date().toISOString(),
        }
        setUser(normalizedUser)
        setProfileLoaded(false) // Reset profile loaded state on auth change

        // Only load profile data for vendor email verification logic
        try {
          const p = await fetchProfile(u.id)
          if (p?.role === 'vendor') {
            // fetch vendor record to inspect status
            const { data: vendorData, error: vErr } = await supabase
              .from('vendors')
              .select('*')
              .eq('user_id', u.id)
              .single()

            if (!vErr && vendorData && vendorData.status === 'pending') {
              // Check if user's email is confirmed. Supabase user object may have 'email_confirmed_at' or 'confirmed_at'
              const confirmedAt = (u as any).email_confirmed_at || (u as any).confirmed_at
              const flagKey = `vendorPostVerifySent:${u.id}`
              if (confirmedAt && !localStorage.getItem(flagKey)) {
                // request server to send post-verify email (account under review)
                sendVendorSignupEmail({ userId: u.id, email: u.email ?? '', fullName: p.full_name }).catch((e: unknown) =>
                  console.error('Failed to request post-verify vendor email:', e)
                )
                try {
                  localStorage.setItem(flagKey, '1')
                } catch (e) {}
              }
            }
          }
        } catch (e) {
          console.error('Error checking vendor post-verify criteria:', e)
        }
      } else {
        setUser(null)
        setProfile(null)
        setVendor(null)
        setProfileLoaded(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data as Profile)

      // If user is a vendor, fetch vendor data
      if (data.role === 'vendor') {
        await fetchVendor(userId)
      } else {
        setVendor(null)
      }

      return data as Profile
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
      setVendor(null)
      return null
    }
  }

  const fetchVendor = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // If vendor record doesn't exist, set vendor to null
        setVendor(null)
      } else {
        // Use the actual vendor status from the vendor record
        setVendor(data as Vendor)
      }
    } catch (error) {
      console.error('Error fetching vendor:', error)
      setVendor(null)
    }
  }

  const signIn = async (email: string, password: string): Promise<Profile | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    const u = data.user
    if (!u) return null

    const normalizedUser: User = {
      id: u.id,
      email: u.email ?? '',
      created_at: (u as any).created_at ?? new Date().toISOString(),
    }

    setUser(normalizedUser)
    setProfileLoaded(true) // Mark as loaded since we fetched it
    // Ensure profile (and role) is loaded before route guards run
    const userProfile = await fetchProfile(u.id)

    // Check if user is suspended and prevent login
    if (userProfile?.status === 'suspended') {
      // Sign out the user immediately
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setVendor(null)
      setProfileLoaded(false)
      throw new Error('Your account has been suspended. Please contact support for assistance.')
    }

    return userProfile
  }

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: string = 'tourist'
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    console.log(data, error)
    if (error) throw error

    const u = data.user
    if (!u) return

    const normalizedUser: User = {
      id: u.id,
      email: u.email ?? '',
      created_at: (u as any).created_at ?? new Date().toISOString(),
    }

    // create profile row matching your user_role enum
    // Add a small delay to ensure user is fully created
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const serviceClient = getServiceClient()
    const { error: profileError } = await serviceClient.from('profiles').upsert({
      id: u.id,
      email,
      full_name: fullName,
      role,
    }, { onConflict: 'id' })
    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't throw here - let the component handle profile creation
    }

    // If vendor, create vendor record
    if (role === 'vendor') {
      const { error: vendorError } = await serviceClient.from('vendors').upsert({
        user_id: u.id,
        business_name: '',
        status: 'pending',
      }, { onConflict: 'user_id' })
      if (vendorError) {
        console.error('Vendor creation error:', vendorError)
        // Don't throw here - let the component handle vendor creation
      }
    }

    // If this is a vendor signup, notify the backend to send custom vendor onboarding email
    // (this will typically send a verification / next-steps email specific to vendors)
    if (role === 'vendor') {
      // fire-and-forget; don't block signup if email service is not available
      sendVendorSignupEmail({ userId: u.id, email, fullName }).catch((e: unknown) =>
        console.error('Failed to request vendor signup email:', e)
      )
    }

    setUser(normalizedUser)
    // Ensure profile (and role) is loaded before route guards run
    await fetchProfile(u.id)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    setProfile(data as Profile)
  }

  const value = {
    user,
    profile,
    vendor,
    loading,
    loadProfileData,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}