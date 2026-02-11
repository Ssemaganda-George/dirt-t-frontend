import React from 'react'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave'
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'wave'
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700'

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-shimmer'
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  )
}

interface PageSkeletonProps {
  type?: 'home' | 'service' | 'profile' | 'dashboard' | 'checkout' | 'payment' | 'generic'
}

export function PageSkeleton({ type = 'generic' }: PageSkeletonProps) {
  if (type === 'checkout') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start bg-gray-50 md:p-4 animate-fade-in">
        <div className="w-full md:max-w-6xl bg-white rounded-none md:rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ height: '100vh', maxHeight: 'none' } as React.CSSProperties}>
          {/* Progress header */}
          <div className="px-4 md:px-6 py-3 border-b flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-4 md:px-6 py-4 md:py-6">
              {/* Left: Buyer form */}
              <div className="md:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded border border-gray-200">
                  <Skeleton className="h-5 w-40 mb-4" />
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full rounded" />
                    <Skeleton className="h-10 w-full rounded" />
                    <Skeleton className="h-10 w-full rounded" />
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-20 rounded" />
                      <Skeleton className="h-10 flex-1 rounded" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
              {/* Right: Order summary */}
              <div className="md:col-span-2">
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded border border-gray-200">
                    <Skeleton className="h-5 w-28 mb-4" />
                    <div className="flex gap-3 mb-4">
                      <Skeleton className="h-16 w-16 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <div className="border-t pt-3 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'payment') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 animate-fade-in">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <Skeleton className="h-9 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-72 mx-auto" />
          </div>
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            {/* Progress steps */}
            <div className="px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="w-12 h-px" />
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="w-12 h-px" />
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
            {/* Order summary block */}
            <div className="px-6 py-6 border-b">
              <Skeleton className="h-6 w-28 mb-4" />
              <div className="bg-white rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="border-t pt-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
            {/* Payment methods */}
            <div className="px-6 py-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-4">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex gap-2">
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
          </div>
          <div className="text-center">
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'home') {
    return (
      <div className="space-y-6 p-4">
        {/* Hero section skeleton */}
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />

        {/* Search bar skeleton */}
        <div className="h-12 bg-gray-200 rounded-full animate-pulse" />

        {/* Categories skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Services skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'service') {
    return (
      <div className="space-y-6 p-4">
        {/* Image gallery skeleton */}
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />

        {/* Title and price skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Booking section skeleton */}
        <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (type === 'dashboard') {
    return (
      <div className="space-y-6 p-4">
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Generic skeleton
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}