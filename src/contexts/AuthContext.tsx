import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { profileService, vendorService } from '@/lib/database'

interface User {
  id: string
  email: string
  created_at: string
}

interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role: 'tourist' | 'vendor' | 'admin'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role?: string, vendorData?: any) => Promise<any>
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
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at
        })

        // Fetch profile
        try {
          const userProfile = await profileService.getById(session.user.id)
          setProfile(userProfile)
        } catch (error) {
          console.error('Error fetching profile:', error)
        }
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at
          })

          // Fetch or create profile
          try {
            let userProfile = await profileService.getById(session.user.id)

            if (!userProfile) {
              // Create profile if it doesn't exist
              const role = session.user.user_metadata?.role || 'tourist'
              userProfile = await profileService.create({
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name || '',
                role: role
              })
            }

            setProfile(userProfile)

            // Create vendor record if user has vendor data and is a vendor (for email confirmation flow)
            if (session.user.user_metadata?.role === 'vendor' && session.user.user_metadata?.vendor_data) {
              try {
                const existingVendor = await vendorService.getByUserId(session.user.id)
                if (!existingVendor) {
                  await vendorService.create({
                    user_id: session.user.id,
                    business_name: session.user.user_metadata.vendor_data.businessName,
                    business_description: session.user.user_metadata.vendor_data.businessDescription,
                    business_address: session.user.user_metadata.vendor_data.businessAddress,
                    business_phone: session.user.user_metadata.vendor_data.businessPhone,
                    business_email: session.user.user_metadata.vendor_data.businessEmail,
                    business_license: session.user.user_metadata.vendor_data.businessLicense || undefined,
                    status: 'pending'
                  })
                }
              } catch (vendorError) {
                console.error('Error creating vendor record:', vendorError)
              }
            }
          } catch (error) {
            console.error('Error fetching/creating profile:', error)
          }
        } else {
          setUser(null)
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
  }

  const signUp = async (email: string, password: string, fullName: string, role: string = 'tourist', vendorData?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          vendor_data: role === 'vendor' ? vendorData : undefined
        }
      }
    })

    if (error) throw error

    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    const updatedProfile = await profileService.update(user.id, updates)
    setProfile(updatedProfile)
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