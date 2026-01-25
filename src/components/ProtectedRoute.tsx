import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, loadProfileData } = useAuth()
  const location = useLocation()
  const [profileLoading, setProfileLoading] = useState(false)

  // If user exists but profile is missing, try to load it
  useEffect(() => {
    const loadProfile = async () => {
      if (!loading && user && !profile && loadProfileData) {
        setProfileLoading(true)
        try {
          await loadProfileData()
        } catch (error) {
          console.error('Error loading profile in ProtectedRoute:', error)
        } finally {
          setProfileLoading(false)
        }
      }
    }
    loadProfile()
  }, [loading, user, profile, loadProfileData])

  // Show loader while initial auth is loading or profile is being fetched
  if (loading || (user && !profile && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    const loginPath = location.pathname.startsWith('/vendor') ? '/vendor-login' : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  // If profile still doesn't exist after loading attempt, redirect to login
  if (!profile) {
    const loginPath = location.pathname.startsWith('/vendor') ? '/vendor-login' : '/login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />
  }

  // Check vendor approval status - use profile status since we're using unified status system
  if (requiredRole === 'vendor' && profile?.status !== 'approved') {
    return <Navigate to="/vendor-pending" replace />
  }

  return <>{children}</>
}