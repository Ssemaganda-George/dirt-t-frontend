import { Link } from 'react-router-dom'
import { X } from 'lucide-react'

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

const supportServices = [
  {
    name: 'Help Center',
    href: '/help'
  },
  {
    name: 'Contact Us',
    href: '/contact'
  },
  {
    name: 'Safety',
    href: '/safety'
  },
  {
    name: 'Terms of Service',
    href: '/terms'
  },
  {
    name: 'Travel Insurance',
    href: '/travel-insurance'
  },
  {
    name: 'Visa Processing',
    href: '/visa-processing'
  },
  {
    name: 'Internet & Connectivity',
    href: '/internet-connectivity'
  }
]

const businessServices = [
  {
    name: 'List Your Business',
    href: '/vendor-login'
  },
  {
    name: 'Partner with Us',
    href: '/partner'
  },
  {
    name: 'Refer a Business',
    href: '/refer-business'
  },
  {
    name: 'Join a Hospitality Class',
    href: '/hospitality-class'
  }
]

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-black tracking-tight">Support & Business</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500 hover:text-black" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-8">
          {/* Support Services */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-black mb-4">Support</h3>
            <div className="space-y-2">
              {supportServices.map((service) => (
                <Link
                  key={service.name}
                  to={service.href}
                  onClick={onClose}
                  className="block py-2 text-base font-medium text-black hover:text-blue-600 transition-colors duration-200"
                >
                  {service.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-300 mb-6"></div>

          {/* Business Services */}
          <div>
            <h3 className="text-lg font-bold text-black mb-4">Business</h3>
            <div className="space-y-2">
              {businessServices.map((service) => (
                <Link
                  key={service.name}
                  to={service.href}
                  onClick={onClose}
                  className="block py-2 text-base font-medium text-black hover:text-green-600 transition-colors duration-200"
                >
                  {service.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}