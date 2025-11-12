import React, { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  created_at: string
}

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'guide' | 'tourist'
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

// In-memory storage for demo purposes
let users: Array<User & { password: string }> = []
let profiles: Profile[] = []
let currentUser: User | null = null


const initializeDemoData = () => {
  if (users.length === 0) {
    const adminId = 'admin_001'
    const now = new Date().toISOString()
    
    // Create demo admin user
    users.push({
      id: adminId,
      email: 'admin@dirttrails.com',
      password: 'admin123',
      created_at: now
    })
    
    // Create demo admin profile
    profiles.push({
      id: adminId,
      email: 'admin@dirttrails.com',
      full_name: 'Admin User',
      role: 'admin',
      created_at: now,
      updated_at: now
    })
    
    // Add a demo guide
    const guideId = 'guide_001'
    users.push({
      id: guideId,
      email: 'guide@dirttrails.com',
      password: 'guide123',
      created_at: now
    })
    
    profiles.push({
      id: guideId,
      email: 'guide@dirttrails.com',
      full_name: 'Demo Guide',
      role: 'guide',
      created_at: now,
      updated_at: now
    })
  }
}

// Call initialization
initializeDemoData()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate initial session check
    const checkSession = () => {
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id)
      } else {
        setLoading(false)
      }
    }

    // Simulate async session check
    setTimeout(checkSession, 100)
  }, [])

  const fetchProfile = (userId: string) => {
    try {
      const userProfile = profiles.find(p => p.id === userId)
      setProfile(userProfile || null)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const foundUser = users.find(u => u.email === email && u.password === password)
    if (!foundUser) {
      throw new Error('Invalid email or password')
    }

    const userWithoutPassword = {
      id: foundUser.id,
      email: foundUser.email,
      created_at: foundUser.created_at
    }

    currentUser = userWithoutPassword
    setUser(userWithoutPassword)
    fetchProfile(foundUser.id)
  }

  const signUp = async (email: string, password: string, fullName: string, role: string = 'tourist') => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      throw new Error('User already exists with this email')
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    // Create user
    const newUser = {
      id: userId,
      email,
      password,
      created_at: now
    }
    users.push(newUser)

    // Create profile
    const newProfile: Profile = {
      id: userId,
      email,
      full_name: fullName,
      role: role as 'admin' | 'guide' | 'tourist',
      created_at: now,
      updated_at: now
    }
    profiles.push(newProfile)

    // Auto sign in
    const userWithoutPassword = {
      id: newUser.id,
      email: newUser.email,
      created_at: newUser.created_at
    }

    currentUser = userWithoutPassword
    setUser(userWithoutPassword)
    setProfile(newProfile)
    setLoading(false)
  }

  const signOut = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    currentUser = null
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    const profileIndex = profiles.findIndex(p => p.id === user.id)
    if (profileIndex === -1) {
      throw new Error('Profile not found')
    }

    profiles[profileIndex] = {
      ...profiles[profileIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }

    fetchProfile(user.id)
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