import type { User } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { generateKeyPair, storePrivateKey, hasEncryptionKeys } from '../lib/encryption'
import { updateUserPublicKey, getUserPublicKey, markMessagesAsDelivered } from '../lib/database'
import {
  clearLocalAuthStorage,
  createUserProfileAtomic,
  createVendorProfileAtomic,
  fetchProfileByUserId,
  fetchVendorByUserId,
  fetchVendorByUserIdForPostVerify,
  getSession,
  isEmailConfirmed,
  onAuthStateChange,
  formatSignInError,
  signInWithPassword,
  signOut as authSignOut,
  signUpWithPassword,
  updateProfileByUserId,
  upsertTouristOnSignup,
} from '../services/AuthService'
import type { Profile, Vendor } from '../types'

/** -------------------- Types -------------------- */
interface VendorSignupEmailPayload {
  userId: string
  email: string
  fullName: string
}

interface AuthUser {
  id: string
  email: string
  created_at: string
}

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  vendor: Vendor | null
  loading: boolean
  loadProfileData: () => Promise<Profile | null>
  signIn: (email: string, password: string) => Promise<Profile | null>
  signUp: (email: string, password: string, firstName: string, lastName: string, role?: string, homeCity?: string, homeCountry?: string) => Promise<void>
  signOut: (options?: { redirect?: boolean }) => Promise<void>
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

