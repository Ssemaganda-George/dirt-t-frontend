import { Link, useLocation } from 'react-router-dom'
import { Home, Briefcase, Plane, User } from 'lucide-react'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Services', href: '/services', icon: Briefcase },
  { name: 'Flights', href: '/flights', icon: Plane },
  { name: 'Profile', href: '/profile', icon: User },
]

export default function MobileBottomNav() {
  const location = useLocation()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <item.icon
                className={`h-6 w-6 mb-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              />
              <span className={`text-xs font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
