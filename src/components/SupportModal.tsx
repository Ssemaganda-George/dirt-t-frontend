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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white tracking-tight">Support & Business</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors duration-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-8">
          {/* Support Services */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-4">Support</h3>
            <div className="space-y-3">
              {supportServices.map((service) => (
                <Link
                  key={service.name}
                  to={service.href}
                  onClick={onClose}
                  className="flex items-center p-4 border border-slate-600 hover:border-blue-400 hover:bg-slate-700 transition-all duration-200 group"
                >
                  <div className="flex-shrink-0">
                    <service.icon className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <h3 className="font-medium text-white group-hover:text-blue-200 text-base leading-tight">
                      {service.name}
                    </h3>
                    <p className="text-xs text-slate-300 group-hover:text-blue-300 mt-1 leading-tight">
                      {service.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Business Services */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">For Businesses</h3>
            <div className="space-y-3">
              {businessServices.map((service) => (
                <Link
                  key={service.name}
                  to={service.href}
                  onClick={onClose}
                  className="flex items-center p-4 border border-slate-600 hover:border-green-400 hover:bg-slate-700 transition-all duration-200 group"
                >
                  <div className="flex-shrink-0">
                    <service.icon className="h-6 w-6 text-green-400 group-hover:text-green-300" />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <h3 className="font-medium text-white group-hover:text-green-200 text-base leading-tight">
                      {service.name}
                    </h3>
                    <p className="text-xs text-slate-300 group-hover:text-green-300 mt-1 leading-tight">
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