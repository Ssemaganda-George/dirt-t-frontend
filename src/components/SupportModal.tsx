import { Link, useNavigate } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'
import { partners } from '../data/partners'

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
    name: 'Our Partners',
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

const conservationServices = [
  {
    name: 'Geotagging & Monitoring',
    href: '/conservation/geotagging'
  },
  {
    name: 'Tree Planting Initiatives',
    href: '/conservation/tree-planting'
  },
  {
    name: 'Calculate My Carbon',
    href: '/conservation/carbon'
  }
]

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 mt-10 sm:mt-16">
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
          {/* Conservation */}
          <div className="h-px bg-gray-300 mb-6"></div>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-black mb-4">Conservation</h3>
            <div className="space-y-2">
              {conservationServices.map((service) => (
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

          {/* Partners List */}
          <div>
            <h3 className="text-lg font-bold text-black mb-4">Our Partners</h3>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {partners.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 rounded-lg p-3 border border-gray-200 transition"
                >
                  <img src={partner.logo} alt={partner.name + ' logo'} className="h-10 w-10 object-contain rounded bg-white border border-gray-200" />
                  <span className="font-medium text-black flex-1 truncate">{partner.name}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              ))}
            </div>
            <button
              onClick={() => {
                onClose();
                window.location.href = '/partner';
              }}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-base transition-colors duration-200 shadow"
            >
              Partner with Us
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}