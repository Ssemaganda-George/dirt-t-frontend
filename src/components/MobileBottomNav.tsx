import { Link, useLocation } from 'react-router-dom'
import { Home, HelpCircle, Search, Calendar, MessageSquare } from 'lucide-react'
import useUnreadMessages from '../hooks/useUnreadMessages'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'

interface MobileBottomNavProps {
  onSupportClick?: () => void
  onSearchClick?: () => void
}

export default function MobileBottomNav({ onSupportClick, onSearchClick }: MobileBottomNavProps) {
  const location = useLocation()
  const { user, profile } = useAuth()
  const { unreadCount } = useUnreadMessages()
  const { t } = usePreferences()

  const baseNavigation: Array<any> = [
    { labelKey: 'home', href: '/', icon: Home },
    { labelKey: 'find', href: '/search', icon: Search, isSearch: true },
  ]

  // Only show messages to authenticated users
  if (user) {
    baseNavigation.push({ labelKey: 'messages', href: '/messages', icon: MessageSquare })
  }

  // Bookings are no longer shown in bottom nav for tourists; only in menu

  baseNavigation.push({ labelKey: 'support', href: '/support', icon: HelpCircle, isModal: true })

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_-1px_12px_rgba(0,0,0,0.06)] md:hidden"
      role="navigation"
      aria-label="Main"
    >
      <div className="flex justify-around items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {baseNavigation.map((item) => {
          const label = t(item.labelKey)
          const active = location.pathname === item.href && !item.isModal

          const iconClass = active ? 'text-emerald-600' : 'text-gray-400'
          const textClass = active ? 'text-emerald-600' : 'text-gray-500'

          const baseClass = `relative flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[56px] transition-colors duration-150`

          const content = (
            <>
              <span
                className={`absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full transition-opacity duration-150 ${
                  active ? 'bg-emerald-600 opacity-100' : 'opacity-0'
                }`}
                aria-hidden
              />
              <span className="relative inline-flex">
                <item.icon className={`h-5 w-5 transition-colors duration-150 ${iconClass}`} aria-hidden />
                {item.labelKey === 'messages' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-500 rounded-full ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-semibold mt-0.5 tracking-wide transition-colors duration-150 ${textClass}`}>{label}</span>
            </>
          )

          if (item.isModal || item.isSearch) {
            const handler = item.isModal ? onSupportClick : onSearchClick
            return (
              <div
                key={item.labelKey}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-haspopup={item.isModal ? 'dialog' : undefined}
                onClick={handler}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handler && handler()
                }}
                className={baseClass}
              >
                {content}
              </div>
            )
          }

          return (
            <Link key={item.labelKey} to={item.href} aria-label={label} aria-current={active ? 'page' : undefined} className={baseClass}>
              {content}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
