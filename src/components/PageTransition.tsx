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

// Enhanced page transition with slide effects
export function SlidePageTransition({ children, direction = 'right', delay = 600 }: {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const directionClasses = {
    left: isVisible ? 'translate-x-0' : 'translate-x-full',
    right: isVisible ? 'translate-x-0' : '-translate-x-full',
    up: isVisible ? 'translate-y-0' : 'translate-y-full',
    down: isVisible ? 'translate-y-0' : '-translate-y-full'
  };

  return (
    <div className={`transition-transform duration-500 ease-out ${directionClasses[direction]}`}>
      {children}
    </div>
  );
}

// Smooth route transition component
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`transition-all duration-300 ease-out ${
      isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
    }`}>
      {children}
    </div>
  );
}

// Hook for managing page transitions
export function usePageTransition(delay = 800) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), delay);
  };

  return { isTransitioning, startTransition };
}

// Navigation transition component for smooth link transitions
export function NavigationTransition({
  children,
  onClick,
  className = ''
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      setIsTransitioning(true);
      setTimeout(() => {
        onClick();
        setIsTransitioning(false);
      }, 150);
    }
  };

  return (
    <div
      className={`smooth-transition hover-lift ${className} ${
        isTransitioning ? 'opacity-70 scale-95' : ''
      }`}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}