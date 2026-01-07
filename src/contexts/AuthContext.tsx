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
  role: 'admin' | 'vendor' | 'tourist'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
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
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data as Profile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    const u = data.user
    if (!u) return

    const normalizedUser: User = {
      id: u.id,
      email: u.email ?? '',
      created_at: (u as any).created_at ?? new Date().toISOString(),
    }

    setUser(normalizedUser)
    // Ensure profile (and role) is loaded before route guards run
    await fetchProfile(u.id)
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
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}