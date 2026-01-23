import React from 'react'
import { PageSkeleton } from './SkeletonLoader'

interface SmoothLoaderProps {
  type?: 'home' | 'service' | 'profile' | 'dashboard' | 'generic'
  message?: string
}

export function SmoothLoader({ type = 'generic', message = 'Loading page...' }: SmoothLoaderProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="animate-fade-in">
        <PageSkeleton type={type} />
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm text-gray-600 font-medium">{message}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced loading overlay for in-page loading states
export function LoadingOverlay({ isVisible, message = 'Loading...' }: {
  isVisible: boolean
  message?: string
}) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm mx-4">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <div>
            <p className="text-gray-900 font-medium">{message}</p>
            <p className="text-gray-500 text-sm">Please wait...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Smooth fade transition wrapper
export function FadeTransition({
  children,
  show,
  duration = 300
}: {
  children: React.ReactNode
  show: boolean
  duration?: number
}) {
  return (
    <div
      className={`transition-opacity duration-${duration} ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  )
}