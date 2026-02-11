import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useVisitorTracking } from '../hooks/useVisitorTracking'
import { supabase } from '../lib/supabaseClient'

/**
 * Component to track app visits and page navigation
 * Should be placed at the root level of the app
 */
export function AppVisitorTracker() {
  const location = useLocation()
  const { visitorSession } = useVisitorTracking()

  // Log page visits to app_visits table
  useEffect(() => {
    const trackAppVisit = async () => {
      if (!visitorSession) return

      try {
        // Get visitor's IP address
        const ipResponse = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipResponse.json()
        const ipAddress = ipData.ip

        // Skip geolocation to avoid CORS issues
        let country: string | undefined
        let city: string | undefined
        // Geolocation disabled due to CORS policy

        // Log the visit to app_visits table
        const { error } = await supabase
          .from('app_visits')
          .insert({
            visitor_session_id: visitorSession.id,
            page_path: location.pathname,
            page_name: getPageName(location.pathname),
            referrer: document.referrer || null,
            ip_address: ipAddress,
            country,
            city,
            user_agent: navigator.userAgent,
          })

        if (error) {
          console.error('Error logging app visit:', error)
        }
      } catch (err) {
        console.error('Error tracking app visit:', err)
        // Don't throw - this is just analytics
      }
    }

    trackAppVisit()
  }, [location.pathname, visitorSession])

  return null // This component doesn't render anything
}

/**
 * Get a human-readable page name from a path
 */
function getPageName(pathname: string): string {
  const path = pathname.split('/').filter(Boolean)[0] || 'home'
  const pageNames: Record<string, string> = {
    '': 'Home',
    'home': 'Home',
    'services': 'Services',
    'service': 'Service Detail',
    'booking': 'Booking',
    'profile': 'Profile',
    'login': 'Login',
    'vendor': 'Vendor Dashboard',
    'admin': 'Admin Dashboard',
    'checkout': 'Checkout',
    'payment': 'Payment',
    'bookings': 'My Bookings',
    'saved': 'Saved Services',
    'settings': 'Settings',
    'help': 'Help Center',
    'contact': 'Contact Us',
  }

  return pageNames[path] || path.charAt(0).toUpperCase() + path.slice(1)
}
