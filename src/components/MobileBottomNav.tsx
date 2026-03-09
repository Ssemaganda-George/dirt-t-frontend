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

    if (user && profile?.role === 'tourist') {
      baseNavigation.splice(2, 0, { labelKey: 'bookings', href: '/bookings', icon: Calendar })
    }

    return baseNavigation
  }

  const navigation = getNavigation()
  const { t } = usePreferences()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_-1px_12px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-stretch h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navigation.map((item) => {
          const isActive = location.pathname === item.href && !item.isModal && !item.isSearch
          const isSearchActive = item.isSearch && location.pathname === '/'
          const active = isActive || isSearchActive

          const content = (
            <>
              {/* Active indicator bar */}
              <span className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full transition-all duration-200 ${
                active ? 'bg-emerald-600 opacity-100' : 'opacity-0'
              }`} />
              <item.icon className={`h-5 w-5 transition-colors duration-200 ${
                active ? 'text-emerald-600' : 'text-gray-400'
              }`} />
              <span className={`text-[10px] font-semibold mt-0.5 tracking-wide transition-colors duration-200 ${
                active ? 'text-emerald-600' : 'text-gray-400'
              }`}>
                {t(item.labelKey)}
              </span>
            </>
          )

          const baseClass = `relative flex flex-col items-center justify-center flex-1 pt-3 pb-2 gap-0.5 transition-colors duration-150 ${
            item.isModal || item.isSearch ? 'cursor-pointer' : ''
          }`

          if (item.isModal || item.isSearch) {
            return (
              <div
                key={item.labelKey}
                onClick={item.isModal ? onSupportClick : onSearchClick}
                className={baseClass}
              >
                {content}
              </div>
            )
          }

          return (
            <Link key={item.labelKey} to={item.href} className={baseClass}>
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
