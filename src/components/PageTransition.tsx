import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { PageSkeleton } from './SkeletonLoader';

interface PageTransitionProps {
  children: React.ReactNode;
  delay?: number; // Artificial delay in milliseconds
  showSpinner?: boolean;
  skeletonType?: 'home' | 'service' | 'profile' | 'dashboard' | 'generic';
}

export function PageTransition({
  children,
  delay = 300,
  showSpinner = false,
  skeletonType = 'generic'
}: PageTransitionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Small delay before showing content for smooth transition
      setTimeout(() => setShowContent(true), 50);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (isLoading) {
    if (showSpinner) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center animate-fade-in">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-gray-600 animate-pulse">Loading...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-fade-in">
        <PageSkeleton type={skeletonType} />
      </div>
    );
  }

  return (
    <div className={`transition-all duration-500 ease-out ${
      showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`}>
      {children}
    </div>
  );
}