async function notifyAdminNewAccount(payload: {
  userId: string
  email: string
  fullName: string
  role: 'tourist' | 'vendor'
  businessName?: string
}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!supabaseUrl) return
  const res = await fetch(`${supabaseUrl}/functions/v1/notify-admin-new-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    console.warn('Admin notification failed:', res.status, text)
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function setupEncryptionKeys(userId: string): Promise<void> {
  try {
    const hasLocalKeys = await hasEncryptionKeys(userId)
    const existingPublicKey = await getUserPublicKey(userId)

    if (hasLocalKeys && existingPublicKey) {
      console.log('E2E encryption already setup for user')
      return
    }

    console.log('Generating E2E encryption keys...')
    const { publicKey, privateKey } = await generateKeyPair()
    await storePrivateKey(userId, privateKey)
    const success = await updateUserPublicKey(userId, publicKey)
    if (success) {
      console.log('E2E encryption setup complete')
    } else {
      console.warn('Failed to store public key in database')
    }
  } catch (error) {
    console.error('Error setting up E2E encryption:', error)
  }
}

/** -------------------- Auth Provider -------------------- */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)

  const fetchVendor = async (userId: string) => {
    const data = await fetchVendorByUserId(userId)
    setVendor(data)
  }

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const data = await fetchProfileByUserId(userId)
      if (!data) throw new Error('Profile not found')
      setProfile(data)
      if (data.role === 'vendor') {
        fetchVendor(userId).catch(console.error)
      } else {
        setVendor(null)
      }
      return data
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
      setVendor(null)
      return null
    }
  }

  const loadProfileData = async (): Promise<Profile | null> => {
    if (!user?.id || profileLoaded) return profile
    const p = await fetchProfile(user.id)
    setProfileLoaded(true)
    return p
  }

  const handleVendorPostVerify = async (u: User, p: Profile) => {
    if (p.role !== 'vendor') return
    try {
      const vendorData = await fetchVendorByUserIdForPostVerify(u.id)
      if (vendorData?.status === 'pending') {
        const flagKey = `vendorPostVerifySent:${u.id}`
        if (isEmailConfirmed(u) && !localStorage.getItem(flagKey)) {
          sendVendorSignupEmail({ userId: u.id, email: u.email ?? '', fullName: p.full_name }).catch(console.error)
          notifyAdminNewAccount({
            userId: u.id,
            email: u.email ?? '',
            fullName: p.full_name,
            role: 'vendor',
            businessName: vendorData.business_name,
          }).catch(console.error)
          try {
            localStorage.setItem(flagKey, '1')
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      console.error('Error checking vendor post-verify criteria:', e)
    }
  }

  const rejectUnverifiedSession = async () => {
    try {
      await authSignOut()
      clearLocalAuthStorage()
    } catch (e) {
      console.error('Error signing out unverified session:', e)
    }
    setUser(null)
    setProfile(null)
    setVendor(null)
    setProfileLoaded(false)
  }

  useEffect(() => {
    const init = async () => {
      try {
        const session = await getSession()
        const u = session?.user
        if (u) {
          if (!isEmailConfirmed(u)) {
            await rejectUnverifiedSession()
          } else {
            setUser({ id: u.id, email: u.email ?? '', created_at: u.created_at ?? new Date().toISOString() })
            try {
              await fetchProfile(u.id)
              setProfileLoaded(true)
            } catch (e) {
              console.error('Error loading profile on init:', e)
              setProfileLoaded(true)
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
    } = onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user
        if (!isEmailConfirmed(u)) {
          await rejectUnverifiedSession()
          return
        }

        setUser({ id: u.id, email: u.email ?? '', created_at: u.created_at ?? new Date().toISOString() })

        setProfile(currentProfile => {
          if (!currentProfile || currentProfile.id !== u.id) {
            setProfileLoaded(false)
            fetchProfile(u.id)
              .then(userProfile => {
                setProfileLoaded(true)
                if (userProfile) handleVendorPostVerify(u, userProfile).catch(console.error)
              })
              .catch(e => {
                console.error('Error loading profile:', e)
                setProfileLoaded(true)
              })
          }
          return currentProfile
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

  const signIn = async (email: string, password: string): Promise<Profile | null> => {
    const { data, error } = await signInWithPassword(email, password)
    if (error) throw formatSignInError(error)

    const u = data.user
    if (!u) return null

    if (!isEmailConfirmed(u)) {
      await authSignOut()
      setUser(null)
      setProfile(null)
      setVendor(null)
      throw new Error('Please verify your email before logging in. Check your inbox for a verification link.')
    }

    setUser({ id: u.id, email: u.email ?? '', created_at: u.created_at ?? new Date().toISOString() })

    const userProfile = await fetchProfile(u.id)
    setProfileLoaded(true)

    setupEncryptionKeys(u.id).catch(e => console.error('E2E key setup error:', e))
    markMessagesAsDelivered(u.id).catch(e => console.error('Mark delivered error:', e))

    if (userProfile) handleVendorPostVerify(u, userProfile).catch(console.error)

    if (userProfile?.status === 'suspended') {
      await authSignOut()
      setUser(null)
      setProfile(null)
      setVendor(null)
      throw new Error('Your account has been suspended. Please contact support.')
    }

    return userProfile
  }

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: string = 'tourist',
    homeCity?: string,
    homeCountry?: string
  ) => {
    const { data, error } = await signUpWithPassword(email, password)
    if (error) throw error

    const u = data.user
    if (!u) return

    await delay(100)

    try {
      const profileResult = await createUserProfileAtomic({
        userId: u.id,
        email,
        firstName,
        lastName,
        role,
        homeCity,
        homeCountry,
      })
      if (!profileResult.data?.success) {
        console.error('Error creating profile during sign up:', profileResult.data?.error)
      }
    } catch (err) {
      console.error('Unexpected error creating profile during sign up:', err)
    }

    if (role === 'tourist') {
      try {
        const { error: touristError } = await upsertTouristOnSignup(u.id, `${firstName} ${lastName}`.trim())
        if (touristError) {
          console.error('Error creating tourist during sign up:', touristError)
        }
      } catch (err) {
        console.error('Unexpected error creating tourist during sign up:', err)
      }
      notifyAdminNewAccount({
        userId: u.id,
        email,
        fullName: `${firstName} ${lastName}`,
        role: 'tourist',
      }).catch(console.error)
    }

    if (role === 'vendor') {
      try {
        const vendorResult = await createVendorProfileAtomic(u.id)
        if (!vendorResult.data?.success) {
          console.error('Error creating vendor during sign up:', vendorResult.data?.error)
        }
      } catch (err) {
        console.error('Unexpected error creating vendor during sign up:', err)
      }
    }
  }

  const signOut = async (options?: { redirect?: boolean }) => {
    const shouldRedirect = options?.redirect !== false
    try {
      await authSignOut()
      clearLocalAuthStorage()
      setUser(null)
      setProfile(null)
      setVendor(null)
      setProfileLoaded(false)
      if (shouldRedirect) {
        window.location.href = '/'
      }
    } catch (err) {
      console.error('Error signing out:', err)
      if (shouldRedirect) {
        window.location.reload()
      }
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')
    const data = await updateProfileByUserId(user.id, updates)
    setProfile(data)
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
    confirmSignOut: signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
