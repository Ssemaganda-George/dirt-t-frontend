import { Link, useLocation } from 'react-router-dom'
import { Home, HelpCircle, Search, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'

interface MobileBottomNavProps {
  onSupportClick?: () => void
  onSearchClick?: () => void
}

export default function MobileBottomNav({ onSupportClick, onSearchClick }: MobileBottomNavProps) {
  const location = useLocation()
  const { user, profile } = useAuth()

  const getNavigation = () => {
    const baseNavigation = [
      { labelKey: 'home', href: '/', icon: Home },
      { labelKey: 'find', href: '/', icon: Search, isSearch: true },
      { labelKey: 'support', href: '/support', icon: HelpCircle, isModal: true },
    ]

    // Add bookings for logged-in tourists
    if (user && profile?.role === 'tourist') {
      baseNavigation.splice(2, 0, { labelKey: 'bookings', href: '/bookings', icon: Calendar })
    }

    return baseNavigation
  }

  const navigation = getNavigation()
  const { t } = usePreferences()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href && !item.isModal && !item.isSearch
          const isSearchActive = item.isSearch && location.pathname === '/'
          return (
            <div
              key={item.labelKey}
              onClick={item.isModal ? onSupportClick : item.isSearch ? onSearchClick : undefined}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors ${
                item.isModal || item.isSearch ? 'cursor-pointer' : ''
              } ${
                isActive || isSearchActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {item.isModal || item.isSearch ? (
                <div className="flex flex-col items-center">
                  <item.icon className={`h-5 w-5 mb-1 ${
                    isActive || isSearchActive ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                  <span className={`text-xs font-medium ${
                    isActive || isSearchActive ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {t(item.labelKey)}
                  </span>
                </div>
              ) : (
                <Link
                  to={item.href}
                  className={`flex flex-col items-center ${
                    isActive || isSearchActive ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <item.icon
                    className={`h-5 w-5 mb-1 ${
                      isActive || isSearchActive ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  />
                  <span className={`text-xs font-medium ${
                    isActive || isSearchActive ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {t(item.labelKey)}
                  </span>
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
