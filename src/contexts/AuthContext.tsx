import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error(error)
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
        await fetchProfile(u.id)
      }
    }

    init().finally(() => setLoading(false))

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
        fetchProfile(u.id)
      } else {
        setUser(null)
        setProfile(null)
        setVendor(null)
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
        // Get status from profile
        const profileStatus = profile?.status as 'pending' | 'approved' | 'rejected' | 'suspended' | undefined
        setVendor({
          ...data,
          status: profileStatus || 'pending'
        } as Vendor)
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
    // Ensure profile (and role) is loaded before route guards run
    const userProfile = await fetchProfile(u.id)

    // Check if user is suspended and prevent login
    if (userProfile?.status === 'suspended') {
      // Sign out the user immediately
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setVendor(null)
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
    const { error: profileError } = await supabase.from('profiles').insert({
      id: u.id,
      email,
      full_name: fullName,
      role,
    })
    if (profileError) throw profileError

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
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}