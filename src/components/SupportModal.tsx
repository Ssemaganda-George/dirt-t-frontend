import { Link } from 'react-router-dom'
import { X, HelpCircle, MessageCircle, Shield, FileText, ShoppingBag, User, Handshake } from 'lucide-react'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

const supportServices = [
  {
    name: 'Help Center',
    href: '/help',
    icon: HelpCircle,
    description: 'Find answers to common questions'
  },
  {
    name: 'Contact Us',
    href: '/contact',
    icon: MessageCircle,
    description: 'Get in touch with our support team'
  },
  {
    name: 'Safety',
    href: '/safety',
    icon: Shield,
    description: 'Travel safely with our guidelines'
  },
  {
    name: 'Terms of Service',
    href: '/terms',
    icon: FileText,
    description: 'Read our terms and conditions'
  }
]

const businessServices = [
  {
    name: 'List Your Business',
    href: '/vendor-signup',
    icon: ShoppingBag,
    description: 'Join our platform as a service provider'
  },
  {
    name: 'Vendor Portal',
    href: '/vendor-login',
    icon: User,
    description: 'Access your vendor dashboard'
  },
  {
    name: 'Partner with Us',
    href: '/partner',
    icon: Handshake,
    description: 'Explore partnership opportunities'
  }
]

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pb-16 md:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md sm:w-full max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col mx-4 mb-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Support & Business</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            aria-label="Close modal"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Support Services */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Support</h3>
            <div className="space-y-3 sm:space-y-4">
              {supportServices.map((service) => (
                <Link
                  key={service.name}
                  to={service.href}
                  onClick={onClose}
                  className="flex items-center p-4 sm:p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100 transition-all group touch-manipulation"
                >
                  <div className="flex-shrink-0">
                    <service.icon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 group-hover:text-blue-700" />
                  </div>
                  <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 text-sm sm:text-base leading-tight">
                      {service.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 group-hover:text-blue-600 mt-0.5 leading-tight">
                      {service.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Business Services */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">For Businesses</h3>
            <div className="space-y-3 sm:space-y-4">
              {businessServices.map((service) => (
                <Link
                  key={service.name}
                  to={service.href}
                  onClick={onClose}
                  className="flex items-center p-4 sm:p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 active:bg-green-100 transition-all group touch-manipulation"
                >
                  <div className="flex-shrink-0">
                    <service.icon className="h-7 w-7 sm:h-8 sm:w-8 text-green-600 group-hover:text-green-700" />
                  </div>
                  <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-700 text-sm sm:text-base leading-tight">
                      {service.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 group-hover:text-green-600 mt-0.5 leading-tight">
                      {service.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}