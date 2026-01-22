import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface PageTransitionProps {
  children: React.ReactNode;
  delay?: number; // Artificial delay in milliseconds
  showSpinner?: boolean;
}

export function PageTransition({ children, delay = 800, showSpinner = true }: PageTransitionProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (isLoading && showSpinner) {
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
    <div className={`fade-in-slow`}>
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

// Hook for managing page transitions
export function usePageTransition(delay = 800) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), delay);
  };

  return { isTransitioning, startTransition };
}